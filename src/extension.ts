// The module 'vscode' contains the VS Code extensibility API
import * as vscode from "vscode";
import { GitSweep, AssumedUnchangedFile } from "./gitSweep";

export function activate(context: vscode.ExtensionContext) {
  const gitSweep = new GitSweep();
  // vscode.window.registerTreeDataProvider('gitSweep', gitSweep);
  vscode.window.createTreeView("gitSweep", {
    treeDataProvider: gitSweep,
    canSelectMany: true,
  });

  // for brevity
  const register = (command: string, handler: any) =>
    context.subscriptions.push(
      vscode.commands.registerCommand(command, handler)
    );

  // called whenever a file/folder is to be ignored
  const sweep =
    (type: string) =>
    (...args: any[]) => {
      args
        .map((item) => item?.fsPath ?? item?.resourceUri?.fsPath)
        .filter(Boolean)
        .forEach((filePath) => gitSweep.sweepFile(filePath, type));
    };
  register("gitSweep.sweep", sweep("skip"));
  register("gitSweep.sweepFolder", sweep("exclude"));
  register("gitSweep.sweepFileSkip", sweep("skip"));
  register("gitSweep.sweepFileAssume", sweep("assume"));
  register("gitSweep.sweepFileExclude", sweep("exclude"));

  // called whenever a file/folder is to be brought back into git
  const unsweep = (item: any, multipleItems: [any]) => {
    (multipleItems || [item])
      .map((item) => item.fsPath ?? item.path)
      .filter(Boolean)
      .forEach((filePath) => gitSweep.unsweepFile(filePath));
  };
  register("gitSweep.unsweep", unsweep);
  register("gitSweep.unsweepFolder", unsweep);
  register("gitSweep.unsweepFile", unsweep);

  // use could change exclude file manually, this allows refresh of the under the rug
  context.subscriptions.push(
    vscode.commands.registerCommand("gitSweep.refresh", () => {
      gitSweep.refresh();
    })
  );
}

export function deactivate() {}
