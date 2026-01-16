/// <reference path="../types.d.ts" />
import * as React from 'react';
import { provideVSCodeDesignSystem, vsCodeButton, vsCodeTag, vsCodePanelTab, vsCodePanelView, vsCodePanels, vsCodeTextField, vsCodeDivider } from '@vscode/webview-ui-toolkit';
import ProxyControl from './ProxyControl';
import TrafficLog from './TrafficLog';
import NewmanControl from './NewmanControl';
import BinarySender from './BinarySender';
import { WebviewCommand, ExtensionMessage } from '../../shared/MessageTypes';
import { ProxyEvent } from '../../proxy/ProxyInterface';

// Register VS Code UI Toolkit components
provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTag(), vsCodePanelTab(), vsCodePanelView(), vsCodePanels(), vsCodeTextField(), vsCodeDivider());

const vscode = acquireVsCodeApi();

const App: React.FC = () => {
    const [status, setStatus] = React.useState<'running' | 'stopped'>('stopped');
    const [proxyConfig, setProxyConfig] = React.useState<{ localPort: number; targetHost: string; targetPort: number; } | undefined>(undefined);
    const [events, setEvents] = React.useState<ProxyEvent[]>([]);
    
    // Newman State
    const [collectionPath, setCollectionPath] = React.useState('');
    const [isNewmanRunning, setIsNewmanRunning] = React.useState(false);
    const [newmanOutput, setNewmanOutput] = React.useState('');

    React.useEffect(() => {
        // Handle messages from Extension Host
        const handleMessage = (event: MessageEvent) => {
            const message = event.data as ExtensionMessage;
            switch (message.type) {
                case 'proxyStatus':
                    setStatus(message.status);
                    if (message.config) {
                        setProxyConfig(message.config);
                        if (message.config.hexString !== undefined) {
                            setInitialHex(message.config.hexString);
                        }
                    }
                    break;
                case 'proxyEvent':
                    setEvents(prev => [...prev, message.event]);
                    break;
                case 'batchProxyEvents':
                    setEvents(message.events);
                    break;
                case 'collectionSelected':
                    setCollectionPath(message.path);
                    break;
                case 'newmanResult':
                    setIsNewmanRunning(false);
                    setNewmanOutput(message.output);
                    
                    // Add a special event to the traffic log for visibility
                    setEvents(prev => [...prev, {
                        id: 'newman-result',
                        timestamp: Date.now(),
                        type: 'info' as any, // Using 'info' or map to 'data' contextually
                        source: 'client',
                        info: `Newman finished: ${message.success ? 'Success' : 'Failed'}`,
                        data: message.output
                    }]);
                    break;
                case 'error':
                    console.error('Extension Error:', message.message);
                    setIsNewmanRunning(false);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        
        // Signal that Webview is ready to receive state
        vscode.postMessage({ command: 'webviewReady' } as WebviewCommand);

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleStart = (localPort: number, targetHost: string, targetPort: number) => {
        vscode.postMessage({
            command: 'startProxy',
            localPort,
            targetHost,
            targetPort
        } as WebviewCommand);
    };

    const handleStop = () => {
        vscode.postMessage({
            command: 'stopProxy'
        } as WebviewCommand);
    };

    const handleClearLogs = () => {
        setEvents([]);
        vscode.postMessage({
            command: 'clearLogs'
        } as WebviewCommand);
    };

    const handleSelectCollection = () => {
        vscode.postMessage({ command: 'selectCollection' } as WebviewCommand);
    };

    const handleRunNewman = (path: string) => {
        setIsNewmanRunning(true);
        setNewmanOutput('');
        vscode.postMessage({ command: 'runNewman', collectionPath: path } as WebviewCommand);
    };

    const [initialHex, setInitialHex] = React.useState('');

    const handleSendBinary = (hexString: string) => {
        vscode.postMessage({
            command: 'sendBinary',
            hexString
        } as WebviewCommand);
    };

    const handleSaveBinaryState = (hexString: string) => {
        vscode.postMessage({
            command: 'saveBinaryState',
            hexString
        } as WebviewCommand);
    };

    return (
        <div style={{ padding: '20px', height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ margin: '0 0 20px 0' }}>Newman TCP Proxy</h1>
            
            <ProxyControl 
                status={status} 
                config={proxyConfig}
                onStart={handleStart} 
                onStop={handleStop} 
            />

            <BinarySender 
                isRunning={status === 'running'}
                onSend={handleSendBinary}
                onSaveState={handleSaveBinaryState}
                initialValue={initialHex}
            />

            <NewmanControl
                collectionPath={collectionPath}
                onSelectCollection={handleSelectCollection}
                onRunNewman={handleRunNewman}
                isRunning={isNewmanRunning}
                proxyStatus={status}
            />

            <TrafficLog 
                events={events} 
                onClear={handleClearLogs} 
            />
        </div>
    );
};

// Start Type Definition for acquireVsCodeApi
declare function acquireVsCodeApi(): {
    postMessage(message: any): void;
    getState(): any;
    setState(state: any): void;
};
// End Type Definition

export default App;
