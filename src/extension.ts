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

  // called whenever a file is to be ignored
  const sweep = (...args: any[]) => {
    args.map(item => item?.fsPath ?? item?.resourceUri?.fsPath)
      .filter(Boolean)
      .forEach((filePath) => gitSweep.sweepFile(filePath));
  };
  context.subscriptions.push(vscode.commands.registerCommand("gitSweep.sweep", sweep));
  context.subscriptions.push(vscode.commands.registerCommand("gitSweep.sweepFolder", sweep));

  // called whenever a file is to be brought back into git
  const unsweep = (item: any, multipleItems: [any]) => {
    (multipleItems || [item])
      .map(item => item.fsPath ?? item.path)
      .filter(Boolean)
      .forEach((filePath) =>
        gitSweep.unsweepFile(filePath)
      );
  };
  context.subscriptions.push(vscode.commands.registerCommand("gitSweep.unsweep", unsweep));
  context.subscriptions.push(vscode.commands.registerCommand("gitSweep.unsweepFolder", unsweep));

  // use could change exclude file manually, this allows refresh of the under the rug
  context.subscriptions.push(
    vscode.commands.registerCommand("gitSweep.refresh", () => {
      gitSweep.refresh();
    })
  );
}

export function deactivate() {}
