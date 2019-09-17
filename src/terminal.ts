'use strict';
import { Disposable, Terminal, ExtensionContext, window } from 'vscode';
// import { Container } from './container';

const extensionTerminalName = 'GitAssumeUnchanged';

let _terminal: Terminal | undefined;
let _terminalCwd: string | undefined;
let _disposable: Disposable | undefined;

function ensureTerminal(context: ExtensionContext, cwd: string): Terminal {
    if (_terminal === undefined) {
        _terminal = window.createTerminal(extensionTerminalName);
        _disposable = window.onDidCloseTerminal((e: Terminal) => {
            if (e.name === extensionTerminalName) {
                _terminal = undefined;
                _disposable!.dispose();
                _disposable = undefined;
            }
        });

        // Container.context.subscriptions.push(_disposable);
        context.subscriptions.push(_disposable);
        _terminalCwd = undefined;
    }

    if (_terminalCwd !== cwd) {
        _terminal.sendText(`cd "${cwd}"`, true);
        _terminalCwd = cwd;
    }

    return _terminal;
}

export function runGitCommandInTerminal(context: ExtensionContext, command: string, args: string, cwd: string, execute: boolean = false) {
    // let git = GitService.getGitPath();
    // if (git.includes(' ')) {
    //     git = `"${git}"`;
    // }

    const terminal = ensureTerminal(context, cwd);
    terminal.show(false);
    terminal.sendText(`git ${command} ${args}`, execute);
}