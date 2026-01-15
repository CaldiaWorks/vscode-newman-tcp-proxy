import * as vscode from 'vscode';
import { TcpProxyServer } from './proxy/TcpProxyServer';
import { NewmanRunner } from './runner/NewmanRunner';
import { WebviewCommand, ExtensionMessage } from './shared/MessageTypes';
import { ProxyEvent } from './proxy/ProxyInterface';

let currentPanel: vscode.WebviewPanel | undefined = undefined;
let proxyServer: TcpProxyServer | undefined = undefined;
let currentProxyPort: number = 9000; // Default or updated on start
let currentTargetHost: string = '127.0.0.1';
let currentTargetPort: number = 8080;
let logBuffer: ProxyEvent[] = [];
const MAX_LOG_SIZE = 1000;

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "vscode-newman-tcp-proxy" is active!');

    // Load persisted state or use defaults
    currentProxyPort = context.workspaceState.get<number>('localPort') || 9000;
    currentTargetHost = context.workspaceState.get<string>('targetHost') || '127.0.0.1';
    currentTargetPort = context.workspaceState.get<number>('targetPort') || 8080;

    // Initialize Proxy Server
    proxyServer = new TcpProxyServer();
    proxyServer.on('event', (event: ProxyEvent) => {
        // Buffer logs
        logBuffer.push(event);
        if (logBuffer.length > MAX_LOG_SIZE) {
            logBuffer.shift();
        }

        if (currentPanel) {
            const message: ExtensionMessage = { type: 'proxyEvent', event };
            currentPanel.webview.postMessage(message);

            // Handle automatic stop when target disconnects
            if (event.type === 'close' && event.source === 'target') {
                currentPanel.webview.postMessage({ type: 'proxyStatus', status: 'stopped' } as ExtensionMessage);
                vscode.window.showWarningMessage('Target server disconnected. Proxy stopped.');
            }
        }
    });

    let disposable = vscode.commands.registerCommand('vscode-newman-tcp-proxy.start', () => {
        if (currentPanel) {
            currentPanel.reveal(vscode.ViewColumn.One);
        } else {
            currentPanel = vscode.window.createWebviewPanel(
                'newmanTcpProxy',
                'Newman TCP Proxy',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
                    retainContextWhenHidden: true
                }
            );

            currentPanel.webview.html = getWebviewContent(currentPanel.webview, context.extensionUri);

            // Sync initial state logic is moved to 'webviewReady' handler
            // because posting immediately here often races with React hydration.

            // Handle messages from Webview
            currentPanel.webview.onDidReceiveMessage(
                async (message: WebviewCommand) => {
                    switch (message.command) {
                        case 'webviewReady':
                            // Sync state now that frontend is ready
                            // Always send current config, whether running or stopped
                            currentPanel?.webview.postMessage({ 
                                type: 'proxyStatus', 
                                status: proxyServer && proxyServer.isRunning ? 'running' : 'stopped',
                                config: {
                                    localPort: currentProxyPort,
                                    targetHost: currentTargetHost,
                                    targetPort: currentTargetPort
                                }
                            } as ExtensionMessage);

                            // Send buffered logs
                            if (logBuffer.length > 0) {
                                currentPanel?.webview.postMessage({ 
                                    type: 'batchProxyEvents', 
                                    events: logBuffer 
                                } as ExtensionMessage);
                            }
                            break;
                        case 'startProxy':
                            try {
                                if (proxyServer) {
                                    // Save state
                                    await context.workspaceState.update('localPort', message.localPort);
                                    await context.workspaceState.update('targetHost', message.targetHost);
                                    await context.workspaceState.update('targetPort', message.targetPort);

                                    // Update current variables
                                    currentProxyPort = message.localPort;
                                    currentTargetHost = message.targetHost;
                                    currentTargetPort = message.targetPort;

                                    // Clear buffer on fresh start if desired, or keep history.
                                    // Keeping history is safer, but clear on explicit start might be expected.
                                    // Let's keep history for now unless user clears.
                                    await proxyServer.start(message.localPort, message.targetHost, message.targetPort);
                                    
                                    currentPanel?.webview.postMessage({ 
                                        type: 'proxyStatus', 
                                        status: 'running',
                                        config: {
                                            localPort: currentProxyPort,
                                            targetHost: currentTargetHost,
                                            targetPort: currentTargetPort
                                        }
                                    } as ExtensionMessage);
                                    vscode.window.showInformationMessage(`Proxy started on port ${message.localPort}`);
                                }
                            } catch (err: any) {
                                vscode.window.showErrorMessage(`Failed to start proxy: ${err.message}`);
                                currentPanel?.webview.postMessage({ type: 'error', message: err.message } as ExtensionMessage);
                            }
                            break;
                        case 'stopProxy':
                            try {
                                if (proxyServer) {
                                    await proxyServer.stop();
                                    currentPanel?.webview.postMessage({ type: 'proxyStatus', status: 'stopped' } as ExtensionMessage);
                                    vscode.window.showInformationMessage('Proxy stopped');
                                }
                            } catch (err: any) {
                                vscode.window.showErrorMessage(`Failed to stop proxy: ${err.message}`);
                            }
                            break;
                        case 'selectCollection':
                            const options: vscode.OpenDialogOptions = {
                                canSelectMany: false,
                                openLabel: 'Select Collection',
                                filters: {
                                    'Postman Collections': ['json']
                                }
                            };
                            
                            const fileUri = await vscode.window.showOpenDialog(options);
                            if (fileUri && fileUri[0]) {
                                currentPanel?.webview.postMessage({ 
                                    type: 'collectionSelected', 
                                    path: fileUri[0].fsPath 
                                } as ExtensionMessage);
                            }
                            break;
                        case 'runNewman':
                            if (!proxyServer) {
                                vscode.window.showErrorMessage('Proxy server instance not found.');
                                return;
                            }
                            
                            // To properly run Newman via Proxy, we need the proxy URL.
                            // Assuming local environment or we need to track the last started port.
                            // For MVP, we can try to infer or store it.
                            // Let's store the last config in TcpProxyServer or a variable.
                            // But wait, TcpProxyServer doesn't expose config.
                            // We should have tracked it in handleStart.
                            const proxyUrl = `http://127.0.0.1:${currentProxyPort}`; // Need to track currentProxyPort

                            try {
                                const runner = new NewmanRunner();
                                const output = await runner.run(message.collectionPath, proxyUrl);
                                currentPanel?.webview.postMessage({ 
                                    type: 'newmanResult', 
                                    success: true, 
                                    output 
                                } as ExtensionMessage);
                                vscode.window.showInformationMessage('Newman execution finished.');
                            } catch (err: any) {
                                currentPanel?.webview.postMessage({ 
                                    type: 'newmanResult', 
                                    success: false, 
                                    output: err.message 
                                } as ExtensionMessage);
                                vscode.window.showErrorMessage(`Newman execution failed: ${err.message}`);
                            }
                            break;
                        case 'clearLogs':
                            logBuffer = []; // Clear backend buffer
                            break;
                    }
                },
                undefined,
                context.subscriptions
            );

            currentPanel.onDidDispose(
                () => {
                    currentPanel = undefined;
                    // Optional: Stop proxy when panel is closed?
                    // proxyServer?.stop();
                },
                null,
                context.subscriptions
            );
        }
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview.js'));
    const nonce = getNonce();

    return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-eval'; font-src ${webview.cspSource};">
		<title>Newman TCP Proxy</title>
	</head>
	<body>
		<div id="root"></div>
		<script nonce="${nonce}" src="${scriptUri}"></script>
	</body>
	</html>`;
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export function deactivate() {
    if (proxyServer) {
        proxyServer.stop();
    }
}
