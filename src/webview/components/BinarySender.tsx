import * as React from 'react';
import { vsCodeButton, vsCodeTextField, vsCodeDivider } from '@vscode/webview-ui-toolkit';

interface BinarySenderProps {
    isRunning: boolean;
    onSend: (hexString: string) => void;
    onSaveState: (hexString: string) => void;
    initialValue: string;
}

const BinarySender: React.FC<BinarySenderProps> = ({ isRunning, onSend, onSaveState, initialValue }) => {
    const [hexString, setHexString] = React.useState(initialValue);
    const [error, setError] = React.useState('');

    // Update local state if initialValue updates (active config load)
    React.useEffect(() => {
        if (initialValue) {
            setHexString(initialValue);
        }
    }, [initialValue]);

    // Debounce save state
    React.useEffect(() => {
        const timeoutId = setTimeout(() => {
            onSaveState(hexString);
        }, 1000);
        return () => clearTimeout(timeoutId);
    }, [hexString]);

    const handleSend = () => {
        if (!hexString) return;
        
        // Basic validation
        if (!/^[0-9A-Fa-f]*$/.test(hexString)) {
            setError('Invalid Hex String (0-9, A-F only)');
            return;
        }

        setError('');
        onSend(hexString);
    };

    const handleChange = (e: any) => {
        const value = e.target.value;
        const cleanValue = value.replace(/\s/g, '');
        setHexString(cleanValue);
        
        if (cleanValue && !/^[0-9A-Fa-f]*$/.test(cleanValue)) {
            setError('Invalid Hex String');
        } else {
            setError('');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', border: '1px solid var(--vscode-widget-border)', borderRadius: '4px', marginBottom: '20px' }}>
            <h3 style={{ margin: '0 0 10px 0' }}>Manual Binary Injection</h3>
            
            <vscode-text-field 
                placeholder="48656c6c6f (Hex string)" 
                value={hexString}
                onInput={handleChange} 
                style={{ width: '100%' }}
            >
                Hex Data
            </vscode-text-field>
            
            {error && <span style={{ color: 'var(--vscode-errorForeground)', fontSize: '12px' }}>{error}</span>}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <vscode-button 
                    onClick={handleSend} 
                    disabled={!isRunning || !hexString || !!error}
                >
                    Send to Target
                </vscode-button>
            </div>
        </div>
    );
};

export default BinarySender;
