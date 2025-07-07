#!/bin/bash

# Build in Public Bot - CLI Command Examples

# 🚀 Quick Start
bip init                                    # Interactive setup wizard
bip post "Just shipped a new feature!"     # AI-enhanced tweet

# 📸 Code Screenshots  
bip code src/app.js "New authentication system"
bip code --theme synthwave-84 --shader wave-gradient utils/helpers.ts
bip screenshot --test --theme cyberpunk    # Test screenshot generation

# ⚙️ Configuration
bip style --tone professional --emoji-frequency low
bip setup-api                              # Update API keys
bip health                                  # System diagnostics

# 📝 Draft Management
bip draft "Major performance improvement"   # Save without posting
bip draft --list                          # View all drafts
bip draft --load abc123                   # Load specific draft

# 📊 History & Analytics
bip history --limit 10                    # Recent posts
bip history --export json                 # Export data
bip summary                               # Session summary

# 🔍 Advanced Features
bip watch src/ --auto                     # File monitoring
bip auto --enable                         # Git hook integration
bip server --port 3000                    # Development server

# 🧪 Testing & Debugging
export BIP_DEBUG=true
bip post "Debug mode enabled" --dry-run
bip config --reset                        # Reset configuration