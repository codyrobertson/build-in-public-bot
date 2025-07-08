import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';
import { handleError } from '../utils/errors';

export const completionCommand = new Command('completion')
  .description('Generate shell completion scripts')
  .argument('[shell]', 'Shell type (bash, zsh, fish)', 'bash')
  .option('--save', 'Save to appropriate shell config file')
  .action(async (shell: string, options) => {
    try {
      const script = generateCompletionScript(shell);
      
      if (options.save) {
        await saveCompletionScript(shell, script);
        console.log(chalk.green(`✓ Completion script saved for ${shell}`));
        console.log(chalk.dim(`Restart your shell or run: source ~/.${getShellRcFile(shell)}`));
      } else {
        console.log(script);
        console.log(chalk.dim(`\n# To install, add this to your ~/.${getShellRcFile(shell)}:`));
        console.log(chalk.dim(`# eval "$(bip completion ${shell})"`));
      }
    } catch (error) {
      handleError(error);
    }
  });

function generateCompletionScript(shell: string): string {
  switch (shell) {
    case 'bash':
      return generateBashCompletion();
    case 'zsh':
      return generateZshCompletion();
    case 'fish':
      return generateFishCompletion();
    default:
      throw new Error(`Unsupported shell: ${shell}. Supported shells: bash, zsh, fish`);
  }
}

function generateBashCompletion(): string {
  return `#!/usr/bin/env bash
# bip bash completion script

_bip_completions() {
  local cur prev opts
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  
  # Main commands
  local commands="init post code screenshot draft style history watch summary auto setup-api config doctor completion help"
  
  # Global options
  local global_opts="-v --verbose -q --quiet -d --debug --dry-run --config --no-color --json -V --version -h --help"
  
  # Command-specific options
  case "\${prev}" in
    bip)
      COMPREPLY=( $(compgen -W "\${commands} \${global_opts}" -- \${cur}) )
      return 0
      ;;
    post)
      COMPREPLY=( $(compgen -W "-n --no-confirm" -- \${cur}) )
      return 0
      ;;
    code)
      COMPREPLY=( $(compgen -W "-l --lines -n --no-confirm" -- \${cur}) )
      return 0
      ;;
    screenshot)
      local screenshot_opts="-o --output -t --theme -s --shader -l --lines --glob --output-dir --list-themes --list-shaders --width --font-size --no-window-controls --line-numbers --padding"
      COMPREPLY=( $(compgen -W "\${screenshot_opts}" -- \${cur}) )
      return 0
      ;;
    config)
      local config_commands="show get set validate export import reset"
      COMPREPLY=( $(compgen -W "\${config_commands}" -- \${cur}) )
      return 0
      ;;
    history)
      COMPREPLY=( $(compgen -W "-l --limit" -- \${cur}) )
      return 0
      ;;
    draft)
      COMPREPLY=( $(compgen -W "-s --save" -- \${cur}) )
      return 0
      ;;
    watch)
      COMPREPLY=( $(compgen -W "-p --path -a --auto -i --interval" -- \${cur}) )
      return 0
      ;;
    doctor)
      COMPREPLY=( $(compgen -W "--fix --json" -- \${cur}) )
      return 0
      ;;
    --theme|-t)
      local themes="dracula synthwave-84 cyberpunk nord gruvbox-dark"
      COMPREPLY=( $(compgen -W "\${themes}" -- \${cur}) )
      return 0
      ;;
    --shader|-s)
      local shaders="wave-gradient halftone disruptor matrix cyberpunk"
      COMPREPLY=( $(compgen -W "\${shaders}" -- \${cur}) )
      return 0
      ;;
  esac
  
  # File completion for certain options
  case "\${prev}" in
    --config|--output|-o|--output-dir)
      COMPREPLY=( $(compgen -f -- \${cur}) )
      return 0
      ;;
  esac
  
  # Default to file completion
  COMPREPLY=( $(compgen -f -- \${cur}) )
}

complete -F _bip_completions bip
complete -F _bip_completions build-in-public`;
}

