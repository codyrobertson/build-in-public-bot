# Build in Public Bot

> AI-powered CLI bot for automating build-in-public tweets with code screenshots

[![npm version](https://badge.fury.io/js/build-in-public-bot.svg)](https://www.npmjs.com/package/build-in-public-bot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/build-in-public-bot.svg)](https://nodejs.org)

## Installation

```bash
npm install -g build-in-public-bot
```

Or use with npx:

```bash
npx build-in-public-bot init
```

## Quick Start

```bash
# 1. Initialize and set up API key interactively
bip init
# (You'll be prompted to paste your API key)

# 2. Post your first tweet
bip post "Just shipped a new feature!"

# 3. Post with code screenshot
bip code src/app.js "Implemented real-time updates"
```

## Features

- 🤖 **AI-Powered Tweet Generation** - Uses GPT-4 to create engaging tweets
- 📸 **Beautiful Code Screenshots** - Generate syntax-highlighted images via Carbon.sh
- 🎨 **Customizable Style** - Configure tone, emojis, and hashtags
- 🐦 **Direct Twitter Posting** - Browser automation (no API keys needed)
- 📝 **Draft Management** - Save tweets for later
- 📊 **Post History** - Track your build-in-public journey
- 👀 **File Watching** - Auto-generate tweets from code changes
- 🔄 **Git Integration** - Create tweets from commit messages

## Commands

### Core Commands

```bash
# Initialize configuration (includes API key setup)
bip init

# Set up or update API key
bip setup-api

# Post a tweet
bip post "Working on authentication system"

# Post with code screenshot
bip code file.js "Just refactored this function"

# Generate tweet without posting (save as draft)
bip draft "Building a new feature"
```

### Style Configuration

```bash
# Configure your tweet style
bip style --tone casual --emoji-frequency medium

# Available tones: casual, professional, technical, inspiring
# Emoji frequencies: low, medium, high
```

### History & Drafts

```bash
# View tweet history
bip history
bip history --limit 10

# Manage drafts
bip draft --list
bip draft --load <id>
bip draft --delete <id>
```

### Advanced Features

```bash
# Watch for code changes and suggest tweets
bip watch --path ./src --auto

# Generate summary of coding session
bip summary

# Set up automatic tweeting for git commits
bip auto --enable
```

## How Twitter Connection Works

### Browser Automation (Recommended)
When you choose browser automation during `bip init`:

1. **First Tweet**: A Chrome window opens
2. **Manual Login**: You log in to Twitter normally
3. **Session Saved**: Bot saves your session locally
4. **Future Posts**: No login needed for ~30 days

**Pros**: No API setup, works with personal accounts, handles media easily  
**Cons**: Requires Chrome installed, slightly slower than API

### Twitter API (Advanced)
If you choose API method during `bip init`:

1. **Developer Account**: Need Twitter Developer access
2. **Create App**: Set up at developer.twitter.com
3. **Get Keys**: Copy 4 different API credentials
4. **Configure**: Bot saves them to `.env`

**Pros**: Faster, no browser needed, official method  
**Cons**: Complex setup, rate limits, requires approval

## Configuration

Configuration is stored in `~/.bip/config.yml`:

```yaml
version: "1.0.0"
twitter:
  username: "yourusername"
  postingMethod: "browser"  # or "api"
ai:
  model: "openai/gpt-4-turbo-preview"
  temperature: 0.8
style:
  tone: "casual"
  emojis:
    enabled: true
    frequency: "medium"
  hashtags:
    - "#buildinpublic"
    - "#indiehacker"
  maxLength: 260
```

## Environment Variables

```bash
# Required
OPENROUTER_API_KEY=your-openrouter-api-key

# Optional
BIP_CONFIG_DIR=/custom/config/path
BIP_DEBUG=true
```

## API Requirements

- **OpenRouter API Key**: Sign up at [openrouter.ai](https://openrouter.ai) for tweet generation
- **Twitter Posting**: Choose between:
  - **Browser Automation** (Default): No API key needed, uses Chrome to post
  - **Twitter API** (Advanced): Requires Twitter Developer account and API keys
- **Carbon.sh**: Automatically used for code screenshots (no setup required)

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/build-in-public-bot.git
cd build-in-public-bot

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenRouter](https://openrouter.ai) for AI API access
- [Carbon.sh](https://carbon.now.sh) for beautiful code screenshots
- [Commander.js](https://github.com/tj/commander.js) for CLI framework
- [Puppeteer](https://pptr.dev) for browser automation

---

Made with ❤️ by developers, for developers who build in public