import * as React from 'react';
import { ProxyEvent } from '../../proxy/ProxyInterface'; // Shared interface
// Assuming ProxyInterface is available via include path or similar

interface TrafficLogProps {
    events: ProxyEvent[];
    onClear: () => void;
}

const TrafficLog: React.FC<TrafficLogProps> = ({ events, onClear }) => {
    const listRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [events]);

    return (
        <div className="traffic-log" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '15px', border: '1px solid var(--vscode-widget-border)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ padding: '8px', background: 'var(--vscode-editor-background)', borderBottom: '1px solid var(--vscode-widget-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Traffic Log ({events.length})</h3>
                <vscode-button appearance="icon" onClick={onClear}>
                    Clear
                </vscode-button>
            </div>
            
            <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '10px', fontFamily: 'monospace', fontSize: '12px' }}>
                {events.length === 0 ? (
                    <div style={{ color: 'var(--vscode-descriptionForeground)', textAlign: 'center', padding: '20px' }}>No events logged yet.</div>
                ) : (
                    events.map((evt, idx) => (
                        <div key={`${evt.id}-${idx}`} style={{ marginBottom: '4px', paddingBottom: '4px', borderBottom: '1px solid var(--vscode-textSeparator-foreground)' }}>
                            <span style={{ color: 'var(--vscode-textPreformat-foreground)', marginRight: '8px' }}>[{new Date(evt.timestamp).toLocaleTimeString()}]</span>
                            <span style={{ fontWeight: 'bold', color: evt.source === 'client' ? 'var(--vscode-terminal-ansiCyan)' : 'var(--vscode-terminal-ansiGreen)' }}>{evt.source.toUpperCase()}</span>
                            <span style={{ margin: '0 8px' }}>&rarr;</span>
                            <span style={{ color: evt.type === 'error' ? 'var(--vscode-terminal-ansiRed)' : 'var(--vscode-foreground)' }}>{evt.type}</span>
                            {evt.info && <div style={{ paddingLeft: '20px', color: 'var(--vscode-descriptionForeground)' }}>{evt.info}</div>}
                            {evt.data && (
                                <div style={{ paddingLeft: '20px', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto', background: 'var(--vscode-textBlockQuote-background)', margin: '4px 0' }}>
                                    {typeof evt.data === 'string' ? evt.data : '[Binary Data]'}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TrafficLog;
