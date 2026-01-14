import * as React from 'react';
import { provideVSCodeDesignSystem, vsCodeTextField, vsCodeDivider } from '@vscode/webview-ui-toolkit';

// Register specific components
provideVSCodeDesignSystem().register(vsCodeTextField(), vsCodeDivider());

interface ProxyControlProps {
    status: 'running' | 'stopped';
    config?: { localPort: number; targetHost: string; targetPort: number; };
    onStart: (localPort: number, targetHost: string, targetPort: number) => void;
    onStop: () => void;
}

const ProxyControl: React.FC<ProxyControlProps> = ({ status, config, onStart, onStop }) => {
    const [localPort, setLocalPort] = React.useState('9000');
    const [targetHost, setTargetHost] = React.useState('127.0.0.1');
    const [targetPort, setTargetPort] = React.useState('8080');

    React.useEffect(() => {
        if (config) {
            setLocalPort(config.localPort.toString());
            setTargetHost(config.targetHost);
            setTargetPort(config.targetPort.toString());
        }
    }, [config]);

    const handleStart = () => {
        onStart(parseInt(localPort), targetHost, parseInt(targetPort));
    };

    return (
        <div className="proxy-control" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', border: '1px solid var(--vscode-widget-border)', borderRadius: '4px' }}>
            <h2 style={{ margin: '0 0 10px 0' }}>Proxy Settings</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ marginBottom: '4px', fontSize: '12px' }}>Local Port</label>
                    <vscode-text-field value={localPort} onInput={(e: any) => setLocalPort(e.target.value)} disabled={status === 'running'}></vscode-text-field>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ marginBottom: '4px', fontSize: '12px' }}>Target Host</label>
                    <vscode-text-field value={targetHost} onInput={(e: any) => setTargetHost(e.target.value)} disabled={status === 'running'}></vscode-text-field>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={{ marginBottom: '4px', fontSize: '12px' }}>Target Port</label>
                    <vscode-text-field value={targetPort} onInput={(e: any) => setTargetPort(e.target.value)} disabled={status === 'running'}></vscode-text-field>
                </div>
            </div>

            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                {status === 'stopped' ? (
                    <vscode-button onClick={handleStart}>Start Proxy</vscode-button>
                ) : (
                    <vscode-button appearance="secondary" onClick={onStop}>Stop Proxy</vscode-button>
                )}
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    Status: 
                    <vscode-tag>{status.toUpperCase()}</vscode-tag>
                </div>
            </div>
        </div>
    );
};

export default ProxyControl;
