import * as net from 'net';
import { TcpProxyServer } from './proxy/TcpProxyServer';
import { ProxyEvent } from './proxy/ProxyInterface';

// Mock Logger
const logger = {
    log: (event: ProxyEvent) => {
        const dataStr = event.data ? (Buffer.isBuffer(event.data) ? event.data.toString().trim() : event.data) : '';
        console.log(`[Event] ${event.type} (${event.source}): ${event.info || ''} ${dataStr}`);
    }
};

async function runTest() {
    console.log('--- Starting Manual Test with Persistent Connection ---');

    // 1. Start Echo Server (Target)
    const targetPort = 9002;
    const echoServer = net.createServer((socket) => {
        console.log('Echo Server: Incoming connection');
        socket.write('Echo Server: Connected\n');
        socket.pipe(socket); // Echo back
        socket.on('close', () => console.log('Echo Server: Client closed'));
    });
    
    await new Promise<void>(resolve => echoServer.listen(targetPort, () => {
        console.log(`Echo Server listening on ${targetPort}`);
        resolve();
    }));

    // 2. Start Proxy Server
    // This should immediately trigger a connection to Echo Server
    const proxyPort = 9003;
    const proxy = new TcpProxyServer(logger);
    
    console.log('Starting Proxy...');
    try {
        await proxy.start(proxyPort, '127.0.0.1', targetPort);
        console.log('Proxy started successfully (Target connection established).');
    } catch (err) {
        console.error('Failed to start proxy:', err);
        process.exit(1);
    }
    
    // 3. Client Connection (Automated)
    console.log('Connecting Test Client to Proxy...');
    const client = new net.Socket();
    client.connect(proxyPort, '127.0.0.1', () => {
        console.log('Test Client connected to Proxy');
        client.write('Hello via Persistent Proxy');
    });

    client.on('data', (data) => {
        const received = data.toString();
        console.log('Test Client received:', received.trim());
        
        // Assertion logic
        // We expect "Echo Server: Connected" (from initial connection) or echo of our message
        if (received.includes('Hello via Persistent Proxy')) {
            console.log('SUCCESS: Echo received!');
            
            // Cleanup
            client.end();
            setTimeout(() => {
                proxy.stop().then(() => {
                    echoServer.close(() => {
                        console.log('Test Finished Successfully.');
                        process.exit(0);
                    });
                });
            }, 500);
        }
    });

    client.on('error', (err) => {
        console.error('Test Client Error:', err);
        process.exit(1);
    });

    // Timeout safety
    setTimeout(() => {
        console.error('Test Timeout!');
        process.exit(1);
    }, 5000);
}

runTest().catch(console.error);
