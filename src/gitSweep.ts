import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';

const IgnoreEnum = Object.freeze({
	AssumeUnchanged: 'Assume Unchanged',
	SkipWorktree: 'Skip Worktree',
	Excluded: 'Excluded'
});

export class GitSweep implements vscode.TreeDataProvider<AssumedUnchangedFile> {

	private _onDidChangeTreeData: vscode.EventEmitter<AssumedUnchangedFile | undefined> = new vscode.EventEmitter<AssumedUnchangedFile | undefined>();
	readonly onDidChangeTreeData: vscode.Event<AssumedUnchangedFile | undefined> = this._onDidChangeTreeData.event;

	private pathToExclude: string;
	private gitRoot: string;

	constructor() {
		const cwd = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : './';
		this.gitRoot = cp.execSync('git rev-parse --show-toplevel', { cwd }).toString().replace(/\n$/, '');
		this.pathToExclude = path.join(this.gitRoot, '.git', 'info', 'exclude');

		vscode.commands.registerCommand('gitSweep.openFile', (file) => {
			vscode.workspace.openTextDocument(file).then(doc => {
				vscode.window.showTextDocument(doc);
			  });
		});
	}

	sweepFile(path: string) {
		if (this.fileInRepo(path)) {
			this.skip(path);
		} else {
			this.excludeFile(path);
		}

		this.refresh();
		vscode.commands.executeCommand('git.refresh');
	}

	unsweepFile(path: string, type: string) {
		if (this.fileInRepo(path)) {
			if (type === IgnoreEnum.AssumeUnchanged) {
				this.dontAssume(path);
			} else {
				this.dontSkip(path);
			}
		} else {
			this.includeFile(path);
		}	

		this.refresh();
		vscode.commands.executeCommand('git.refresh');
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: AssumedUnchangedFile): vscode.TreeItem {
		return element;
	}

	getChildren(): Thenable<AssumedUnchangedFile[]> {
		// get the files that are skipped or assume-unchanged
		const gitls = cp.execSync('git ls-files -v', {cwd: this.gitRoot});
		const assumedUnchangedFiles = gitls.toString().split(/\n/)
			.filter(a => /^[a-zS]/.test(a))	// must start with a lowercase letter or capital S
			.map(line => {
				const parts = line.split(" ");
				const [typeLetter, path] = parts;
				let type = IgnoreEnum.SkipWorktree;
				// if it's a lowercase letter it's been --assume-unchanged
				if (typeLetter === typeLetter.toLowerCase()) {
					type = IgnoreEnum.AssumeUnchanged;
				}

				return {
					type,
					path
				};
			});

		// get the files that are in the exclude file
		const excludedFiles = fs.readFileSync(this.pathToExclude)
			.toString().split(/\n/)
			.filter(e => /^(?!\s*#).+/.test(e))
			.map(line => ({ type: IgnoreEnum.Excluded, path: line}));

		// return a list of both skipped and excluded files
		return Promise.resolve(assumedUnchangedFiles.concat(excludedFiles)
			.map(file => new AssumedUnchangedFile(file.type, file.path, this.gitRoot)));
	}

	private fileInRepo = (filename: string) => {
		try {
			cp.execSync(`git ls-files --error-unmatch ${filename}`, { cwd: this.gitRoot });
			return true;
		} catch {
			return false;
		}
	}

	private excludeFile = (filename: string) => {
		try {
			filename = this.shortenPath(filename);
			const prefix = fs.readFileSync(this.pathToExclude).toString().endsWith('\n') ? '' : '\n';

			fs.appendFileSync(this.pathToExclude, prefix + filename + '\n');
		} catch (err) {
			vscode.window.showErrorMessage("Couldn't exclude file", err.message);
		}
	}

	private forwardSlashes(s: string) {
		return s.replace(/\\/g, '/');
	}

	private shortenPath(p: string) {
		return (this.forwardSlashes(p).replace(this.forwardSlashes(this.gitRoot), ''));
	}

	private includeFile = (filename: string) => {
		try {
			filename = this.shortenPath(filename);
			const newExclude = fs.readFileSync(this.pathToExclude)
				.toString()
				.replace(filename+'\n', '')
				.replace(filename, ''); // or if there wasn't a newline after it

			fs.writeFileSync(this.pathToExclude, newExclude);
		} catch(err) {
			vscode.window.showErrorMessage("Couldn't include file", err.message);
		}
	}

	// generic updateIndex for assume, no-assume, skip and no-skip (below)
	private updateIndex = (filename: String, arg: string, msg: string) => {
		try {
			cp.execSync(`git update-index ${arg} ${filename}`, { cwd: this.gitRoot });
			vscode.window.showInformationMessage(`${msg} ${filename}`);
		} catch (err) {
			vscode.window.showErrorMessage(err.message);
		}
	}

	private skip = (f: String) => this.updateIndex(f, '--skip-worktree', 'Skip Worktree');
	private dontSkip = (f: String) => this.updateIndex(f, '--no-skip-worktree', 'No Skip Worktree');
	// private assume = (f: String) => updateIndex(f, '--assume-unchanged', 'Assume Unchanged');
	private dontAssume = (f: String) => this.updateIndex(f, '--no-assume-unchanged', 'No Assume Unchanged');

}

class AssumedUnchangedFile extends vscode.TreeItem {
	constructor(
		public readonly type: string,
		public readonly filename: string,
		public readonly gitRoot: string,
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

	get command(): vscode.Command {
		return { command: 'gitSweep.openFile', title: "Open File", arguments: [this.resourceUri] };
	}

	contextValue = 'file';
}