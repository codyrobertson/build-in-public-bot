# CLI Standardization Design

## New Command Hierarchy

### 1. Core Content Commands
```bash
# Post and content generation
bip post <message>                    # Generate and post tweet
bip draft <message>                   # Generate draft without posting
bip code <file> [caption]             # Post code screenshot
bip screenshot <file>                 # Generate screenshot only

# Batch operations
bip post --batch <file>               # Post multiple messages from file
bip screenshot --glob "src/**/*.ts"   # Batch screenshot generation
```

### 2. Configuration Management
```bash
# Configuration commands
bip config init                       # Interactive setup
bip config show                       # Show current config
bip config get <key>                  # Get specific value
bip config set <key> <value>          # Set specific value
bip config validate                   # Validate current config
bip config export [file]              # Export config
bip config import <file>              # Import config

# Theme and style management
bip theme list                        # List available themes
bip theme show <name>                 # Show theme details
bip theme set <name>                  # Set current theme
bip style configure                   # Interactive style setup
```

### 3. Content Management
```bash
# History and drafts
bip history [--limit=10]              # View post history
bip drafts list                       # List saved drafts
bip drafts show <id>                  # Show draft content
bip drafts post <id>                  # Post a draft
bip drafts delete <id>                # Delete a draft
```

### 4. Automation & Monitoring
```bash
# Watching and automation
bip watch [path] [--auto]             # Watch for changes
bip auto start                        # Start automation daemon
bip auto stop                         # Stop automation daemon
bip auto status                       # Show automation status
bip summary [--days=7]                # Generate project summary
```

### 5. Setup & Validation
```bash
# Setup and validation
bip setup api                         # Setup Twitter API
bip setup browser                     # Setup browser auth
bip validate config                   # Validate configuration
bip validate auth                     # Validate authentication
bip doctor                            # Run all health checks
```

### 6. Utility Commands
```bash
# Utilities
bip completion [shell]                # Generate completion scripts
bip version                           # Show version info
bip help [command]                    # Show help
bip debug <command>                   # Run command in debug mode
```

## Global Options

All commands support these global options:
```bash
-v, --verbose                         # Verbose output
-q, --quiet                           # Quiet output (errors only)
-d, --debug                           # Debug mode
--dry-run                             # Show what would be done
--config <file>                       # Use custom config file
--no-color                            # Disable colored output
--json                                # Output in JSON format
```

## Command Patterns

### 1. Consistent Option Naming
- Use kebab-case for all flags: `--dry-run`, `--no-confirm`
- Use single letter shortcuts: `-v`, `-q`, `-d`
- Use positive flags when possible: `--confirm` instead of `--no-confirm`

### 2. Subcommand Structure
- Group related commands: `bip config`, `bip theme`, `bip drafts`
- Use verbs for actions: `list`, `show`, `set`, `delete`
- Use nouns for resources: `config`, `theme`, `drafts`

### 3. Interactive vs Non-Interactive
- Default to interactive prompts
- Support non-interactive with full options
- Add `--yes` flag to skip confirmations

### 4. Error Handling
- Consistent error codes
- Rich error messages with suggestions
- Context-aware help

## Implementation Plan

### Phase 1: Core Restructure
1. Standardize existing commands
2. Add missing global options
3. Implement config subcommands

### Phase 2: Enhanced Features
1. Add completion support
2. Implement batch operations
3. Add validation commands

### Phase 3: Advanced Features
1. Add plugin architecture
2. Implement hooks system
3. Add telemetry and analytics

## Backward Compatibility

Maintain compatibility with existing commands during transition:
- Keep current command names as aliases
- Add deprecation warnings
- Provide migration guide