function generateZshCompletion(): string {
  return `#compdef bip build-in-public
# bip zsh completion script

_bip() {
  local -a commands
  commands=(
    'init:Initialize build-in-public bot configuration'
    'post:Generate and post a build-in-public tweet'
    'code:Post code screenshot with caption'
    'screenshot:Generate code screenshots'
    'draft:Generate tweet without posting'
    'style:Configure tweet style preferences'
    'history:View recent posts'
    'watch:Watch for code changes and suggest tweets'
    'summary:Generate project summary'
    'auto:Manage automation'
    'setup-api:Setup Twitter API'
    'config:Manage configuration'
    'doctor:Run health checks'
    'completion:Generate shell completion scripts'
    'help:Show help'
  )
  
  local -a global_options
  global_options=(
    '(-v --verbose)'{-v,--verbose}'[verbose output]'
    '(-q --quiet)'{-q,--quiet}'[quiet output (errors only)]'
    '(-d --debug)'{-d,--debug}'[enable debug mode]'
    '--dry-run[show what would be done without executing]'
    '--config[use custom config file]:file:_files'
    '--no-color[disable colored output]'
    '--json[output in JSON format]'
    '(-V --version)'{-V,--version}'[output version number]'
    '(-h --help)'{-h,--help}'[show help]'
  )
  
  case $state in
    commands)
      _describe 'command' commands
      ;;
  esac
  
  case $words[1] in
    post)
      _arguments \
        '-n[skip confirmation before posting]' \
        '--no-confirm[skip confirmation before posting]' \
        ':message:' \
        && return 0
      ;;
    code)
      _arguments \
        '-l[line range to capture]:range:' \
        '--lines[line range to capture]:range:' \
        '-n[skip confirmation before posting]' \
        '--no-confirm[skip confirmation before posting]' \
        ':file:_files' \
        ':caption:' \
        && return 0
      ;;
    screenshot)
      _arguments \
        '-o[output file path]:file:_files' \
        '--output[output file path]:file:_files' \
        '-t[theme to use]:theme:(dracula synthwave-84 cyberpunk nord gruvbox-dark)' \
        '--theme[theme to use]:theme:(dracula synthwave-84 cyberpunk nord gruvbox-dark)' \
        '-s[shader effect]:shader:(wave-gradient halftone disruptor matrix cyberpunk)' \
        '--shader[shader effect]:shader:(wave-gradient halftone disruptor matrix cyberpunk)' \
        '-l[line range]:range:' \
        '--lines[line range]:range:' \
        '--glob[glob pattern]:pattern:' \
        '--output-dir[output directory]:dir:_directories' \
        '--list-themes[list available themes]' \
        '--list-shaders[list available shaders]' \
        '--width[screenshot width]:width:' \
        '--font-size[font size]:size:' \
        '--no-window-controls[hide window controls]' \
        '--line-numbers[show line numbers]' \
        '--padding[outer padding]:padding:' \
        ':file:_files' \
        && return 0
      ;;
    config)
      local -a config_commands
      config_commands=(
        'show:Show current configuration'
        'get:Get a specific configuration value'
        'set:Set a configuration value'
        'validate:Validate current configuration'
        'export:Export configuration to file'
        'import:Import configuration from file'
        'reset:Reset configuration to defaults'
      )
      _arguments '1: :->config_cmd' && return 0
      case $state in
        config_cmd)
          _describe 'config command' config_commands
          ;;
      esac
      ;;
  esac
  
  _arguments $global_options
}

_bip "$@"`;
}

