import * as React from 'react';
import { provideVSCodeDesignSystem, vsCodeButton, vsCodeTextField, vsCodeDivider } from '@vscode/webview-ui-toolkit';

provideVSCodeDesignSystem().register(vsCodeButton(), vsCodeTextField(), vsCodeDivider());

interface NewmanControlProps {
    onSelectCollection: () => void;
    onRunNewman: (collectionPath: string) => void;
    collectionPath: string;
    isRunning: boolean;
    proxyStatus: 'running' | 'stopped';
}

const NewmanControl: React.FC<NewmanControlProps> = ({ onSelectCollection, onRunNewman, collectionPath, isRunning, proxyStatus }) => {
    
    const handleRun = () => {
        if (collectionPath) {
            onRunNewman(collectionPath);
        }
    };

    return (
        <div className="newman-control" style={{ marginTop: '15px', padding: '10px', border: '1px solid var(--vscode-widget-border)', borderRadius: '4px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Newman Integration</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <vscode-text-field 
                    readOnly 
                    value={collectionPath || 'No collection selected'} 
                    placeholder="Select a Postman Collection JSON" 
                    style={{ flex: 1 }}
                ></vscode-text-field>
                <vscode-button appearance="secondary" onClick={onSelectCollection} disabled={isRunning}>Select...</vscode-button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <vscode-button onClick={handleRun} disabled={!collectionPath || isRunning || proxyStatus !== 'running'}>
                    {isRunning ? 'Running...' : 'Run Collection'}
                </vscode-button>
                {/* Warning if proxy is not running */}
                {proxyStatus !== 'running' && collectionPath && (
                    <span style={{ color: 'var(--vscode-inputValidation-warningBorder)', fontSize: '12px' }}>
                        Proxy must be running to execute tests via proxy.
                    </span>
                )}
            </div>
        </div>
    );
};

export default NewmanControl;
