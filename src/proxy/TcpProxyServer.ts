import * as net from 'net';
import { EventEmitter } from 'events';
import { IProxyLogger, ProxyEvent } from './ProxyInterface';
import * as crypto from 'crypto';

export class TcpProxyServer extends EventEmitter {
    private server: net.Server | null = null;
    private connections: Set<net.Socket> = new Set();
    private logger: IProxyLogger | null = null;

    constructor(logger?: IProxyLogger) {
        super();
        this.logger = logger || null;
    }

    public start(localPort: number, targetHost: string, targetPort: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((clientSocket) => {
                this.handleConnection(clientSocket, targetHost, targetPort);
            });

            this.server.on('error', (err) => {
                console.error('Proxy Server Error:', err);
                this.emitProxyEvent({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'error',
                    source: 'client', // Server generic error
                    info: err.message
                });
                reject(err);
            });

            this.server.listen(localPort, () => {
                console.log(`TCP Proxy listening on port ${localPort}, forwarding to ${targetHost}:${targetPort}`);
                resolve();
            });
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.server) {
                resolve();
                return;
            }

            // Close all active connections
            for (const socket of this.connections) {
                socket.destroy();
            }
            this.connections.clear();

            this.server.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    this.server = null;
                    resolve();
                }
            });
        });
    }

    private handleConnection(clientSocket: net.Socket, targetHost: string, targetPort: number) {
        const connectionId = crypto.randomUUID();
        this.connections.add(clientSocket);

        this.emitProxyEvent({
            id: connectionId,
            timestamp: Date.now(),
            type: 'connection',
            source: 'client',
            info: `Client connected: ${clientSocket.remoteAddress}:${clientSocket.remotePort}`
        });

        const targetSocket = new net.Socket();
        this.connections.add(targetSocket);

        targetSocket.connect(targetPort, targetHost, () => {
            this.emitProxyEvent({
                id: connectionId,
                timestamp: Date.now(),
                type: 'connection',
                source: 'target',
                info: `Connected to target: ${targetHost}:${targetPort}`
            });
        });

        // Data from Client -> Target
        clientSocket.on('data', (data) => {
            this.emitProxyEvent({
                id: connectionId,
                timestamp: Date.now(),
                type: 'data',
                source: 'client',
                data: data
            });
            targetSocket.write(data as Uint8Array);
        });

        // Data from Target -> Client
        targetSocket.on('data', (data) => {
            this.emitProxyEvent({
                id: connectionId,
                timestamp: Date.now(),
                type: 'data',
                source: 'target',
                data: data
            });
            clientSocket.write(data as Uint8Array);
        });

        // Error handling
        clientSocket.on('error', (err) => {
            this.emitProxyEvent({
                id: connectionId,
                timestamp: Date.now(),
                type: 'error',
                source: 'client',
                info: err.message
            });
            targetSocket.end();
        });

        targetSocket.on('error', (err) => {
            this.emitProxyEvent({
                id: connectionId,
                timestamp: Date.now(),
                type: 'error',
                source: 'target',
                info: err.message
            });
            clientSocket.end();
        });

        // Close handling
        clientSocket.on('close', () => {
            this.connections.delete(clientSocket);
            targetSocket.end();
            this.emitProxyEvent({
                id: connectionId,
                timestamp: Date.now(),
                type: 'close',
                source: 'client',
                info: 'Client connection closed'
            });
        });

        targetSocket.on('close', () => {
            this.connections.delete(targetSocket);
            clientSocket.end();
            this.emitProxyEvent({
                id: connectionId,
                timestamp: Date.now(),
                type: 'close',
                source: 'target',
                info: 'Target connection closed'
            });
        });
    }

    private emitProxyEvent(event: ProxyEvent) {
        this.emit('event', event);
        if (this.logger) {
            this.logger.log(event);
        }
    }
}
