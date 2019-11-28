// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import { GitSweep } from './gitSweep';

export function activate(context: vscode.ExtensionContext) {
	const gitSweep = new GitSweep();
	vscode.window.registerTreeDataProvider('gitSweep', gitSweep);

	// TODO handle when multiple files are selected
	// called whenever a file is to be ignored
	context.subscriptions.push(vscode.commands.registerCommand('gitSweep.sweep', (item) => {
		gitSweep.sweepFile(item.resourceUri.fsPath);
	}));

	// called whenever a file is to be brought back into git
	context.subscriptions.push(vscode.commands.registerCommand('gitSweep.unsweep', (item) => {
		gitSweep.unsweepFile(item.path, item.type);
	}));

	// use could change exclude file manually, this allows refresh of the under the rug
	context.subscriptions.push(vscode.commands.registerCommand('gitSweep.refresh', () => {
		gitSweep.refresh();
	}));
}

export function deactivate() {}
