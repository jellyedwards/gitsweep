// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { runGitCommandInTerminal } from './terminal';
import { GauProvider, Dependency } from './gauProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "gitassumeunchanged" is now active!');

	const gauAssumedUnchangedProvider = new GauProvider(vscode.workspace.workspaceFolders);
	vscode.window.registerTreeDataProvider('gauAssumedUnchanged', gauAssumedUnchangedProvider);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.assumeUnchanged', (file) => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello VS Code! ' + file.resourceUri.fsPath);
		// runGitCommandInTerminal(context, 
		// 	'update-index', 
		// 	'--assume-unchanged ' + file.resourceUri.fsPath, 
		// 	'', true);
		runGitCommandInTerminal(context, 'ls-files', '-v', '', true);
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
