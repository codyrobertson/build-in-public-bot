# Editor Plugins for Build in Public Bot

This directory contains editor plugins that integrate Build in Public Bot with popular code editors and IDEs.

## Installation

First, ensure you have the Build in Public Bot CLI installed globally:

```bash
npm install -g build-in-public-bot
```

## Available Plugins

### Vim Plugin

The Vim plugin provides commands and keybindings for generating screenshots and posting to Twitter.

#### Installation

1. Copy the plugin file to your Vim plugins directory:
   ```bash
   cp vim/bip.vim ~/.vim/plugin/
   ```

2. Or if using a plugin manager like vim-plug:
   ```vim
   Plug 'yourusername/build-in-public-bot', { 'rtp': 'editor-plugins/vim' }
   ```

#### Usage

- `<leader>bs` - Screenshot current file/selection
- `<leader>bp` - Post current file to Twitter
- `:BipScreenshot` - Screenshot entire file
- `:BipScreenshotSelection` - Screenshot visual selection
- `:BipPost "caption"` - Post with caption

#### Configuration

```vim
" Set default theme
let g:bip_theme = 'tokyo-night'

" Enable/disable line numbers
let g:bip_line_numbers = 1

" Set font size
let g:bip_font_size = '16px'

" Auto copy to clipboard
let g:bip_copy_to_clipboard = 1
```

### Emacs Plugin

The Emacs plugin provides a minor mode with commands for Build in Public Bot integration.

#### Installation

1. Add to your Emacs configuration:
   ```elisp
   (add-to-list 'load-path "/path/to/build-in-public-bot/editor-plugins/emacs")
   (require 'bip)
   (global-bip-mode 1)
   ```

2. Or using use-package:
   ```elisp
   (use-package bip
     :load-path "/path/to/build-in-public-bot/editor-plugins/emacs"
     :config
     (global-bip-mode 1))
   ```

#### Usage

- `C-c b s` - Screenshot file
- `C-c b r` - Screenshot region
- `C-c b b` - Screenshot buffer
- `C-c b p` - Post code
- `C-c b P` - Post region
- `C-c b t` - Set theme
- `C-c b l` - List themes

#### Configuration

```elisp
;; Set default theme
(setq bip-theme "synthwave-84")

;; Enable line numbers
(setq bip-line-numbers t)

;; Set font size
(setq bip-font-size "16px")

;; Auto copy to clipboard
(setq bip-copy-to-clipboard t)
```

### VS Code Extension

The VS Code extension provides commands, keybindings, and context menu integration.

#### Installation

1. Copy the extension folder to VS Code extensions directory:
   ```bash
   cp -r vscode ~/.vscode/extensions/build-in-public-bot
   ```

2. Restart VS Code

#### Usage

- `Cmd/Ctrl+Shift+S` - Screenshot current file
- `Cmd/Ctrl+Shift+Alt+S` - Screenshot selection
- Right-click menu → "BIP: Screenshot" options
- Command palette → "BIP: " commands

#### Configuration

In VS Code settings:

```json
{
  "bip.theme": "dracula",
  "bip.showLineNumbers": true,
  "bip.fontSize": "14px",
  "bip.copyToClipboard": true,
  "bip.windowControls": true
}
```

### IntelliJ IDEA Plugin

Coming soon...

### Sublime Text Plugin

Coming soon...

### Atom Plugin

Coming soon...

## Server Mode

For better integration, you can run Build in Public Bot in server mode:

```bash
bip server
# or
bip server --port 3456
```

This starts a local server that editors can communicate with for faster screenshot generation and real-time updates.

### Server API

- `GET /health` - Health check
- `GET /themes` - List available themes
- `POST /screenshot` - Generate screenshot
- `POST /post` - Post to Twitter
- WebSocket connection for real-time updates

### Request Format

```json
{
  "code": "const hello = 'world';",
  "language": "javascript",
  "theme": "dracula",
  "options": {
    "lineNumbers": true,
    "fontSize": "16px",
    "windowControls": true,
    "backgroundColor": "#282a36",
    "width": 800
  }
}
```

## Creating Your Own Plugin

To create a plugin for your favorite editor:

1. **CLI Integration**: Use the `bip` CLI commands
2. **Server Integration**: Connect to the BIP server for better performance
3. **Features to implement**:
   - Screenshot current file
   - Screenshot selection
   - Post to Twitter with caption
   - Theme selection
   - Configuration options

### Example CLI Commands

```bash
# Screenshot file
bip ss file.js -t dracula -n -c

# Screenshot with line range
bip ss file.js -l 10-20 -t nord

# Post to Twitter
bip code file.js "Working on something cool" -t tokyo-night

# List themes
bip ss --list
```

### Example Server Request (Node.js)

```javascript
const axios = require('axios');

// Generate screenshot
const response = await axios.post('http://localhost:3456/screenshot', {
  code: 'const hello = "world";',
  language: 'javascript',
  theme: 'dracula',
  options: {
    lineNumbers: true
  }
});

console.log(response.data.path); // Screenshot path
```

## Contributing

We welcome contributions! Please submit pull requests with new editor plugins or improvements to existing ones.

### Plugin Guidelines

1. Check if CLI is installed
2. Provide visual feedback during operations
3. Handle errors gracefully
4. Support configuration options
5. Include keybindings and menu items
6. Document usage and configuration

## Support

For issues or questions:
- GitHub Issues: [https://github.com/yourusername/build-in-public-bot/issues]
- Documentation: [https://github.com/yourusername/build-in-public-bot#readme]