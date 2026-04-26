import * as vscode from 'vscode';
import { encrypt, decrypt } from './cryptoUtil';

export function activate(context: vscode.ExtensionContext) {

    // 🔒 Encrypt command
    const encryptCmd = vscode.commands.registerCommand('myvsread.encryptFile', async () => {

        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const seed = await vscode.window.showInputBox({
            prompt: 'Enter seed for encryption',
            password: true
        });

        if (!seed) return;

        const text = editor.document.getText();
        const encrypted = encrypt(text, seed);

        const newDoc = await vscode.workspace.openTextDocument({
            content: encrypted,
            language: 'plaintext'
        });

        vscode.window.showTextDocument(newDoc);
    });

    // 🔓 Decrypt command
    const decryptCmd = vscode.commands.registerCommand('myvsread.decryptFile', async () => {

        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const seed = await vscode.window.showInputBox({
            prompt: 'Enter seed to decrypt',
            password: true
        });

        if (!seed) return;

        const content = editor.document.getText();

        try {
            const decrypted = decrypt(content, seed);

            const newDoc = await vscode.workspace.openTextDocument({
                content: decrypted,
                language: 'plaintext'
            });

            vscode.window.showTextDocument(newDoc);

        } catch {
            vscode.window.showErrorMessage('Invalid seed or corrupted file');
        }
    });

    context.subscriptions.push(encryptCmd, decryptCmd);
}

export function deactivate() {}