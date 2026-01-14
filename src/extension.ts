import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "vscode-newman-tcp-proxy" is now active!');

	let disposable = vscode.commands.registerCommand('vscode-newman-tcp-proxy.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Newman TCP Proxy!');
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
