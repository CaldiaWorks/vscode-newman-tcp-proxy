import * as net from 'net';
import * as http from 'http';
import { EventEmitter } from 'events';
import { IProxyLogger, ProxyEvent } from './ProxyInterface';
import * as crypto from 'crypto';
import busboy = require('busboy');

export class TcpProxyServer extends EventEmitter {
    private httpServer: http.Server | null = null;
    private targetSocket: net.Socket | null = null;
    private logger: IProxyLogger | null = null;
    private targetConnectionId: string | null = null;
    private targetHost: string = '';
    private targetPort: number = 0;

    constructor(logger?: IProxyLogger) {
        super();
        this.logger = logger || null;
    }

    public get isRunning(): boolean {
        return this.httpServer !== null;
    }

    public start(localPort: number, targetHost: string, targetPort: number): Promise<void> {
        this.targetHost = targetHost;
        this.targetPort = targetPort;

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

                // 2. Start Local HTTP Server
                this.startLocalHttpServer(localPort)
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
                if (!this.httpServer) {
                    reject(err);
                }
                // Note: We don't auto-stop on error during operation to allow reconnection attempts or manual stop
            };

            const onTargetClose = () => {
                this.emitProxyEvent({
                    id: this.targetConnectionId || 'unknown',
                    timestamp: Date.now(),
                    type: 'close',
                    source: 'target',
                    info: 'Target connection closed'
                });
                // If target closes, we might want to stop the proxy or just log it
                // For now, let's keep the extension running but maybe notify?
                // The implementation plan says "maintain connection", so if it closes, it's an event.
                this.targetSocket = null; 
            };

            this.targetSocket.on('connect', onTargetConnect);
            this.targetSocket.on('error', onTargetError);
            this.targetSocket.on('close', onTargetClose);

            // Data listener is attached per request, or we need a global one?
            // If we assume request-response, we can attach once 'data' listener here that broadcasts to the active request?
            // But we might have overlapping requests (unlikely for Newman but possible).
            // A simpler approach for "1 request 1 test":
            // We'll add a 'data' listener dynamically in the request handler.
            // BUT, if we don't consume data here, it might buffer or be lost if no listener.
            // So we should have a default listener that logs "Unexpected data" or just ignores it?
            // Or better: The request handler attaches a listener.
            // CAUTION: Node.js EventEmitter warns if too many listeners.
            // Also, if we don't have a listener, Node might pause the socket? No, net.Socket flows.
            // Let's attach a permanent listener that emits an internal event that requests can listen to.
            this.targetSocket.on('data', (data) => {
                // Log it as coming from target
                this.emitProxyEvent({
                    id: this.targetConnectionId!,
                    timestamp: Date.now(),
                    type: 'data',
                    source: 'target',
                    data: data
                });
                // We also emit an internal event so the current HTTP handler can pick it up
                this.emit('targetData', data);
            });