function generateFishCompletion(): string {
  return `# bip fish completion script

# Main commands
complete -c bip -f -n "__fish_use_subcommand" -a "init" -d "Initialize configuration"
complete -c bip -f -n "__fish_use_subcommand" -a "post" -d "Generate and post a tweet"
complete -c bip -f -n "__fish_use_subcommand" -a "code" -d "Post code screenshot"
complete -c bip -f -n "__fish_use_subcommand" -a "screenshot" -d "Generate screenshots"
complete -c bip -f -n "__fish_use_subcommand" -a "draft" -d "Generate tweet without posting"
complete -c bip -f -n "__fish_use_subcommand" -a "style" -d "Configure style preferences"
complete -c bip -f -n "__fish_use_subcommand" -a "history" -d "View recent posts"
complete -c bip -f -n "__fish_use_subcommand" -a "watch" -d "Watch for code changes"
complete -c bip -f -n "__fish_use_subcommand" -a "summary" -d "Generate project summary"
complete -c bip -f -n "__fish_use_subcommand" -a "auto" -d "Manage automation"
complete -c bip -f -n "__fish_use_subcommand" -a "setup-api" -d "Setup Twitter API"
complete -c bip -f -n "__fish_use_subcommand" -a "config" -d "Manage configuration"
complete -c bip -f -n "__fish_use_subcommand" -a "doctor" -d "Run health checks"
complete -c bip -f -n "__fish_use_subcommand" -a "completion" -d "Generate completion scripts"
complete -c bip -f -n "__fish_use_subcommand" -a "help" -d "Show help"

# Global options
complete -c bip -s v -l verbose -d "Verbose output"
complete -c bip -s q -l quiet -d "Quiet output"
complete -c bip -s d -l debug -d "Enable debug mode"
complete -c bip -l dry-run -d "Show what would be done"
complete -c bip -l config -r -d "Use custom config file"
complete -c bip -l no-color -d "Disable colored output"
complete -c bip -l json -d "Output in JSON format"
complete -c bip -s V -l version -d "Show version"
complete -c bip -s h -l help -d "Show help"

# Post command options
complete -c bip -n "__fish_seen_subcommand_from post" -s n -l no-confirm -d "Skip confirmation"

# Code command options
complete -c bip -n "__fish_seen_subcommand_from code" -s l -l lines -d "Line range"
complete -c bip -n "__fish_seen_subcommand_from code" -s n -l no-confirm -d "Skip confirmation"

# Screenshot command options
complete -c bip -n "__fish_seen_subcommand_from screenshot" -s o -l output -r -d "Output file"
complete -c bip -n "__fish_seen_subcommand_from screenshot" -s t -l theme -a "dracula synthwave-84 cyberpunk nord gruvbox-dark" -d "Theme"
complete -c bip -n "__fish_seen_subcommand_from screenshot" -s s -l shader -a "wave-gradient halftone disruptor matrix cyberpunk" -d "Shader"
complete -c bip -n "__fish_seen_subcommand_from screenshot" -s l -l lines -d "Line range"
complete -c bip -n "__fish_seen_subcommand_from screenshot" -l glob -d "Glob pattern"
complete -c bip -n "__fish_seen_subcommand_from screenshot" -l output-dir -r -d "Output directory"
complete -c bip -n "__fish_seen_subcommand_from screenshot" -l list-themes -d "List themes"
complete -c bip -n "__fish_seen_subcommand_from screenshot" -l list-shaders -d "List shaders"

# Config subcommands
complete -c bip -n "__fish_seen_subcommand_from config" -a "show" -d "Show configuration"
complete -c bip -n "__fish_seen_subcommand_from config" -a "get" -d "Get config value"
complete -c bip -n "__fish_seen_subcommand_from config" -a "set" -d "Set config value"
complete -c bip -n "__fish_seen_subcommand_from config" -a "validate" -d "Validate config"
complete -c bip -n "__fish_seen_subcommand_from config" -a "export" -d "Export config"
complete -c bip -n "__fish_seen_subcommand_from config" -a "import" -d "Import config"
complete -c bip -n "__fish_seen_subcommand_from config" -a "reset" -d "Reset config"`;
}

async function saveCompletionScript(shell: string, _script: string): Promise<void> {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (!home) {
    throw new Error('Could not determine home directory');
  }
  
  const rcFile = getShellRcFile(shell);
  const rcPath = path.join(home, rcFile);
  
  // Check if rc file exists
  let rcContent = '';
  try {
    rcContent = await fs.readFile(rcPath, 'utf-8');
  } catch {
    // File doesn't exist, that's okay
  }
  
  // Check if completion is already installed
  if (rcContent.includes('bip completion') || rcContent.includes('_bip_completions')) {
    console.log(chalk.yellow('⚠️  Completion script already installed'));
    return;
  }
  
  // Add completion script
  const marker = '\n# Build-in-Public Bot completion\n';
  const addition = marker + `eval "$(bip completion ${shell})"\n`;
  
  await fs.writeFile(rcPath, rcContent + addition);
}

function getShellRcFile(shell: string): string {
  switch (shell) {
    case 'bash':
      return '.bashrc';
    case 'zsh':
      return '.zshrc';
    case 'fish':
      return '.config/fish/config.fish';
    default:
      throw new Error(`Unknown shell: ${shell}`);
  }
}

export default completionCommand;