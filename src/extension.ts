// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GauProvider, AssumedUnchangedFile, IgnoreEnum } from './gauProvider';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "gitassumeunchanged" is now active!');

	// get the git root dir
	const cwd = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : './';
	const gitRoot = cp.execSync('git rev-parse --show-toplevel', { cwd }).toString().replace(/\n$/, '');
	const excludeFileLocation = path.join(gitRoot, '.git', 'info', 'exclude');

	const gauProvider = new GauProvider(gitRoot);
	vscode.window.registerTreeDataProvider('gauAssumedUnchanged', gauProvider);

	// TODOJL proper error handling, none of this return true false that isn't used
	// TODOJL refactor into own class
	const fileInRepo = (filename: string) => {
		try {
			cp.execSync(`git ls-files --error-unmatch ${filename}`, { cwd: gitRoot });
			return true;
		} catch {
			return false;
		}
	};

	const excludeFile = (filename: string) => {
		try {
			const prefix = fs.readFileSync(excludeFileLocation).toString().endsWith('\n') ? '' : '\n';
			fs.appendFileSync(excludeFileLocation, prefix + filename + '\n');
			return true;
		} catch {
			return false;
		}
	};

	const includeFile = (filename: string) => {
		try {
			const newExclude = fs.readFileSync(excludeFileLocation)
				.toString()
				.replace(filename+'\n', '');

			fs.writeFileSync(excludeFileLocation, newExclude);
			
			return true;
		} catch(err) {
			return false;
		}
	};

	// TODOJL: skip worktree might be better: http://blog.stephan-partzsch.de/how-to-ignore-changes-in-tracked-files-with-git/
	const updateIndex = (filename: String, arg: string, msg: string) => {
		try {
			cp.execSync(`git update-index ${arg} ${filename}`, { cwd: gitRoot });
			vscode.window.showInformationMessage(`${msg} ${filename}`);
		} catch (err) {
			vscode.window.showErrorMessage(err.message);
		}
	};

	const skip = (f: String) => updateIndex(f, '--skip-worktree', 'Skip Worktree');
	const noSkip = (f: String) => updateIndex(f, '--no-skip-worktree', 'No Skip Worktree');
	// const assume = (f: String) => updateIndex(f, '--assume-unchanged', 'Assume Unchanged');
	const noAssume = (f: String) => updateIndex(f, '--no-assume-unchanged', 'No Assume Unchanged');

	// TODOJL: if the file isn't in the repo already add it to the exclude dir
	// this project does that already: https://github.com/BouKiCHi/git-exclude/blob/4837b0bbca08c2100457c3fe0c80d9a249dcc2ca/src/extension.ts
	// but it assumes .git is in the workspace root
	// git rev-parse --show-toplevel
	// gives the actual git repo location
	// git ls-files --others
	// shows them
	context.subscriptions.push(vscode.commands.registerCommand('extension.assumeUnchanged', (item) => {
		// check if the file is in the repo already
		const file = item.resourceUri.fsPath;
		if (fileInRepo(file)) {
			skip(file);
		} else {
			excludeFile(item.resourceUri.path.replace(gitRoot, '').replace('//', '/'));
		}

		gauProvider.refresh();
		vscode.commands.executeCommand('git.refresh');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.noAssumeUnchanged', (item) => {
		const file = item.path;
		if (fileInRepo(file)) {
			if (item.type === IgnoreEnum.AssumeUnchanged) {
				noAssume(file);
			} else {
				noSkip(file);
			}
		} else {
			includeFile(item.filename);
		}	

		gauProvider.refresh();
		vscode.commands.executeCommand('git.refresh');
	}));
}

// this method is called when your extension is deactivated
export function deactivate() {}
