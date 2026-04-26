import * as vscode from 'vscode';

export class SidePanelViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'myvsread.sidePanel';
    private _view?: vscode.WebviewView;

    private _onSeedChanged: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
	public readonly onSeedChanged: vscode.Event<string> = this._onSeedChanged.event;

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

		// Set the HTML content that will be displayed in the view
		webviewView.webview.html = this._getHtmlForWebview();

		// *** THIS IS THE NEW, CORRECT PLACE FOR THE LISTENER ***
		webviewView.webview.onDidReceiveMessage(message => {
			if (message.command === 'seedChanged') {
			// When we get a message, fire our event with the new seed text
				this._onSeedChanged.fire(message.text);
			}
		});
	}

	// This is the new public method to send messages TO the webview
	public updateSeed(seed: string) {
		if (this._view) {
			this._view.webview.postMessage({ command: 'updateSeed', text: seed });
		}
	}

	private _getHtmlForWebview() {
		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Side Panel</title>
			<style>
				body {
					padding: 0 10px;
					font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
				}
				.input-group {
					margin-top: 20px;
				}
				label {
					display: block;
					margin-bottom: 5px;
				}
				input {
					width: 95%;
					padding: 8px;
					border: 1px solid #555;
					border-radius: 4px;
					background-color: #3c3c3c;
					color: #eee;
				}
			</style>
		</head>
		<body>
			<h3>Input Panel</h3>
	
			<div class="input-group">
				<label for="seed-input">Enter Seed</label>
				<input type="text" id="seed-input" placeholder="Enter your seed value here" />
			</div>
			
        <script>
		    // Get a reference to the VS Code API
		    const vscode = acquireVsCodeApi();

		    const seedInput = document.getElementById('seed-input');

		    // Listen for any input in the text box
		    seedInput.addEventListener('input', (event) => {
		        // const seedValue = event.target.value;

		        // Send a message to the extension host with the new seed value
		        vscode.postMessage({
		            command: 'seedChanged',
		            text: event.target.value
		        });
		    });

		   // *** THIS IS THE NEW PART ***
		   // Listen for messages FROM the extension
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