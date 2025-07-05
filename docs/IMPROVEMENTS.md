# Recent Improvements

## Theme System Overhaul

### What Changed
- **Removed Gogh themes**: Completely replaced the Gogh theme system with our own comprehensive theme format
- **TOML format**: Themes are now defined in TOML files for better readability and maintainability
- **10 Built-in themes**: Created high-quality themes optimized for code syntax highlighting
- **Comprehensive token mapping**: Added support for 40+ syntax tokens with proper fallbacks

### New Features

#### Shorter Command Aliases
```bash
# Screenshot command
bip ss file.js         # Short for 'screenshot'
bip shot file.py       # Alternative alias

# Code command  
bip c file.js "caption"  # Short for 'code'

# Shorter option flags
-n                     # --line-numbers
-s 16px               # --size (font size)
-t dracula            # --theme
-b "#1e1e1e"          # --bg (background)
-w 800                # --width
-o                    # --open
-l 1-20               # --lines
```

#### Theme Management
```bash
# List all themes
bip ss --list

# Get theme details  
bip ss --info dracula
bip ss --info "tokyo night"
```

### Available Themes

1. **Dracula** - Popular dark theme with vibrant colors
2. **GitHub Dark** - GitHub's official dark theme
3. **Tokyo Night** - Clean, modern dark theme
4. **Nord** - Arctic, north-bluish color palette
5. **One Dark** - Atom's iconic dark theme
6. **Monokai Pro** - Enhanced version of classic Monokai
7. **Catppuccin Mocha** - Soothing pastel dark theme
8. **Synthwave 84** - Retro cyberpunk aesthetics
9. **Gruvbox Dark** - Retro groove color scheme
10. **Ayu Dark** - Simple and elegant

### Custom Themes

Users can create custom themes by placing `.toml` files in `.bip-themes/` directory. See [THEMES.md](./THEMES.md) for documentation.

### Technical Improvements

1. **High-resolution output**: 2x scaling for crisp text on retina displays
2. **Improved line wrapping**: Preserves syntax highlighting when wrapping long lines
3. **Better syntax highlighting**: Switched from Prism.js to Highlight.js for better Node.js compatibility
4. **Comprehensive token support**: All highlight.js tokens are properly mapped to theme colors

### Theme Structure

Each theme now supports:
- Core colors (background, foreground, selection, etc.)
- Base syntax colors (comment, string, keyword, function, etc.)
- Extended syntax colors (property, attribute, tag, regexp, etc.)
- Language-specific markup colors (optional)
- Diff colors (optional)
- UI elements (error, warning, info, success)

### Example Usage

```bash
# Basic screenshot
bip ss mycode.js -t dracula -n

# With custom options
bip ss script.py -t "tokyo night" -n -s 16px -w 1000 -l 10-30

# Quick shot with synthwave theme
bip shot app.tsx -t synthwave-84 -o
```