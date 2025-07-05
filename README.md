# Build-in-Public Bot 🚀

An AI-powered CLI tool that automates "build in public" tweets for developers and indie hackers. Generate engaging tweets about your progress, share beautiful code screenshots, and maintain consistent posting - all from your terminal.

## Features ✨

- **AI-Powered Tweet Generation**: Uses GPT-4 via OpenRouter to create engaging tweets that match your personal style
- **Code Screenshot Generation**: Beautiful syntax-highlighted code screenshots using Carbon.sh
- **Personal Style Configuration**: Customize tone, emojis, and hashtags to match your voice
- **Twitter Integration**: Post directly to Twitter using browser automation (no API keys needed)
- **Draft Management**: Save and manage tweet drafts for later posting
- **History Tracking**: Keep track of all your posted tweets
- **Rate Limit Handling**: Built-in rate limit tracking and management

## Installation 📦

```bash
# Clone the repository
git clone https://github.com/yourusername/build-in-public-bot.git
cd build-in-public-bot

# Install dependencies
npm install

# Build the project
npm run build

# Link globally
npm link
```

## Setup 🛠️

### 1. Initialize the bot

```bash
bip init
```

This will:
- Set up your configuration directory (`~/.bip/`)
- Configure your Twitter username
- Set up AI preferences
- Initialize style settings

### 2. Set up OpenRouter API Key

Add your OpenRouter API key to the `.env` file:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
```

Get your API key from [OpenRouter](https://openrouter.ai/).

### 3. Twitter Authentication

When you run `bip init`, you'll have the option to authenticate with Twitter. The bot uses browser automation to log in securely without requiring Twitter API access.

## Usage 🚀

### Post a tweet

```bash
# Generate and post a tweet about your progress
bip post "just implemented user authentication with JWT tokens"

# Skip confirmation
bip post "shipped a new feature!" --no-confirm
```

### Share code screenshots

```bash
# Share a code file with auto-generated caption
bip code src/auth.js

# Share with custom caption
bip code src/auth.js "Check out this clean authentication flow"

# Share specific lines
bip code src/auth.js --lines 10-25
```

### Configure your style

```bash
# Interactive style configuration
bip style

# Reset to defaults
bip style --reset
```

### Generate drafts

```bash
# Generate without posting
bip draft "working on a new feature"

# Save draft for later
bip draft "big announcement coming" --save
```

### View history

```bash
# View recent posts and drafts
bip history

# Show last 20 posts
bip history --limit 20
```

## Configuration 📝

Your configuration is stored in `~/.bip/config.yml`:

```yaml
twitter:
  username: "yourusername"
  sessionData: "~/.bip/twitter-auth.json"

ai:
  provider: "openai"
  model: "gpt-4-turbo-preview"

style:
  tone: "casual-technical"
  emojis:
    frequency: "moderate"
    preferred: ["🚀", "💡", "🔧", "✨", "🎯"]
  hashtags:
    always: ["#buildinpublic"]
    contextual: ["#webdev", "#typescript", "#nodejs"]
  examples:
    - "Just shipped a new feature..."
    - "Debugging session turned into..."

screenshot:
  theme: "dracula"
  language: "auto-detect"
  padding: "32px"
```

## Development 💻

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Type check
npm run typecheck
```

## Architecture 🏗️

The project is structured as follows:

```
src/
├── cli.ts              # Main CLI entry point
├── commands/           # Command implementations
│   ├── init.ts
│   ├── post.ts
│   ├── code.ts
│   ├── style.ts
│   ├── history.ts
│   └── draft.ts
├── services/           # Core services
│   ├── ai.ts          # AI integration
│   ├── config.ts      # Configuration management
│   ├── screenshot.ts  # Code screenshot generation
│   ├── storage.ts     # Tweet history storage
│   ├── twitter.ts     # Twitter integration
│   ├── twitter-auth.ts # Browser automation
│   └── twitter-api.ts # API client
├── utils/             # Utilities
│   ├── errors.ts
│   ├── logger.ts
│   └── prompts.ts
└── types/             # TypeScript types
    └── index.ts
```

## Security 🔒

- Twitter credentials are stored securely in your home directory
- Session data is encrypted and expires after 30 days
- API keys are never logged or transmitted
- All requests use HTTPS

## Troubleshooting 🔧

### Authentication Issues

If Twitter authentication fails:
1. Make sure you're using correct credentials
2. Check if your account requires 2FA (not currently supported)
3. Try re-running `bip init` to re-authenticate

### Rate Limits

The bot tracks Twitter rate limits automatically. If you hit a limit:
- Wait for the reset time (shown in error message)
- Use drafts to queue tweets for later

### API Errors

If you see API errors:
1. Check your OpenRouter API key is valid
2. Verify you have credits in your OpenRouter account
3. Check the error message for specific issues

## Contributing 🤝

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License 📄

MIT License - see LICENSE file for details

## Acknowledgments 🙏

- [OpenRouter](https://openrouter.ai/) for AI model access
- [Carbon.now.sh](https://carbon.now.sh/) for code screenshots
- [Puppeteer](https://pptr.dev/) for browser automation
- All the indie hackers building in public!

---

Built with ❤️ for the build-in-public community