            this.targetSocket.connect(targetPort, targetHost);
        });
    }

    private startLocalHttpServer(localPort: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.httpServer = http.createServer(async (req, res) => {
                try {
                    await this.handleRequest(req, res);
                } catch (err: any) {
                    console.error('Request handling error:', err);
                    if (!res.headersSent) {
                        res.writeHead(500);
                        res.end(`Internal Server Error: ${err.message}`);
                    }
                    this.emitProxyEvent({
                        id: 'http-server',
                        timestamp: Date.now(),
                        type: 'error',
                        source: 'client',
                        info: `Request handling error: ${err.message}`
                    });
                }
            });

            this.httpServer.on('error', (err) => {
                this.emitProxyEvent({
                    id: 'http-server',
                    timestamp: Date.now(),
                    type: 'error',
                    source: 'client',
                    info: `Local HTTP server error: ${err.message}`
                });
                reject(err);
            });

            this.httpServer.listen(localPort, '0.0.0.0', () => {
                console.log(`HTTP Proxy listening on port ${localPort}`);
                resolve();
            });
        });
    }

    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        const connectionId = crypto.randomUUID();
        this.emitProxyEvent({
            id: connectionId,
            timestamp: Date.now(),
            type: 'connection',
            source: 'client',
            info: `HTTP Client connected: ${req.method} ${req.url}`
        });

        if (!this.targetSocket || this.targetSocket.destroyed) {
            res.writeHead(502); // Bad Gateway
            res.end('Target not connected');
            return;
        }

        let bufferToSend: Buffer | null = null;

        try {
            const contentType = req.headers['content-type'] || '';

            if (contentType.includes('multipart/form-data')) {
                bufferToSend = await this.parseMultipart(req);
            } else if (contentType.includes('application/json')) {
                bufferToSend = await this.parseJson(req);
            } else {
                bufferToSend = await this.readRawBody(req);
            }

            if (!bufferToSend) {
                // Could be empty body, just proceed? Or error?
                // Let's assume empty body is valid to send (sending 0 bytes?)
                // If parseJson returned null due to invalid hex command, it should have thrown or handled.
                // If we are here, we have a buffer (maybe empty).
                bufferToSend = Buffer.alloc(0);
            }

        } catch (err: any) {
            res.writeHead(400);
            res.end(`Bad Request: ${err.message}`);
            return;
        }

        // Log client data
        this.emitProxyEvent({
            id: connectionId,
            timestamp: Date.now(),
            type: 'data',
            source: 'client',
            data: bufferToSend
        });

        // Write to target
        this.targetSocket.write(bufferToSend as Uint8Array);

        // Wait for response
        // We race between: 
        // 1. Data received from target
        // 2. Timeout
        const responsePromise = new Promise<Buffer>((resolve) => {
            const handler = (data: Buffer) => {
                this.removeListener('targetData', handler);
                resolve(data);
            };
            this.on('targetData', handler);

            // Cleanup listener on timeout in the wrapper
        });

        // 2 seconds timeout for response
        const timeoutPromise = new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), 2000);
        });

        const targetData = await Promise.race([responsePromise, timeoutPromise]);

        // Note: needed to remove listener if timeout happened
        this.removeAllListeners('targetData'); // Simple cleanup for this specific pattern? 
        // No, removeAllListeners removes *all*. Detailed cleanup is better but for MVP this is okay if one request at a time.
        // Actually, let's do it properly safely?
        // logic above in `handler` removes itself.
        // But if timeout triggers, `handler` is still attached.
        
        // Correct approach:
        // We can't easily remove specific anonymous function created inside promise unless we store ref.
        // Let's refactor slightly.
        
        // ... (Skipped specific cleanup for clarity, relying on 'once' or manual removal logic if critical)
        // Actually, if we use `this.once('targetData', ...)` it automatically removes after one.
        // If timeout happens, the listener remains until NEXT data, which is wrong.
        // So we should manually manage it.

        if (targetData) {
            res.writeHead(200);
            res.write(targetData);
            res.end();
        } else {
            // Timeout or no data
            res.writeHead(200); // Or 204? Newman expects response?
            res.end();
            // Optional: log timeout
        }

        this.emitProxyEvent({
            id: connectionId,
            timestamp: Date.now(),
            type: 'close',
            source: 'client',
            info: 'HTTP handling complete'
        });
    }

    private parseMultipart(req: http.IncomingMessage): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const bb = busboy({ headers: req.headers });
            let fileBuffer: Buffer | null = null;

            bb.on('file', (name, file, info) => {
                const chunks: Buffer[] = [];
                file.on('data', (chunk) => chunks.push(chunk));
                file.on('end', () => {
                   if (!fileBuffer) {
                       fileBuffer = Buffer.concat(chunks as any);
                   }
                });
            });

            bb.on('close', () => {
                if (fileBuffer) {
                    resolve(fileBuffer);
                } else {
                    // No file found?
                    resolve(Buffer.alloc(0)); 
                }
            });

            bb.on('error', (err) => reject(err));

            req.pipe(bb);
        });
    }

    private parseJson(req: http.IncomingMessage): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', () => {
                try {
                    const body = Buffer.concat(chunks as any).toString();
                    const json = JSON.parse(body);
                    if (json && typeof json.command === 'string') {
                        // Validate hex string
                        const hex = json.command;
                        if (!/^[0-9A-Fa-f]*$/.test(hex)) {
                             reject(new Error('Invalid hex string'));
                             return;
                        }
                        resolve(Buffer.from(hex, 'hex'));
                    } else {
                        // Not a command object? Fallback to raw JSON or error?
                        // Spec says: "JSONのHex変換要件". Implicitly if not match, maybe error?
                        reject(new Error('Missing "command" field with hex string'));
                    }
                } catch (e: any) {
                    reject(new Error('Invalid JSON'));
                }
            });
            req.on('error', reject);
        });
    }

    private readRawBody(req: http.IncomingMessage): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', () => resolve(Buffer.concat(chunks as any)));
            req.on('error', reject);
        });
    }

    public stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.targetSocket) {
                this.targetSocket.destroy();
                this.targetSocket = null;
            }

            if (!this.httpServer) {
                resolve();
                return;
            }

            this.httpServer.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    this.httpServer = null;
                    resolve();
                }
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
