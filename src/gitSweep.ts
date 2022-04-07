import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as cp from "child_process";
import { openStdin } from "process";

const IgnoreEnum = Object.freeze({
  AssumeUnchanged: "Assume Unchanged",
  SkipWorktree: "Skip Worktree",
  Excluded: "Excluded",
});

export class GitSweep implements vscode.TreeDataProvider<AssumedUnchangedFile> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    AssumedUnchangedFile | undefined
  > = new vscode.EventEmitter<AssumedUnchangedFile | undefined>();
  readonly onDidChangeTreeData: vscode.Event<AssumedUnchangedFile | undefined> =
    this._onDidChangeTreeData.event;

  private pathToExclude: string;
  private gitRoot: string;
  private debug: vscode.OutputChannel;

  constructor() {
    const cwd = vscode.workspace.workspaceFolders
      ? vscode.workspace.workspaceFolders[0].uri.fsPath
      : "./";
    this.gitRoot = cp
      .spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd })
      .output.toString()
      // spawnSync wraps the output in commas and a newline for some reason
      .replace(/^,|,$|\n/g, "");
    this.pathToExclude = path.join(this.gitRoot, ".git", "info", "exclude");
    this.debug = vscode.window.createOutputChannel("GitSweep");

    // watch the exclude file and update when it changes
    fs.watchFile(this.pathToExclude, () => {
      this.refresh();
    });

    vscode.commands.registerCommand("gitSweep.openFile", (file) => {
      vscode.workspace.openTextDocument(file).then((doc) => {
        vscode.window.showTextDocument(doc);
      });
    });
  }

  sweepFile(filePath: string, type: string = "skip") {
    if (this.fileInRepo(filePath) && type !== "exclude") {
      if (type === "assume") {
        this.assume(filePath);
      } else {
        this.skip(filePath);
      }
    } else {
      if (fs.existsSync(filePath)) {
        const result = fs.lstatSync(filePath);
        if (result.isDirectory()) {
          this.excludeFile(filePath + path.sep + "*");
        } else if (result.isFile()) {
          this.excludeFile(filePath);
        }
      }
    }

    this.refresh();
  }

  unsweepFile(filePath: string) {
    if (this.fileInRepo(filePath)) {
      this.dontAssume(filePath);
      this.dontSkip(filePath);
    } else {
      if (fs.existsSync(filePath)) {
        const result = fs.lstatSync(filePath);
        if (result.isDirectory()) {
          this.includeFile(filePath + path.sep + "*");
        } else if (result.isFile()) {
          this.includeFile(filePath);
        }
      } else {
        this.includeFile(filePath);
      }
    }

    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
    this.getChildren();
    vscode.commands.executeCommand("git.refresh");
  }

  getTreeItem(element: AssumedUnchangedFile): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<AssumedUnchangedFile[]> {
    // get the files that are skipped or assume-unchanged
    const gitls = cp.spawnSync("git", ["ls-files", "-v"], {
      cwd: this.gitRoot,
    });
    const assumedUnchangedFiles = gitls.output
      .toString()
      // spawnSync wraps the output in commas for some reason
      .replace(/^,|,$/g, "")
      .split(/\n/)
      .filter((a) => /^[a-zS]/.test(a)) // must start with a lowercase letter or capital S
      .map((line) => {
        const typeLetter = line.substring(0, line.indexOf(" "));
        const path = line.substring(line.indexOf(" ") + 1);

        let type = IgnoreEnum.SkipWorktree;
        // if it's a lowercase letter it's been --assume-unchanged
        if (typeLetter === typeLetter.toLowerCase()) {
          type = IgnoreEnum.AssumeUnchanged;
        }

        return {
          type,
          path,
          isPattern: false,
        };
      });

    // get the files that are in the exclude file
    const excludedFiles = fs
      .readFileSync(this.pathToExclude)
      .toString()
      .split(/\n/)
      .filter((e) => /^(?!\s*#).+/.test(e)) // ignore comments
      .map((line) => ({
        type: IgnoreEnum.Excluded,
        path: line,
        isPattern: /((?<!\\)(\*|\?|\[|\])|^\\!)/.test(line), // does it have unescaped wildcards?
      }));

    // return a list of both skipped and excluded files
    const all = assumedUnchangedFiles.concat(excludedFiles);
    return Promise.resolve(
      all.map(
        (file) =>
          new AssumedUnchangedFile(
            file.type,
            file.path,
            this.gitRoot,
            file.isPattern
          )
      )
    );
  }

  private fileInRepo = (filename: string) => {
    try {
      cp.execSync(`git ls-files --error-unmatch "${filename}"`, {
        cwd: this.gitRoot,
      });
      return true;
    } catch {
      return false;
    }
  };

  private excludeFile = (filename: string) => {
    try {
      filename = this.shortenPath(filename);
      const entry = filename + "\n";
      const excludeFile = fs.readFileSync(this.pathToExclude).toString();

      if (excludeFile.includes(entry)) {
        return;
      }

      // if there's no newline at the end of the file, add one
      const prefix = excludeFile.endsWith("\n") ? "" : "\n";

      fs.appendFileSync(this.pathToExclude, prefix + entry);
      this.debug.appendLine(`excluding "${filename}"`);
    } catch (err) {
      if (err instanceof Error) {
        vscode.window.showErrorMessage("Couldn't exclude file", err.message);
      }
    }
  };

  private forwardSlashes(s: string) {
    return s.replace(/\\/g, "/");
  }

  private shortenPath(path: string, removeLeadingSlash: boolean = false) {
    const toRemove =
      this.forwardSlashes(this.gitRoot) + (removeLeadingSlash ? "/" : "");
    const regEx = new RegExp(toRemove, "ig");
    return this.forwardSlashes(path).replace(regEx, "");
  }

  private escapeRegex(string: string) {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
  }

  private includeFile = (filename: string) => {
    try {
      filename = this.shortenPath(filename, true);
      const fileContents = fs.readFileSync(this.pathToExclude).toString();
      // match the previous new line if there was one:	\v{0,1}
      // then it might start with a ./ or a / or neither: ^(\.\/|\/){0,1}
      // then it should match the filename (\Q and \E are for regexp literal)
      const pattern = `(\v{0,1}^(\.\/|\/){0,1}${this.escapeRegex(filename)})`;
      const regex = new RegExp(pattern, "ms");
      const newExclude = fileContents.replace(regex, "");

      fs.writeFileSync(this.pathToExclude, newExclude);
      this.debug.appendLine(`including "${filename}"`);
    } catch (err) {
      if (err instanceof Error) {
        vscode.window.showErrorMessage("Couldn't include file", err.message);
      }
    }
  };

  // generic updateIndex for assume, no-assume, skip and no-skip (below)
  private updateIndex = (filename: String, arg: string, msg: string) => {
    try {
      const cmd = `git update-index ${arg} "${filename}"`;
      this.debug.appendLine(`${msg}: ${cmd}`);

      cp.execSync(cmd, {
        cwd: this.gitRoot,
      });
    } catch (err) {
      if (err instanceof Error) {
        vscode.window.showErrorMessage(err.message);
      }
    }
  };

  private skip = (f: String) =>
    this.updateIndex(f, "--skip-worktree", "Skip Worktree");
  private dontSkip = (f: String) =>
    this.updateIndex(f, "--no-skip-worktree", "Don't Skip Worktree");
  private assume = (f: String) =>
    this.updateIndex(f, "--assume-unchanged", "Assume Unchanged");
  private dontAssume = (f: String) =>
    this.updateIndex(f, "--no-assume-unchanged", "Don't Assume Unchanged");
}

export class AssumedUnchangedFile extends vscode.TreeItem {
  constructor(
    public readonly type: string,
    public readonly filename: string,
    public readonly gitRoot: string,
    public readonly isPattern: boolean
  ) {
    super(
      vscode.Uri.file(path.join(gitRoot, filename)),
      vscode.TreeItemCollapsibleState.None
    );
    this.tooltip = `${path.join(gitRoot, filename)} (${this.type})`;
    this.description = `(${this.type})`;
    this.command = {
      command: "gitSweep.openFile",
      title: "Open File",
      arguments: [this.resourceUri],
    };

    if (isPattern) {
      this.label = filename;
      this.description = `(${this.type} pattern)`;
    }
  }

  get path(): string {
    return path.join(this.gitRoot, this.filename);
  }

  contextValue = "file";
}
