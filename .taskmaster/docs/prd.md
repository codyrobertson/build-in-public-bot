# Build in Public CLI Bot - Product Requirements Document

## Project Overview

A command-line interface (CLI) bot that automates "build in public" tweets for developers and indie hackers. The bot uses AI to generate engaging tweets about project progress, creates beautiful code screenshots, and posts updates to Twitter using unofficial APIs for easy access without complex OAuth setup.

## Core Requirements

### MVP Features

1. **CLI Command Access**
   - Global command installation (e.g., `bip post`, `bip tweet`)
   - Simple, intuitive command structure
   - Works from any directory in terminal

2. **AI-Powered Tweet Generation**
   - Uses AI (OpenAI/Claude/etc.) to generate engaging tweets
   - Contextual understanding of project updates
   - Maintains consistent personal tweet style
   - Character limit awareness (280 chars)

3. **Unofficial Twitter API Integration**
   - Uses libraries like `twitter-api-v2-auto` or similar
   - Session-based authentication (no OAuth complexity)
   - Reliable posting functionality

4. **Code Screenshot Generation**
   - Integration with carbon.now.sh API or similar
   - Beautiful syntax highlighting
   - Customizable themes
   - Automatic attachment to tweets

5. **Personal Style Configuration**
   - Config file for tweet style preferences
   - Examples of preferred tweet formats
   - Emoji usage patterns
   - Hashtag preferences

## Technical Requirements

### Technology Stack
- **Language**: Node.js/TypeScript (for npm global package)
- **CLI Framework**: Commander.js or Yargs
- **AI Integration**: OpenAI API or Anthropic Claude API
- **Twitter Client**: Unofficial API library
- **Screenshot Tool**: Carbon API or Playwright for custom generation
- **Config Storage**: JSON/YAML in user home directory

### Command Structure

```bash
# Main commands
bip init                     # Initialize config and authenticate
bip post "message"           # Generate and post tweet from message
bip code "file.js" "caption" # Post code screenshot with caption
bip style                    # Configure tweet style preferences
bip history                  # View recent posts
bip draft                    # Generate tweet without posting
```

### Configuration

```yaml
# ~/.bip/config.yml
twitter:
  username: "your_username"
  # Session/cookie data stored securely

ai:
  provider: "openai" # or "anthropic"
  model: "gpt-4" # or "claude-3-sonnet"
  
style:
  tone: "casual-technical"
  emojis:
    frequency: "moderate"
    preferred: ["🚀", "💡", "🔧", "✨", "🎯"]
  hashtags:
    always: ["#buildinpublic"]
    contextual: ["#webdev", "#typescript", "#nodejs"]
  examples:
    - "Just shipped a new feature that makes X 10x faster 🚀 Used Y technique to optimize Z. The difference is wild! #buildinpublic"
    - "Debugging session turned into a refactoring marathon 🔧 Sometimes the best features come from fixing bugs. Added proper error handling and the UX is so much smoother now ✨"

screenshot:
  theme: "dracula"
  language: "auto-detect"
  padding: "32px"
```

## User Stories

1. **As a developer**, I want to quickly share my coding progress without context switching from terminal
2. **As an indie hacker**, I want AI to help me write engaging tweets that match my style
3. **As a builder**, I want to share beautiful code screenshots without manual editing
4. **As a user**, I want simple authentication without dealing with Twitter OAuth

## Functional Requirements

### Authentication Flow
1. User runs `bip init`
2. Prompted to enter Twitter credentials
3. Session established and stored securely
4. Auto-refresh of session when needed

### Tweet Generation Flow
1. User runs `bip post "implemented new caching layer"`
2. AI analyzes the update context
3. Generates tweet matching user's style config
4. Shows preview for confirmation
5. Posts to Twitter with configured hashtags

### Screenshot Flow
1. User runs `bip code main.js "New caching implementation"`
2. File content extracted and formatted
3. Carbon API generates beautiful screenshot
4. Tweet created with image and caption
5. Posted to Twitter

## Non-Functional Requirements

### Performance
- Tweet generation < 3 seconds
- Screenshot generation < 5 seconds
- Minimal dependencies for fast npm install

### Security
- Secure credential storage (keychain/credential manager)
- No plain text passwords
- API keys encrypted at rest

### Usability
- Clear error messages
- Helpful command hints
- Progress indicators for long operations
- Offline draft capability

## Success Criteria

1. **MVP Completion**
   - Can post text tweets from CLI
   - AI generates contextually appropriate tweets
   - Screenshots can be attached to tweets
   - Personal style is maintained

2. **User Experience**
   - Setup takes < 5 minutes
   - Posting a tweet takes < 10 seconds
   - 90% of generated tweets need no editing

3. **Reliability**
   - 95% successful post rate
   - Graceful handling of API failures
   - Clear error messages and recovery options

## Future Enhancements (Post-MVP)

1. **Thread Support**: Multi-tweet threads for longer updates
2. **Git Integration**: Auto-generate updates from commits
3. **Analytics**: Track engagement on posts
4. **Scheduling**: Queue posts for optimal times
5. **Multi-Platform**: LinkedIn, Mastodon support
6. **Team Features**: Shared style guides for teams

## Constraints

1. Must work without official Twitter API access
2. Should be installable with single npm command
3. Must respect Twitter rate limits
4. Should work on macOS, Linux, and Windows
5. Total package size < 50MB

## Timeline

- **Week 1**: Core CLI structure and Twitter integration
- **Week 2**: AI integration and style configuration
- **Week 3**: Screenshot functionality
- **Week 4**: Polish, testing, and documentation

## Risks and Mitigations

1. **Risk**: Unofficial API changes
   - **Mitigation**: Abstract API layer, multiple library options

2. **Risk**: AI API costs
   - **Mitigation**: Efficient prompting, caching, local model option

3. **Risk**: Screenshot service downtime
   - **Mitigation**: Fallback to local generation with Playwright

## Definition of Done

- [ ] All MVP commands implemented and working
- [ ] Comprehensive error handling
- [ ] User documentation written
- [ ] Published to npm registry
- [ ] 10+ successful test posts
- [ ] Style configuration validated