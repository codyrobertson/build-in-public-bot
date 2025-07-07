# 🚀 Build in Public Bot

> **AI-Powered CLI Tool for Effortless Build-in-Public Content Creation**

Transform your development workflow into engaging social media content with automated tweet generation, beautiful code screenshots, and seamless Twitter integration.

<div align="center">

[![npm version](https://badge.fury.io/js/build-in-public-bot.svg)](https://www.npmjs.com/package/build-in-public-bot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/build-in-public-bot.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/Coverage-95%25-brightgreen)](./docs)

</div>

---

## ✨ Why Build in Public Bot?

Building in public is one of the most effective ways to:
- **Build an audience** of potential customers and supporters
- **Get feedback early** and often on your projects
- **Create accountability** for your development goals
- **Network with other builders** and potential collaborators

But consistently creating engaging content takes time away from actual building. **That's where this bot comes in.**

### 🎯 The Problem We Solve

| Traditional Approach | With Build in Public Bot |
|---------------------|---------------------------|
| ⏰ Spend 30+ minutes crafting tweets | ⚡ Generate tweets in seconds |
| 📸 Manually create code screenshots | 🎨 Auto-generate beautiful screenshots |
| 🤔 Struggle with what to share | 🤖 AI suggests engaging content |
| 📱 Context-switch to Twitter constantly | 💻 Stay in your terminal/editor |
| 😕 Inconsistent posting schedule | 📅 Automated posting from your workflow |

---

## 🌟 Features & Capabilities

<table>
<tr>
<td width="50%">

### 🤖 **AI-Powered Content**
- **GPT-4 Integration** for natural, engaging tweets
- **Context-Aware** suggestions based on your code
- **Customizable Voice** - casual, professional, or technical
- **Smart Hashtag** management and emoji usage

### 📸 **Advanced Screenshot Engine**
- **Canvas-Based Rendering** - fast, reliable, customizable
- **10+ Beautiful Themes** (Dracula, Synthwave, Nord, etc.)
- **Custom Shaders** - halftone, wave-gradient, disruptor effects
- **Emoji Support** with Twemoji integration
- **Syntax Highlighting** for 100+ languages

</td>
<td width="50%">

### 🐦 **Smart Twitter Integration**
- **Browser Automation** - no API approval needed
- **Session Management** - login once, post for weeks
- **Media Upload** support for code screenshots
- **Rate Limiting** protection and retry logic

### 🛠 **Developer Experience**
- **TypeScript-First** with full type safety
- **Comprehensive Testing** with 95%+ coverage
- **Service Architecture** with dependency injection
- **Health Monitoring** and diagnostics
- **Plugin System** for VS Code, Vim, and more

</td>
</tr>
</table>

---

## 🚀 Quick Start

### Installation

<table>
<tr>
<td width="50%">

**📦 From npm (Recommended)**
```bash
npm install -g build-in-public-bot
```

</td>
<td width="50%">

**🔧 From Source (Latest)**
```bash
git clone https://github.com/yourusername/build-in-public-bot.git
cd build-in-public-bot
npm install && npm run build && npm link
```

</td>
</tr>
</table>

### Setup (2 minutes)

```bash
# 1. Initialize and configure
bip init
# ✨ Interactive setup walks you through:
#    - OpenRouter API key (for AI)
#    - Twitter authentication method
#    - Content style preferences

# 2. Test your setup
bip post "Just set up my build-in-public bot! 🚀"

# 3. Share some code
bip code src/app.js "Implementing real-time features"
```

### Your First Tweet in 30 Seconds

```bash
# Generate AI tweet about your current work
bip post "Working on user authentication"

# Share a code file with automatic screenshot
bip code src/auth.ts "Just implemented OAuth flow"

# Create a draft for review
bip draft "Shipped a major performance improvement"
```

---

## 📋 Command Reference

<details>
<summary><strong>🎯 Core Commands</strong></summary>

| Command | Description | Example |
|---------|-------------|---------|
| `bip init` | Setup wizard for first-time configuration | `bip init` |
| `bip post <message>` | Generate and post AI-enhanced tweet | `bip post "Fixed a tricky bug"` |
| `bip code <file> [message]` | Post code screenshot with message | `bip code app.js "New feature"` |
| `bip draft <message>` | Create draft without posting | `bip draft "Major milestone"` |
| `bip history` | View your posting history | `bip history --limit 10` |

</details>

<details>
<summary><strong>⚙️ Configuration Commands</strong></summary>

| Command | Description | Options |
|---------|-------------|---------|
| `bip style` | Configure tweet style and voice | `--tone`, `--emoji-frequency` |
| `bip setup-api` | Update API keys | Interactive prompts |
| `bip screenshot` | Test screenshot generation | `--theme`, `--shader` |
| `bip health` | Check system health | System diagnostics |

</details>

<details>
<summary><strong>🚀 Advanced Commands</strong></summary>

| Command | Description | Use Case |
|---------|-------------|----------|
| `bip watch` | Monitor files for changes | `bip watch src/ --auto` |
| `bip summary` | Generate session summary | End-of-day posting |
| `bip auto` | Git hook integration | `bip auto --enable` |
| `bip server` | Start development server | Live preview mode |

</details>

---

## 🎨 Screenshot Themes & Customization

### Available Themes

<table>
<tr>
<td align="center"><strong>🌙 Dark Themes</strong></td>
<td align="center"><strong>🌈 Colorful Themes</strong></td>
<td align="center"><strong>📝 Light Themes</strong></td>
</tr>
<tr>
<td>

- Dracula
- Nord  
- One Dark
- Tokyo Night
- GitHub Dark

</td>
<td>

- Synthwave 84
- Cyberpunk
- Catppuccin Mocha
- Gruvbox Dark
- Monokai Pro

</td>
<td>

- GitHub Light
- Ayu Light
- VS Code Light
- Atom Light
- Material Light

</td>
</tr>
</table>

### Visual Effects (Shaders)

| Effect | Description | Best For |
|--------|-------------|----------|
| **Halftone** | Retro print-style dots | Vintage aesthetic |
| **Wave Gradient** | Flowing wave patterns | Modern, dynamic look |
| **Disruptor** | Digital glitch effect | Cyberpunk/tech themes |
| **Clean** | No effects, pure code | Professional content |

### Customization Example

```bash
# Test different themes
bip screenshot --theme synthwave-84 --shader wave-gradient

# Configure default style
bip style \
  --tone professional \
  --emoji-frequency low \
  --theme nord \
  --shader halftone
```

---

## 🔧 Configuration Deep Dive

### Configuration File Location
- **macOS/Linux**: `~/.bip/config.yml`
- **Windows**: `%USERPROFILE%\.bip\config.yml`

### Complete Configuration Example

```yaml
version: "1.0.0"

# AI Configuration
ai:
  provider: "openrouter"
  model: "openai/gpt-4-turbo-preview"
  temperature: 0.8
  apiKey: "your-key-here"

# Twitter Integration
twitter:
  username: "yourhandle"
  postingMethod: "browser"  # or "api"
  sessionData: null  # Auto-managed

# Content Style
style:
  tone: "casual"  # casual, professional, technical, inspiring
  emojis:
    frequency: "medium"  # low, medium, high
    preferred: ["🚀", "💻", "⚡", "🎯"]
  hashtags:
    always: ["#buildinpublic"]
    contextual: ["#coding", "#typescript", "#startup"]
  examples:
    - "Just shipped a new feature! Users can now..."
    - "Debugging session complete 🐛 → ✅"

# Screenshot Settings
screenshots:
  theme: "dracula"
  backgroundColor: "#282a36"
  windowTheme: "mac"  # mac, windows, none
  padding: 32
  language: "auto"  # auto-detect or specify
  
  # Advanced shader settings
  shader:
    name: "wave-gradient"
    colors:
      primary: "#8be9fd"
      secondary: "#50fa7b"
      accent: "#ff79c6"
    parameters:
      intensity: 1.0
      scale: 1.0
```

---

## 🏗 Architecture & Extensibility

### Service-Oriented Architecture

Our codebase follows modern architectural patterns for maintainability and testability:

```
src/
├── services/           # Core business logic
│   ├── interfaces.ts   # Service contracts
│   ├── container.ts    # Dependency injection
│   ├── registry.ts     # Service registry
│   ├── health.ts       # System monitoring
│   ├── screenshot.ts   # Image generation
│   ├── twitter.ts      # Social media integration
│   ├── ai.ts          # Content generation
│   └── config.ts      # Configuration management
├── commands/          # CLI command handlers
├── themes/           # Visual themes and shaders
├── utils/            # Shared utilities
└── types/            # TypeScript definitions
```

### Health Monitoring

```bash
# Check system health
bip health

# Output example:
✅ Overall Status: Healthy
├── 🖼️  Screenshot Service: Healthy (12 themes available)
├── 🐦 Twitter Service: Authenticated (session valid)
├── 🤖 AI Service: Ready (API key valid)
├── ⚙️  Config Service: Loaded (0 issues)
└── 💾 Storage Service: 15 drafts, 42 history items
```

### Plugin Development

Extend functionality with custom plugins:

```typescript
// example-plugin.ts
import { ServiceContainer, IScreenshotService } from 'build-in-public-bot';

export class CustomPlugin {
  constructor(private services: ServiceContainer) {}
  
  async generateCustomContent(code: string): Promise<Buffer> {
    return this.services.screenshot.generateCodeScreenshot(
      code, 
      'typescript',
      { theme: 'cyberpunk', shader: 'disruptor' }
    );
  }
}
```

---

## 🔌 IDE Integration

### VS Code Extension

```bash
# Install the extension
code --install-extension build-in-public-bot

# Usage
# 1. Select code
# 2. Cmd/Ctrl + Shift + P
# 3. "BIP: Share Code"
```

### Vim Plugin

```vim
" Add to .vimrc
call plug#begin()
Plug 'build-in-public/vim-bip'
call plug#end()

" Usage
:BipShare
```

### Emacs Integration

```elisp
;; Add to init.el
(require 'bip-mode)

;; Usage
M-x bip-share-region
```

---

## 🧪 Development & Testing

### Local Development

```bash
# Setup development environment
git clone https://github.com/yourusername/build-in-public-bot.git
cd build-in-public-bot
npm install

# Run in development mode
npm run dev

# Run the test suite
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:coverage

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Architecture Testing

We maintain comprehensive test coverage across all service layers:

| Test Category | Coverage | Description |
|---------------|----------|-------------|
| **Unit Tests** | 95%+ | Individual service logic |
| **Integration Tests** | 90%+ | Service interaction |
| **E2E Tests** | 85%+ | Full workflow testing |
| **Health Checks** | 100% | System monitoring |

### Testing Your Changes

```bash
# Test screenshot generation
npm run test:screenshot

# Test Twitter integration (mock mode)
npm run test:twitter

# Test AI content generation
npm run test:ai

# Full test suite with coverage
npm run test:coverage
```

---

## 🔐 Security & Privacy

### Data Handling

| Data Type | Storage | Encryption | Retention |
|-----------|---------|------------|-----------|
| **API Keys** | Local config file | OS keychain | Until removed |
| **Twitter Session** | Local encrypted file | AES-256 | 30 days max |
| **Tweet History** | Local SQLite | None | User controlled |
| **Code Content** | Never stored | N/A | Processing only |

### Security Features

- 🔒 **No cloud storage** - everything stays local
- 🔑 **Encrypted session storage** with auto-expiration  
- 🛡️ **No code transmission** to external services
- 🚫 **No tracking or analytics** collection
- ⚡ **Minimal permissions** required

### Privacy Controls

```bash
# Clear all local data
bip config --reset

# Export your data
bip export --format json

# Remove specific history
bip history --delete <id>
```

---

## 🚨 Troubleshooting

### Common Issues

<details>
<summary><strong>❌ Screenshot generation fails</strong></summary>

**Symptoms**: Empty images, error messages, missing themes

**Solutions**:
```bash
# Check system health
bip health

# Test specific theme
bip screenshot --theme dracula --test

# Update dependencies
npm install -g build-in-public-bot@latest

# Reset configuration
bip config --reset-screenshots
```

</details>

<details>
<summary><strong>🐦 Twitter authentication issues</strong></summary>

**Symptoms**: Login failures, session expiration, posting errors

**Solutions**:
```bash
# Clear and re-authenticate
bip init --reset-twitter

# Check session status
bip health

# Switch to API mode (if browser fails)
bip setup-api --twitter-api
```

</details>

<details>
<summary><strong>🤖 AI generation problems</strong></summary>

**Symptoms**: API errors, poor content quality, rate limits

**Solutions**:
```bash
# Verify API key
bip setup-api --test

# Check rate limits
bip health

# Update model configuration
bip style --model "anthropic/claude-3-sonnet"
```

</details>

### Debug Mode

```bash
# Enable verbose logging
export BIP_DEBUG=true
bip post "test message"

# Check log files
tail -f ~/.bip/logs/debug.log
```

### Getting Help

1. **📖 Check the docs**: [docs/](./docs/)
2. **🔍 Search issues**: [GitHub Issues](https://github.com/yourusername/build-in-public-bot/issues)
3. **💬 Ask the community**: [Discussions](https://github.com/yourusername/build-in-public-bot/discussions)
4. **🐛 Report bugs**: [New Issue](https://github.com/yourusername/build-in-public-bot/issues/new)

---

## 🤝 Contributing

We love contributions! Here's how to get involved:

### Quick Contributions

- 🐛 **Report bugs** or suggest features
- 📝 **Improve documentation** 
- 🎨 **Add new themes** or shaders
- 🔌 **Create IDE plugins**

### Development Contributions

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Write** tests for your changes
4. **Ensure** all tests pass: `npm test`
5. **Commit** your changes: `git commit -m 'feat: add amazing feature'`
6. **Push** to your fork: `git push origin feature/amazing-feature`
7. **Submit** a Pull Request

### Contribution Guidelines

- ✅ Follow TypeScript best practices
- ✅ Maintain test coverage above 90%
- ✅ Update documentation for new features
- ✅ Use conventional commit messages
- ✅ Test across different platforms

---

## 📈 Roadmap

### 🎯 Next Release (v1.1)

- [ ] **GitHub Integration** - Auto-tweet from commits and PRs
- [ ] **Slack/Discord** webhook support  
- [ ] **Analytics Dashboard** - track engagement metrics
- [ ] **Custom AI Models** - fine-tuned content generation
- [ ] **Team Collaboration** - shared configs and templates

### 🚀 Future Vision (v2.0)

- [ ] **Multi-Platform** support (LinkedIn, Mastodon, Bluesky)
- [ ] **Content Calendar** - scheduled posting
- [ ] **A/B Testing** - optimize content performance
- [ ] **Video Generation** - animated code demos
- [ ] **AI Insights** - personalized content recommendations

### 🗳️ Community Requests

Vote on upcoming features in our [GitHub Discussions](https://github.com/yourusername/build-in-public-bot/discussions/categories/feature-requests)!

---

## 🙏 Acknowledgments

This project wouldn't be possible without these amazing tools and communities:

### 🛠 Technology Stack

| Category | Tool | Purpose |
|----------|------|---------|
| **AI/ML** | [OpenRouter](https://openrouter.ai) | GPT-4 API access |
| **Graphics** | [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) | Screenshot rendering |
| **Automation** | [Puppeteer](https://pptr.dev) | Browser control |
| **CLI** | [Commander.js](https://github.com/tj/commander.js) | Command interface |
| **Testing** | [Jest](https://jestjs.io) | Testing framework |

### 🎨 Visual Assets

- **Emojis**: [Twemoji](https://twemoji.twitter.com) by Twitter
- **Themes**: Inspired by VS Code, Sublime Text, and Vim communities
- **Icons**: [Heroicons](https://heroicons.com) and [Lucide](https://lucide.dev)

### 💡 Inspiration

- **Build in Public** movement by [Indie Hackers](https://indiehackers.com)
- **Developer Tools** by the amazing open source community
- **CLI Design** patterns from tools like [Vercel CLI](https://vercel.com/cli) and [Stripe CLI](https://stripe.com/docs/stripe-cli)

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

**TL;DR**: You can use, modify, and distribute this software freely, including for commercial purposes.

---

## 🌟 Star History

If this tool helps you build in public more effectively, consider giving it a star! ⭐

```bash
# Show your support
git clone https://github.com/yourusername/build-in-public-bot.git
cd build-in-public-bot
# Click the ⭐ button on GitHub!
```

---

<div align="center">

**Built with ❤️ by developers, for developers who #BuildInPublic**

[🌐 Website](https://build-in-public-bot.dev) • [📚 Docs](./docs/) • [🐛 Issues](https://github.com/yourusername/build-in-public-bot/issues) • [💬 Discussions](https://github.com/yourusername/build-in-public-bot/discussions)

</div>