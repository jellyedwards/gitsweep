// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GauProvider, AssumedUnchangedFile } from './gauProvider';
import * as cp from 'child_process';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "gitassumeunchanged" is now active!');

	const gauAssumedUnchangedProvider = new GauProvider(vscode.workspace.workspaceFolders);
	vscode.window.registerTreeDataProvider('gauAssumedUnchanged', gauAssumedUnchangedProvider);

	const cwd = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : './';

	// TODOJL: skip worktree might be better: http://blog.stephan-partzsch.de/how-to-ignore-changes-in-tracked-files-with-git/
	context.subscriptions.push(vscode.commands.registerCommand('extension.assumeUnchanged', (file) => {
		try {
			cp.execSync('git update-index --assume-unchanged ' + file.resourceUri.fsPath, { cwd });
			vscode.window.showInformationMessage('Assuming not unchanged: ' + file.resourceUri.fsPath);
			gauAssumedUnchangedProvider.refresh();
			vscode.commands.executeCommand('git.refresh');
		} catch (err) {
			vscode.window.showErrorMessage(err.message);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.noAssumeUnchanged', (item) => {
		try {
			cp.execSync('git update-index --no-assume-unchanged ' + item.filename, { cwd });
			vscode.window.showInformationMessage('Assuming not unchanged: ' + item.filename);
			gauAssumedUnchangedProvider.refresh();
			vscode.commands.executeCommand('git.refresh');
		} catch (err) {
			vscode.window.showErrorMessage(err.message);
		}
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {}
