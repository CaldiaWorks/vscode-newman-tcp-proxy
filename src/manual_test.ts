import * as net from 'net';
import { TcpProxyServer } from './proxy/TcpProxyServer';
import { ProxyEvent } from './proxy/ProxyInterface';

// Mock Logger
const logger = {
    log: (event: ProxyEvent) => {
        const dataStr = event.data ? (Buffer.isBuffer(event.data) ? event.data.toString() : event.data) : '';
        console.log(`[Event] ${event.type} (${event.source}): ${event.info || ''} ${dataStr}`);
    }
};

async function runTest() {
    // 1. Start Echo Server (Target)
    const targetPort = 9000;
    const echoServer = net.createServer((socket) => {
        socket.write('Connected to Echo Server\n');
        socket.pipe(socket); // Echo back
        socket.on('close', () => console.log('Echo Server: Client closed'));
    });
    
    await new Promise<void>(resolve => echoServer.listen(targetPort, () => {
        console.log(`Echo Server listening on ${targetPort}`);
        resolve();
    }));

    // 2. Start Proxy Server
    const proxyPort = 9001;
    const proxy = new TcpProxyServer(logger);
    await proxy.start(proxyPort, '127.0.0.1', targetPort);
    
    // 3. Client Connection (Automated)
    const client = new net.Socket();
    client.connect(proxyPort, '127.0.0.1', () => {
        console.log('Test Client connected to Proxy');
        client.write('Hello via Proxy');
    });

    client.on('data', (data) => {
        console.log('Test Client received:', data.toString());
        // Simple assertion logic
        if (data.toString().includes('Hello via Proxy')) {
            console.log('SUCCESS: Echo received!');
            client.end();
            proxy.stop().then(() => {
                echoServer.close(() => {
                    console.log('Test Finished.');
                    process.exit(0);
                });
            });
        }
    });

    client.on('error', (err) => {
        console.error('Test Client Error:', err);
        process.exit(1);
    });
}

runTest().catch(console.error);
