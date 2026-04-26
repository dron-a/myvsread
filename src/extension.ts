import * as vscode from 'vscode';
import { SidePanelViewProvider } from './SidePanelViewProvider';
import { encrypt, decrypt } from './cryptoUtil';

// This is the shared "memory" for the seed value.
let currentSeed: string = '';

export function activate(context: vscode.ExtensionContext) {

	// --- Create and Register the Side Panel View Provider ---
	const provider = new SidePanelViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SidePanelViewProvider.viewType, provider)
	);

	// --- Listen to the custom event from our provider ---
	provider.onSeedChanged(seed => {
		currentSeed = seed;
		console.log(`Seed successfully updated to: ${currentSeed}`); // For debugging
	});


    //  --- 🔒 Register the Encrypt File Command ---
    const encryptFileCommand = vscode.commands.registerCommand('myvsread.encryptFile', async () => {

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('MyVsRead: No active text editor to encrypt.');
            return;
        }

        // const seed = await vscode.window.showInputBox({
        //     prompt: 'Enter seed for encryption',
        //     password: true
        // });

        if (!currentSeed) {
            vscode.window.showWarningMessage('MyVsRead: No seed entered, going with default seed of 00.');
            return;
        }

        vscode.window.showInformationMessage(`Encrypting file with seed`);
        const text = editor.document.getText();
        const encrypted = encrypt(text, currentSeed);

        const newDoc = await vscode.workspace.openTextDocument({
            content: encrypted,
            language: 'plaintext'
        });

        vscode.window.showTextDocument(newDoc);
    });
    context.subscriptions.push(encryptFileCommand);

    // --- 🔓 Register the Decrypt File Command ---
    const decryptFileCommand = vscode.commands.registerCommand('myvsread.decryptFile', async () => {

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('MyVsRead: No active text editor to decrypt.');
            return;
        }

        // const seed = await vscode.window.showInputBox({
        //     prompt: 'Enter seed to decrypt',
        //     password: true
        // });

        if (!currentSeed) {
            vscode.window.showWarningMessage('MyVsRead: No seed entered, going with default seed of 00.');
            return;
        }

        vscode.window.showInformationMessage(`Decrypting file with seed`);
        const content = editor.document.getText();

        try {
            const decrypted = decrypt(content, currentSeed);

            const newDoc = await vscode.workspace.openTextDocument({
                content: decrypted,
                language: 'plaintext'
            });

            vscode.window.showTextDocument(newDoc);

        } catch {
            vscode.window.showErrorMessage('Invalid seed or corrupted file');
        }
    });
    context.subscriptions.push(decryptFileCommand);

}

export function deactivate() {}