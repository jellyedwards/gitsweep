// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GitSweep } from './gitSweep';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "gitSweep" is now active!');

	const gitSweep = new GitSweep();
	vscode.window.registerTreeDataProvider('gitSweep', gitSweep);

	// TODOJL proper error handling, none of this return true false that isn't used


	context.subscriptions.push(vscode.commands.registerCommand('gitSweep.sweep', (item) => {
		gitSweep.sweepFile(item.resourceUri.fsPath);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('gitSweep.unsweep', (item) => {
		gitSweep.unsweepFile(item.path, item.type);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('gitSweep.refresh', () => {
		gitSweep.refresh();
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {}
