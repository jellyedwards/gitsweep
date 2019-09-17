import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';

export class GauProvider implements vscode.TreeDataProvider<AssumedUnchangedFile> {

	private _onDidChangeTreeData: vscode.EventEmitter<AssumedUnchangedFile | undefined> = new vscode.EventEmitter<AssumedUnchangedFile | undefined>();
	readonly onDidChangeTreeData: vscode.Event<AssumedUnchangedFile | undefined> = this._onDidChangeTreeData.event;

	constructor(private workspaceRoot: vscode.WorkspaceFolder[] | undefined) {
		vscode.commands.registerCommand('xyz.hello', () => vscode.window.showInformationMessage("Hi"));
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: AssumedUnchangedFile): vscode.TreeItem {
		return element;
	}

	getChildren(element?: AssumedUnchangedFile): Thenable<AssumedUnchangedFile[]> {
		if (!this.workspaceRoot) {
			vscode.window.showInformationMessage('No dependency in empty workspace');
			return Promise.resolve([]);
		}

		const cwd = this.workspaceRoot[0].uri.fsPath;
		// const handleCp = (err: any, stdout: any, stderr: any) => {
		// 	// console.log('stdout', stdout);
		// 	if (err) {
		// 		console.log('stderr: ', stderr);
		// 		console.log('error: ' + err);

		// 		return [];
		// 	} else {
		// 		return stdout;
		// 	}
		// };

		const gitls = cp.execSync('git ls-files -v', {cwd});//, handleCp);
		const assumedUnchangedFiles = gitls.toString().split(/\n/)
			.filter(a => /^[a-z]/.test(a))
			.map(line => line.split(" ")[1]);
		return Promise.resolve(assumedUnchangedFiles
			.map(file => new AssumedUnchangedFile(path.join(cwd, file))));
	}

	private pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch (err) {
			return false;
		}

		return true;
	}
}

export class AssumedUnchangedFile extends vscode.TreeItem {

	constructor(
		public readonly filename: string,
		public readonly command?: vscode.Command
	) {
		super(path.basename(filename), vscode.TreeItemCollapsibleState.None);
	}

	get tooltip(): string {
		return `${this.filename}`;
	}

	get description(): string {
		return this.filename;
	}

	// iconPath = {
	// 	light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
	// 	dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	// };

	contextValue = 'dependency';

}