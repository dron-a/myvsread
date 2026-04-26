import * as vscode from 'vscode';

export class SidePanelViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'myvsread.sidePanel';
	private _view?: vscode.WebviewView;

	// --- NEW: Add a variable to hold the seed within the provider ---
	private _currentSeed: string = '';

	// We'll rename this event to be more specific. It now fires on "Set" or "Reset".
	private _onSeedChangeRequested: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
	public readonly onSeedChangeRequested: vscode.Event<string> = this._onSeedChangeRequested.event;

	constructor(private readonly _extensionUri: vscode.Uri) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		// Set options for the webview
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		// Set the HTML, which will now use the stored seed displayed in the view
		webviewView.webview.html = this._getHtmlForWebview();

		// Listen for messages from the webview (Set/Reset button clicks)
		// *** THIS IS THE NEW, CORRECT PLACE FOR THE LISTENER ***
		webviewView.webview.onDidReceiveMessage(message => {
			switch (message.command) {
				case 'setSeed':
					// The user wants to save a new seed.
					this._currentSeed = message.text;
					this._onSeedChangeRequested.fire(message.text);
					vscode.window.showInformationMessage("Seed has been set.");
					return;
				case 'resetSeed':
					// The user wants to clear the seed.
					this._currentSeed = '';
					this._onSeedChangeRequested.fire('');
					vscode.window.showInformationMessage("Seed has been reset.");
					return;
			}
		});
	}

	// This is the new public method to send messages TO the webview
	public updateSeed(seed: string) {
		// Update our internal value
		this._currentSeed = seed;

		// If the view exists, send it a message to update its input box
		if (this._view) {
			this._view.webview.postMessage({ command: 'updateSeed', text: seed });
		}
	}

	// --- MODIFIED: The HTML now uses the provider's seed variable on creation ---
	private _getHtmlForWebview() {
		// We can now directly inject the current seed value into the HTML when it's created.
		// The 'value' attribute of the input tag will be pre-filled.
		// Nonce for security
		const nonce = getNonce();
		
		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>MyVsRead Panel</title>
            <style>
                body {
                    padding: 0 10px;
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    color: var(--vscode-foreground);
                }

                .input-group {
                    margin-top: 20px;
                }

                .input-container {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }

                label {
                    display: block;
                    margin-bottom: 5px;
                    color: var(--vscode-foreground);
                }

                input {
                    flex-grow: 1;
                    padding: 8px;
                    border: 1px solid var(--vscode-input-border, #555);
                    border-radius: 4px;
                    /* Matches your specific dark hex codes while remaining compatible */
                    background-color: var(--vscode-input-background, #3c3c3c);
                    color: var(--vscode-input-foreground, #eee);
                    outline: none;
                }

                input:focus {
                    border: 1px solid var(--vscode-focusBorder);
                }

                .button-group {
                    display: flex;
                    gap: 10px;
                    margin-top: 10px;
                }

                button {
                    padding: 8px 12px;
                    border: none;
                    border-radius: 2px;
                    cursor: pointer;
                    text-align: center;
                }

                #set-button {
                    background-color: #0e639c;
                    color: white;
                }

                #set-button:hover {
                    background-color: #1177bb;
                }

                #reset-button {
                    background-color: #5f6368;
                    color: white;
                }

                #reset-button:hover {
                    background-color: #6c7177;
                }

                #toggle-visibility {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: var(--vscode-icon-foreground, #ccc);
                    font-size: 1.5em;
                    padding: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            </style>
		</head>
		<body>
			<h3>Seed Configuration</h3>
			<div class="input-container">
				<input type="password" id="seed-input" placeholder="Enter seed..." value="${this._currentSeed}" />
				<button id="toggle-visibility">👁️</button>
			</div>

			<div class="button-group">
				<button id="set-button">Set Seed</button>
				<button id="reset-button">Reset Seed</button>
			</div>
			
			<script nonce="${nonce}">
			// Get a reference to the VS Code API
				const vscode = acquireVsCodeApi();
				const seedInput = document.getElementById('seed-input');
				const setButton = document.getElementById('set-button');
				const resetButton = document.getElementById('reset-button');
				const toggleButton = document.getElementById('toggle-visibility');

				// --- Set/Reset Button Logic ---
				setButton.addEventListener('click', () => {
					vscode.postMessage({
						command: 'setSeed',
						text: seedInput.value
					});
				});

				resetButton.addEventListener('click', () => {
					// We can clear the input box immediately for good UX
					seedInput.value = '';
					vscode.postMessage({
						command: 'resetSeed'
					});
				});

				// --- Show/Hide Toggle Logic ---
				toggleButton.addEventListener('click', () => {
					const isPassword = seedInput.type === 'password';
					if (isPassword) {
						seedInput.type = 'text';
						toggleButton.textContent = '🙈';
					} else {
						seedInput.type = 'password';
						toggleButton.textContent = '👁️';
					}
				});

				// --- Revert unsaved changes logic ---
				window.addEventListener('message', event => {
					const message = event.data;
					if (message.command === 'updateSeed') {
						seedInput.value = message.text;
					}
				});
			</script>
		</body>
		</html>`;
	}
}

// Security function to generate a nonce
function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}