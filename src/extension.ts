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
	const updateIndex = (filename: String, undo: Boolean = false) => {
		try {
			const arg = undo ? '--no-assume-unchanged' : '--assume-unchanged';
			const msg = undo ? 'Undo assume unchanged' : 'Assuming unchanged';

			cp.execSync(`git update-index ${arg} ${filename}`, { cwd });
			vscode.window.showInformationMessage(`${msg} ${filename}`);
			gauAssumedUnchangedProvider.refresh();
			vscode.commands.executeCommand('git.refresh');
		} catch (err) {
			vscode.window.showErrorMessage(err.message);
		}
	};

	// TODOJL: if the file isn't in the repo already add it to the exclude dir
	// this project does that already: https://github.com/BouKiCHi/git-exclude/blob/4837b0bbca08c2100457c3fe0c80d9a249dcc2ca/src/extension.ts
	// but it assumes .git is in the workspace root
	// git rev-parse --show-toplevel
	// gives the actual git repo location
	// git ls-files --others
	// shows them
	context.subscriptions.push(vscode.commands.registerCommand('extension.assumeUnchanged', (file) => {
		updateIndex(file.resourceUri.fsPath);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.noAssumeUnchanged', (item) => {
		updateIndex(item.filename, true);
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {}
