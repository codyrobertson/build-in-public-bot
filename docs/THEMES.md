# Theme Documentation

Build-in-Public Bot uses a comprehensive theme system for syntax highlighting in code screenshots. Themes are defined in TOML format and support extensive customization.

## Using Themes

### Built-in Themes

The following themes are available out of the box:

- **Dracula** - Popular dark theme with vibrant colors
- **GitHub Dark** - GitHub's official dark theme
- **Tokyo Night** - Clean, modern dark theme
- **Nord** - Arctic, north-bluish color palette
- **One Dark** - Atom's iconic dark theme
- **Monokai Pro** - Enhanced version of the classic Monokai
- **Catppuccin Mocha** - Soothing pastel dark theme
- **Synthwave 84** - Retro cyberpunk aesthetics
- **Gruvbox Dark** - Retro groove color scheme
- **Ayu Dark** - Simple and elegant

### Using a Theme

```bash
# Use theme by name
bip screenshot file.js -t dracula
bip ss file.py -t "tokyo night"  # Spaces are supported
bip shot file.ts -t github-dark  # Hyphens work too

# List all available themes
bip screenshot --list-themes

# Get detailed theme information
bip screenshot --theme-info dracula
```

## Creating Custom Themes

### Theme Structure

Create a `.toml` file in the `.bip-themes` directory in your project root:

```toml
# .bip-themes/my-theme.toml
name = "My Custom Theme"
author = "Your Name"
variant = "dark"  # or "light"

# Core colors (all required)
background = "#1e1e1e"
foreground = "#d4d4d4"
cursor = "#ffffff"
selection = "#264f78"
currentLine = "#2a2a2a"
lineNumber = "#858585"

# Base syntax colors (all required)
comment = "#6a9955"
string = "#ce9178"
number = "#b5cea8"
keyword = "#569cd6"
operator = "#d4d4d4"
function = "#dcdcaa"
variable = "#9cdcfe"
constant = "#4fc1ff"
type = "#4ec9b0"
class = "#4ec9b0"

# Extended syntax colors (all required)
property = "#9cdcfe"
attribute = "#c586c0"
tag = "#569cd6"
regexp = "#d16969"
punctuation = "#d4d4d4"
decorator = "#dcdcaa"

# Language-specific markup (optional)
[markup]
heading = "#569cd6"
bold = "#ce9178"
italic = "#c586c0"
link = "#4ec9b0"
code = "#dcdcaa"
quote = "#6a9955"
list = "#d16969"

# Diff colors (optional)
[diff]
added = "#4ec9b0"
removed = "#d16969"
changed = "#e3c78a"

# UI elements (optional)
[ui]
error = "#f44747"
warning = "#ff8800"
info = "#4fc1ff"
success = "#89d185"
```

### Color Guidelines

1. **Contrast**: Ensure sufficient contrast between `background` and `foreground`
2. **Consistency**: Related elements should use similar hues
3. **Readability**: Test with different programming languages
4. **Accessibility**: Consider colorblind users

### Theme Fields

#### Required Fields

- `name`: Display name of the theme
- `author`: Theme creator (optional but recommended)
- `variant`: Either "dark" or "light"

#### Core Colors

- `background`: Main background color
- `foreground`: Default text color
- `cursor`: Cursor color (not used in screenshots)
- `selection`: Selected text background
- `currentLine`: Current line highlight
- `lineNumber`: Line number color

#### Syntax Colors

All syntax colors are required:

- `comment`: Comments and documentation
- `string`: String literals
- `number`: Numeric literals
- `keyword`: Language keywords (if, for, return)
- `operator`: Operators (+, -, =, etc.)
- `function`: Function/method names
- `variable`: Variable names
- `constant`: Constants and enums
- `type`: Type annotations
- `class`: Class names
- `property`: Object properties
- `attribute`: HTML/XML attributes
- `tag`: HTML/XML tags
- `regexp`: Regular expressions
- `punctuation`: Brackets, semicolons, etc.
- `decorator`: Decorators/annotations

#### Optional Sections

**Markup** - For Markdown, HTML, etc:
- `heading`: Headings
- `bold`: Bold text
- `italic`: Italic text
- `link`: Hyperlinks
- `code`: Inline code
- `quote`: Blockquotes
- `list`: List markers

**Diff** - For git diffs:
- `added`: Added lines
- `removed`: Removed lines
- `changed`: Changed lines

**UI** - For error messages:
- `error`: Error highlights
- `warning`: Warning highlights
- `info`: Info highlights
- `success`: Success highlights

## Contributing Themes

To contribute a theme to the project:

1. Create your theme following the structure above
2. Test it with various code samples
3. Place it in `src/themes/` directory
4. Submit a pull request

### Testing Your Theme

```bash
# Test with different languages
bip ss examples/test.js -t my-theme
bip ss examples/test.py -t my-theme
bip ss examples/test.tsx -t my-theme

# Test with line numbers
bip ss file.js -t my-theme -n

# Test different backgrounds
bip ss file.js -t my-theme -b "#2d2d2d"
```

## Tips for Theme Creation

1. **Start with an existing theme**: Copy a built-in theme and modify
2. **Use a color picker**: Tools like coolors.co help create palettes
3. **Test readability**: Ensure all token types are distinguishable
4. **Consider context**: Some colors work better on certain backgrounds
5. **Version control**: Keep your themes in git for easy sharing

## Troubleshooting

### Theme not loading
- Check file extension is `.toml`
- Verify all required fields are present
- Check for TOML syntax errors
- Look at console output with `-d` debug flag

### Colors not appearing correctly
- Ensure color format is `#RRGGBB` (6-digit hex)
- Check color contrast ratios
- Verify the theme variant matches your expectation

### Custom theme directory
By default, themes are loaded from `.bip-themes/` in your project root. This can't be changed currently but may be configurable in future versions.