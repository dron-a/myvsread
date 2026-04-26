import * as vscode from 'vscode';
import { SidePanelViewProvider } from './SidePanelViewProvider';
import { encrypt, decrypt } from './cryptoUtil';

// This is the shared "memory" for the seed value.
let currentSeed: string = '';
const DEFAULT_SEED: string = 'default-secret-seed-123';
const SEED_STORAGE_KEY = 'myvsread.seed'; // Define a constant for our storage key
// ====================================

// --- NEW: Declare a StatusBarItem variable ---
let seedStatusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {

	// --- NEW: Initialize the Status Bar Item ---
	seedStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	// We'll keep this command name, but we need to register it!
	seedStatusBarItem.command = 'myvsread.showSidePanel'; // Optional: clicking it opens the panel
	context.subscriptions.push(seedStatusBarItem);


	// --- 1. Create and Register the Side Panel View Provider ---
	const provider = new SidePanelViewProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SidePanelViewProvider.viewType, provider)
	);

	// --- 2. Create a function to keep seed in sync ---
	// This function updates our internal variable AND the side panel UI
	// --- MODIFIED: The updateSeed function now saves the seed too ---
	const updateSeed = (newSeed: string) => {
		currentSeed = newSeed;
		provider.updateSeed(newSeed); // Updates the side panel's input box
		
		// Save the new seed to persistent storage
		context.globalState.update(SEED_STORAGE_KEY, newSeed);

		// --- NEW: Update the Status Bar Item ---
		if (currentSeed) {
			seedStatusBarItem.text = `$(key) Seed is set`;
			seedStatusBarItem.tooltip = `Current Seed: ${currentSeed.substring(0, 2)}${currentSeed.length > 2 ? '***' : ''}`; // Shows first few chars
			seedStatusBarItem.show(); // Make sure it's visible
		} else {
			seedStatusBarItem.hide(); // Hide if no seed is set
		}

		console.log(`Seed successfully set and saved: ${currentSeed}`);
	};

	// --- 3. Listen for changes from the side panel ---
    // --- MODIFIED: Listen for the new event from the provider ---
    provider.onSeedChangeRequested(newSeedValue => {
        // Our centralized function handles the update, whether it's a new seed or an empty string.
        updateSeed(newSeedValue);
        // console.log(`Seed updated from panel: ${currentSeed}`);
    });


    //  --- 🔒 Register the Encrypt File Command ---
    const encryptFileCommand = vscode.commands.registerCommand('myvsread.encryptFile', async () => {
		// Use a local variable for this specific operation
		let seedForOperation = currentSeed;

		// If no seed is set, ask the user with a dialog box
		if (!seedForOperation) {
			const seedFromDialog = await vscode.window.showInputBox({
				prompt: 'Enter seed to encrypt file',
				password: true, // Hides the text
				placeHolder: 'Using default seed if left empty'
			});

			// If the user entered something, use it. Otherwise, use the default.
			if (!seedFromDialog) {
		            vscode.window.showWarningMessage('MyVsRead: No seed entered, going with default seed of 00.');
		            return;
		        }
			seedForOperation = seedFromDialog || DEFAULT_SEED;

			// IMPORTANT: Update the global state and the side panel UI
			updateSeed(seedForOperation);
		}

        // This ensures that even if the 'if' block was skipped, the UI is
        // synced to the correct state, overwriting any unsaved user input.
        provider.updateSeed(seedForOperation);

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('MyVsRead: No active text editor to encrypt.');
			return;
		}

        // const seed = await vscode.window.showInputBox({
        //     prompt: 'Enter seed for encryption',
        //     password: true
        // });

        

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
		let seedForOperation = currentSeed;

		if (!seedForOperation) {
			const seedFromDialog = await vscode.window.showInputBox({
				prompt: 'Enter seed to decrypt file',
				password: true,
				placeHolder: 'Using default seed if left empty'
			});
			if (!seedFromDialog) {
		            vscode.window.showWarningMessage('MyVsRead: No seed entered, going with default seed of 00.');
		            return;
		        }
			seedForOperation = seedFromDialog || DEFAULT_SEED;
			updateSeed(seedForOperation); // Update after dialog interaction
		}

        // Also add the sync call here for consistency.
        provider.updateSeed(seedForOperation);
		
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('MyVsRead: No active text editor to decrypt.');
			return;
		}

        // const seed = await vscode.window.showInputBox({
        //     prompt: 'Enter seed to decrypt',
        //     password: true
        // });

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
    
    // --- NEW: Register the command for the Status Bar Item ---
    let showSidePanelCommand = vscode.commands.registerCommand('myvsread.showSidePanel', () => {
	vscode.commands.executeCommand('workbench.view.extension.myvsread-sidebar');
    });
    context.subscriptions.push(showSidePanelCommand);
    
    // --- NEW: Set initial status bar state ---
    // --- NEW: Load the saved seed when the extension starts ---
    // If the seed is empty on activation (first load), hide it.
    // Otherwise, show the default or previously set seed.
    const savedSeed = context.globalState.get<string>(SEED_STORAGE_KEY);
    if (savedSeed) {
            // If we found a saved seed, use our master function to set it on sidfe panel and status bar
            updateSeed(savedSeed);
    } else {
    	    // Otherwise, ensure the status bar is hidden initially
	    seedStatusBarItem.hide();
    }

}

export function deactivate() {
	// --- NEW: Dispose the status bar item when the extension deactivates ---
	seedStatusBarItem.dispose();
}