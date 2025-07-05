# Build-in-Public Bot Screenshot Guide

## Overview

The Build-in-Public Bot provides powerful code screenshot functionality using Carbon.sh API, with extensive customization options for creating beautiful code screenshots to share on Twitter.

## Basic Usage

### Generate and post a code screenshot:
```bash
bip code <file> [caption]
```

### Preview screenshot without posting:
```bash
bip screenshot <file>
```

## Features

### 1. Line Range Selection

Capture specific lines from your code file:

```bash
# Single line
bip screenshot app.js --lines 42

# Line range
bip screenshot app.js --lines 10-25

# From line to end
bip screenshot app.js --lines 50-
```

### 2. Language Detection

The bot automatically detects programming languages based on file extensions:

- **JavaScript/TypeScript**: `.js`, `.jsx`, `.ts`, `.tsx`
- **Python**: `.py`
- **Java**: `.java`
- **C/C++**: `.c`, `.cpp`
- **Go**: `.go`
- **Rust**: `.rs`
- **Ruby**: `.rb`
- **PHP**: `.php`
- **Swift**: `.swift`
- **And many more...**

### 3. Theme Customization

Choose from 25+ beautiful themes:

```bash
# Popular themes
bip screenshot code.py --theme dracula
bip screenshot code.js --theme nord
bip screenshot code.rs --theme one-dark
bip screenshot code.go --theme monokai

# List all available themes
bip screenshot any-file --list-themes
```

Available themes include:
- `dracula`, `nord`, `one-dark`, `monokai`, `material`
- `cobalt`, `blackboard`, `duotone-dark`, `hopscotch`
- `lucario`, `nightowl`, `oceanic-next`, `one-light`
- `panda-syntax`, `paraiso-dark`, `seti`, `shades-of-purple`
- `solarized dark`, `solarized light`, `synthwave84`
- `twilight`, `verminal`, `vscode`, `yeti`, `zenburn`

### 4. Background Customization

Set custom background colors:

```bash
# Hex colors
bip screenshot code.js --bg "#1e1e1e"
bip screenshot code.py --bg "#2d2d2d"

# RGBA colors
bip screenshot code.tsx --bg "rgba(30, 30, 30, 1)"
bip screenshot code.go --bg "rgba(0, 0, 0, 0.95)"
```

### 5. Line Numbers

Show or hide line numbers:

```bash
# Show line numbers
bip screenshot complex-algorithm.py --line-numbers

# Line numbers are hidden by default
```

### 6. Window Controls

Toggle window decoration:

```bash
# Hide window controls (traffic lights)
bip screenshot minimal.js --no-window

# Window controls are shown by default
```

### 7. Font Customization

Change font family and size:

```bash
# Different fonts
bip screenshot code.js --font "Monaco"
bip screenshot code.py --font "Menlo"
bip screenshot code.go --font "Source Code Pro"

# Font sizes
bip screenshot code.tsx --font-size 16px
bip screenshot code.rs --font-size 12px
```

### 8. Line Wrapping

Control how long lines are handled:

```bash
# Disable line wrapping (horizontal scroll)
bip screenshot long-lines.js --no-wrap

# Custom width with wrapping
bip screenshot code.py --width 800

# Line wrapping is enabled by default
```

### 9. Preview Options

For the `screenshot` command (preview only):

```bash
# Open in default image viewer
bip screenshot code.js --open

# Just save without opening
bip screenshot code.py
```

## Example Commands

### Beautiful Python snippet with line numbers:
```bash
bip code algorithm.py "Just implemented a blazing fast binary search! 🚀" \
  --lines 5-20 \
  --theme dracula \
  --line-numbers
```

### Minimal JavaScript function:
```bash
bip code utils.js "Clean code is beautiful code ✨" \
  --lines 10-25 \
  --theme nord \
  --no-window \
  --font-size 14px
```

### React component with custom styling:
```bash
bip code Button.tsx "New reusable component for the design system 🎨" \
  --theme one-dark \
  --bg "#282c34" \
  --font "Fira Code"
```

### Wide code without wrapping:
```bash
bip code data-processing.py "Complex data pipeline visualization 📊" \
  --no-wrap \
  --width 1000 \
  --theme monokai
```

## Tips and Best Practices

1. **Choose appropriate line ranges**: Select meaningful code sections that tell a story
2. **Match theme to your brand**: Use consistent themes for recognizable posts
3. **Use line numbers for tutorials**: Helps when explaining specific parts
4. **Consider readability**: Larger font sizes work better on mobile
5. **Preview before posting**: Use `bip screenshot` to test different options

## Configuration

Default screenshot settings can be configured in `~/.bip/config.yml`:

```yaml
screenshots:
  theme: "dracula"
  backgroundColor: "rgba(30, 30, 30, 1)"
  windowTheme: "none"
  padding: 32
  language: "auto"
```

## Troubleshooting

- **Screenshot too wide**: Use `--width` to set a specific width or enable line wrapping
- **Code not syntax highlighted**: Check file extension or specify language in config
- **Theme not working**: Use `--list-themes` to see available options
- **Background color issues**: Use quoted strings for colors with spaces

## Integration with AI Captions

When using `bip code` without a caption, the AI will analyze your code and generate an appropriate tweet based on:
- The programming language
- Code complexity and patterns
- Your configured style preferences
- Context from file name and content

This creates engaging tweets that highlight what makes your code interesting!