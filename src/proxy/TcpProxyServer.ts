import * as net from 'net';
import { EventEmitter } from 'events';
import { IProxyLogger, ProxyEvent } from './ProxyInterface';
import * as crypto from 'crypto';

export class TcpProxyServer extends EventEmitter {
    private server: net.Server | null = null;
    private targetSocket: net.Socket | null = null;
    private connections: Set<net.Socket> = new Set();
    private logger: IProxyLogger | null = null;
    private targetConnectionId: string | null = null;

    constructor(logger?: IProxyLogger) {
        super();
        this.logger = logger || null;
    }

    public get isRunning(): boolean {
        return this.server !== null;
    }

    public start(localPort: number, targetHost: string, targetPort: number): Promise<void> {
        return new Promise((resolve, reject) => {
            // 1. Connect to Target Server first
            this.targetSocket = new net.Socket();
            this.targetConnectionId = crypto.randomUUID();

            const onTargetConnect = () => {
                this.emitProxyEvent({
                    id: this.targetConnectionId!,
                    timestamp: Date.now(),
                    type: 'connection',
                    source: 'target',
                    info: `Connected to target: ${targetHost}:${targetPort}`
                });

                // 2. Start Local Proxy Server after target connection is established
                this.startLocalServer(localPort, targetHost, targetPort)
                    .then(resolve)
                    .catch((err) => {
                        this.stop().then(() => reject(err));
                    });
            };

            const onTargetError = (err: Error) => {
                this.emitProxyEvent({
                    id: this.targetConnectionId || 'unknown',
                    timestamp: Date.now(),
                    type: 'error',
                    source: 'target',
                    info: `Target connection error: ${err.message}`
                });
                // If error happens during start, reject
                if (!this.server) {
                    reject(err);
                } else {
                    // If error happens during operation, close everything
                    this.stop(); 
                }
            };

            const onTargetClose = () => {
                this.emitProxyEvent({
                    id: this.targetConnectionId || 'unknown',
                    timestamp: Date.now(),
                    type: 'close',
                    source: 'target',
                    info: 'Target connection closed'
                });
                this.targetSocket = null;
                // If target closes, we must stop the proxy
                this.stop();
            };

            // Data handling for Target
            this.targetSocket.on('data', (data) => {
                this.emitProxyEvent({
                    id: this.targetConnectionId!,
                    timestamp: Date.now(),
                    type: 'data',
                    source: 'target',
                    data: data
                });
                // Broadcast to all connected clients
                for (const client of this.connections) {
                    if (!client.destroyed) {
                        client.write(data as Uint8Array);
                    }
                }
            });

            this.targetSocket.on('connect', onTargetConnect);
            this.targetSocket.on('error', onTargetError);
            this.targetSocket.on('close', onTargetClose);

            this.targetSocket.connect(targetPort, targetHost);
        });
    }

    private startLocalServer(localPort: number, targetHost: string, targetPort: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((clientSocket) => {
                this.handleClientConnection(clientSocket);
            });

            this.server.on('error', (err) => {
                console.error('Proxy Server Error:', err);
                this.emitProxyEvent({
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    type: 'error',
                    source: 'client', 
                    info: `Proxy server error: ${err.message}`
                });
                reject(err);
            });

            this.server.listen(localPort, '0.0.0.0', () => {
                console.log(`TCP Proxy listening on port ${localPort}, forwarding to ${targetHost}:${targetPort} (Persistent)`);
                resolve();
            });
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Stop target connection
            if (this.targetSocket) {
                this.targetSocket.destroy();
                this.targetSocket = null;
            }

            // Close all active client connections
            for (const socket of this.connections) {
                socket.destroy();
            }
            this.connections.clear();

            if (!this.server) {
                resolve();
                return;
            }

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

    private handleClientConnection(clientSocket: net.Socket) {
        if (!this.targetSocket || this.targetSocket.destroyed) {
            clientSocket.end(); // No target to forward to
            return;
        }

        const connectionId = crypto.randomUUID(); // Connection ID for this specific client session
        this.connections.add(clientSocket);

        this.emitProxyEvent({
            id: connectionId,
            timestamp: Date.now(),
            type: 'connection',
            source: 'client',
            info: `Client connected: ${clientSocket.remoteAddress}:${clientSocket.remotePort}`
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
            
            if (this.targetSocket && !this.targetSocket.destroyed) {
                this.targetSocket.write(data as Uint8Array);
            }
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
            // Just close this client, don't stop the proxy or target
            clientSocket.destroy();
        });

        // Close handling
        clientSocket.on('close', () => {
            this.connections.delete(clientSocket);
            this.emitProxyEvent({
                id: connectionId,
                timestamp: Date.now(),
                type: 'close',
                source: 'client',
                info: 'Client connection closed'
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
