const vscode = require('vscode');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

function activate(context) {
    console.log('Build in Public Bot extension activated');

    // Check if CLI is installed
    exec('which bip', (error) => {
        if (error) {
            vscode.window.showWarningMessage(
                'Build in Public Bot CLI not found. Please install with: npm install -g build-in-public-bot'
            );
        }
    });

    // Screenshot current file
    let screenshotCommand = vscode.commands.registerCommand('bip.screenshot', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const document = editor.document;
        if (!document.fileName) {
            vscode.window.showErrorMessage('Please save the file first');
            return;
        }

        const config = vscode.workspace.getConfiguration('bip');
        const cmd = buildCommand('ss', document.fileName, config);

        vscode.window.showInformationMessage('Generating screenshot...');
        
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Error: ${stderr || error.message}`);
                return;
            }
            
            // Extract path from output
            const pathMatch = stdout.match(/Screenshot saved to:\s*(.+)/);
            if (pathMatch) {
                const screenshotPath = pathMatch[1].trim();
                vscode.window.showInformationMessage(
                    `📷 Screenshot saved!`,
                    'Copy Path',
                    'Open'
                ).then(selection => {
                    if (selection === 'Copy Path') {
                        vscode.env.clipboard.writeText(screenshotPath);
                    } else if (selection === 'Open') {
                        vscode.env.openExternal(vscode.Uri.file(screenshotPath));
                    }
                });
            } else {
                vscode.window.showInformationMessage('Screenshot generated!');
            }
        });
    });

    // Screenshot selection
    let screenshotSelectionCommand = vscode.commands.registerCommand('bip.screenshotSelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showErrorMessage('No selection');
            return;
        }

        const document = editor.document;
        const config = vscode.workspace.getConfiguration('bip');
        
        // Save selection to temp file
        const text = document.getText(selection);
        const ext = path.extname(document.fileName);
        const tempFile = path.join(__dirname, `temp${Date.now()}${ext}`);
        
        fs.writeFileSync(tempFile, text);
        
        const cmd = buildCommand('ss', tempFile, config);
        
        vscode.window.showInformationMessage('Generating screenshot...');
        
        exec(cmd, (error, stdout) => {
            fs.unlinkSync(tempFile); // Clean up temp file
            
            if (error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
                return;
            }
            
            vscode.window.showInformationMessage('📷 Screenshot generated!');
        });
    });

    // Post to Twitter
    let postCommand = vscode.commands.registerCommand('bip.post', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const document = editor.document;
        if (!document.fileName) {
            vscode.window.showErrorMessage('Please save the file first');
            return;
        }

        const caption = await vscode.window.showInputBox({
            prompt: 'Enter tweet caption',
            placeHolder: 'Working on something cool...'
        });

        if (!caption) return;

        const config = vscode.workspace.getConfiguration('bip');
        const cmd = buildCommand('code', document.fileName, config, caption);

        vscode.window.showInformationMessage('Posting to Twitter...');
        
        exec(cmd, (error, stdout) => {
            if (error) {
                vscode.window.showErrorMessage(`Error: ${error.message}`);
                return;
            }
            
            vscode.window.showInformationMessage('🐦 Posted to Twitter!');
        });
    });

    // Set theme
    let setThemeCommand = vscode.commands.registerCommand('bip.setTheme', async () => {
        const themes = [
            'dracula',
            'github-dark',
            'tokyo-night',
            'nord',
            'one-dark',
            'monokai-pro',
            'catppuccin-mocha',
            'synthwave-84',
            'gruvbox-dark',
            'ayu-dark'
        ];

        const selected = await vscode.window.showQuickPick(themes, {
            placeHolder: 'Select a theme'
        });

        if (selected) {
            const config = vscode.workspace.getConfiguration('bip');
            await config.update('theme', selected, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Theme set to: ${selected}`);
        }
    });

    context.subscriptions.push(
        screenshotCommand,
        screenshotSelectionCommand,
        postCommand,
        setThemeCommand
    );
}

function buildCommand(command, file, config, caption) {
    let cmd = `bip ${command} "${file}"`;
    
    if (caption) {
        cmd += ` "${caption}"`;
    }
    
    cmd += ` -t ${config.get('theme')}`;
    
    if (config.get('showLineNumbers')) {
        cmd += ' -n';
    }
    
    if (config.get('fontSize')) {
        cmd += ` -s ${config.get('fontSize')}`;
    }
    
    if (config.get('copyToClipboard')) {
        cmd += ' -c';
    }
    
    if (!config.get('windowControls')) {
        cmd += ' --no-window';
    }
    
    return cmd;
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};