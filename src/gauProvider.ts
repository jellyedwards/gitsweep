import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';

export const IgnoreEnum = Object.freeze({
	AssumeUnchanged: 'Assume Unchanged',
	SkipWorktree: 'Skip Worktree',
	Excluded: 'Excluded'
});

export class GauProvider implements vscode.TreeDataProvider<AssumedUnchangedFile> {

	private _onDidChangeTreeData: vscode.EventEmitter<AssumedUnchangedFile | undefined> = new vscode.EventEmitter<AssumedUnchangedFile | undefined>();
	readonly onDidChangeTreeData: vscode.Event<AssumedUnchangedFile | undefined> = this._onDidChangeTreeData.event;

	private excludeFile: string;

	constructor(private gitRoot: string) {
		// vscode.commands.registerCommand('xyz.hello', () => vscode.window.showInformationMessage("Hi"));
		this.excludeFile = path.join(this.gitRoot, '.git', 'info', 'exclude');
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: AssumedUnchangedFile): vscode.TreeItem {
		return element;
	}

	getChildren(element?: AssumedUnchangedFile): Thenable<AssumedUnchangedFile[]> {
		// get the files that are skipped or assume-unchanged
		const gitls = cp.execSync('git ls-files -v', {cwd: this.gitRoot});
		const assumedUnchangedFiles = gitls.toString().split(/\n/)
			.filter(a => /^[a-zS]/.test(a))
			.map(line => {
				const parts = line.split(" ");
				let type = IgnoreEnum.SkipWorktree;
				if (parts[0] === parts[0].toLowerCase()) {
					type = IgnoreEnum.AssumeUnchanged;
				}

				return {
					type,
					path: parts[1]
				};
			});

		// get the files that are in the exclude file
		const excludedFiles = fs.readFileSync(this.excludeFile)
			.toString().split(/\n/)
			.filter(e => /^(?!\s*#).+/.test(e))
			.map(line => ({ type: IgnoreEnum.Excluded, path: line}));

		return Promise.resolve(assumedUnchangedFiles.concat(excludedFiles)
			.map(file => new AssumedUnchangedFile(file.type, file.path, this.gitRoot)));
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
		public readonly type: string,
		public readonly filename: string,
		public readonly gitRoot: string,
		public readonly command?: vscode.Command	// command exec'd when selected
	) {
		super(vscode.Uri.file(path.join(gitRoot, filename)),
			vscode.TreeItemCollapsibleState.None);
	}

	get path(): string {
		return path.join(this.gitRoot, this.filename);
	}

	get tooltip(): string {
		return `${this.filename}·${this.type}`;
	}

	get description(): string {
		return this.filename;
	}

	// iconPath = {
	// 	light: path.join(__filename, '..', '..', 'resources', 'light', 'dependency.svg'),
	// 	dark: path.join(__filename, '..', '..', 'resources', 'dark', 'dependency.svg')
	// };
}