import { ProxyEvent } from '../proxy/ProxyInterface';

// Frontend -> Backend
export type WebviewCommand = 
    | { command: 'startProxy'; localPort: number; targetHost: string; targetPort: number; }
    | { command: 'stopProxy'; }
    | { command: 'clearLogs'; }
    | { command: 'selectCollection'; }
    | { command: 'runNewman'; collectionPath: string; }
    | { command: 'webviewReady'; };

// Backend -> Frontend
export type ExtensionMessage = 
    | { type: 'proxyStatus'; status: 'running' | 'stopped'; config?: { localPort: number; targetHost: string; targetPort: number; }; }
    | { type: 'proxyEvent'; event: ProxyEvent; }
    | { type: 'batchProxyEvents'; events: ProxyEvent[]; }
    | { type: 'error'; message: string; }
    | { type: 'collectionSelected'; path: string; }
    | { type: 'newmanResult'; output: string; success: boolean; };
