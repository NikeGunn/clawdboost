# ClawdBoost 🚀⚡

**Supercharge your Clawdbot/Moltbot with smart context injection!** — Automatically boost AI conversations with pattern-matched, time-aware context snippets.

[![npm version](https://img.shields.io/npm/v/clawdboost?style=for-the-badge&color=red)](https://www.npmjs.com/package/clawdboost)
[![Downloads](https://img.shields.io/npm/dm/clawdboost?style=for-the-badge&color=blue)](https://www.npmjs.com/package/clawdboost)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/NikeGunn/clawdboost?style=for-the-badge&color=yellow)](https://github.com/NikeGunn/clawdboost)

> 🔥 **Made for the Clawdbot ecosystem** — The ultimate context injection plugin!

## 🎯 What is ClawdBoost?

ClawdBoost is a powerful plugin that **automatically injects relevant context** into your AI conversations based on:

- **📝 Pattern Matching**: Inject context when specific keywords or patterns appear
- **⏰ Time Awareness**: Different context for morning vs evening, weekdays vs weekends
- **🎯 Smart Rules**: Complex trigger conditions with multiple actions
- **📚 Personal Knowledge Base**: Quick-access facts, preferences, and reference data

## 🚀 Quick Install

```bash
# Install via npm
npm install clawdboost

# Or via pnpm
pnpm add clawdboost
```

### Enable in Moltbot/Clawdbot

Add to your `~/.clawdbot/moltbot.json`:

```json5
{
  "plugins": {
    "entries": {
      "clawdboost": {
        "enabled": true,
        "config": {
          "enableTimeAware": true,
          "enablePatternMatch": true,
          "maxSnippetsPerTurn": 5
        }
      }
    },
    "load": {
      "paths": ["node_modules/clawdboost"]
    }
  }
}
```

Or install from local path for development:

```json5
{
  "plugins": {
    "load": {
      "paths": ["/path/to/clawdboost"]
    }
  }
}
```

### Initialize with Examples

```bash
moltbot context-boost init
# or shorthand:
moltbot cb init
```

## 📖 Usage

### CLI Commands

```bash
# List all snippets
moltbot cb snippets

# Add a new snippet
moltbot cb add "My Context" --content "This is helpful context" --patterns "keyword1,keyword2"

# Add snippet from stdin
echo "My context content" | moltbot cb add "Piped Context"

# Get a snippet
moltbot cb get my-context

# Delete a snippet
moltbot cb delete my-context

# Enable/disable snippets
moltbot cb enable my-context
moltbot cb disable my-context

# List rules
moltbot cb rules

# Add a rule
moltbot cb rule-add "GitHub Helper" \
  --pattern "github|pull request|PR" \
  --inject-text "Remember to follow commit conventions!"

# Test context matching
moltbot cb test "I need to review this pull request"

# Check status
moltbot cb status
```

### AI Tool Usage

The AI can manage snippets and rules through the `context_boost` tool:

```
User: Create a snippet for code reviews
AI: [uses context_boost tool with action: add_snippet]
```

Available actions:
- `list_snippets` - List all context snippets
- `get_snippet` - Get a specific snippet
- `add_snippet` - Create a new snippet
- `update_snippet` - Update an existing snippet
- `delete_snippet` - Delete a snippet
- `list_rules` - List all rules
- `add_rule` - Create a new rule
- `update_rule` - Update a rule
- `delete_rule` - Delete a rule
- `test_match` - Test what context matches a message
- `status` - Get plugin status

## 📝 Snippets

Snippets are pieces of context that can be automatically injected. Create them in `~/.clawdbot/context-boost/snippets/`:

```json
{
  "id": "code-review",
  "name": "Code Review Guidelines",
  "content": "When reviewing code:\n- Check for security issues\n- Verify error handling\n- Look for performance problems",
  "patterns": ["review", "pull request", "PR", "code review"],
  "tags": ["development"],
  "priority": 60,
  "enabled": true,
  "createdAt": "2026-01-29T00:00:00Z",
  "updatedAt": "2026-01-29T00:00:00Z"
}
```

### Pattern-Based Snippets

Inject when specific patterns match the user's message:

```json
{
  "id": "meeting-helper",
  "name": "Meeting Context",
  "content": "For meetings: Review agenda, prepare talking points, note blockers",
  "patterns": ["meeting", "sync", "standup", "call"]
}
```

### Time-Based Snippets

Inject based on time of day or day of week:

```json
{
  "id": "morning-context",
  "name": "Morning Productivity",
  "content": "Good morning! Best time for focused work. Check calendar for meetings.",
  "timeRules": [
    { "type": "hour", "value": [6, 7, 8, 9, 10, 11] }
  ]
}
```

```json
{
  "id": "weekend-context",
  "name": "Weekend Mode",
  "content": "It's the weekend! Focus on personal projects and rest.",
  "timeRules": [
    { "type": "dayOfWeek", "value": [0, 6] }
  ]
}
```

## 📋 Rules

Rules provide more complex trigger-action logic. Stored in `~/.clawdbot/context-boost/rules.json`:

```json
{
  "rules": [
    {
      "id": "github-helper",
      "name": "GitHub Context",
      "description": "Inject GitHub best practices when discussing repos",
      "enabled": true,
      "priority": 55,
      "triggers": [
        { "type": "keyword", "keywords": ["github", "repository", "commit"] }
      ],
      "actions": [
        { "type": "inject_text", "text": "Remember: Use conventional commits!" },
        { "type": "inject_snippet", "snippetId": "git-workflow" }
      ]
    }
  ]
}
```

### Trigger Types

| Type | Description | Example |
|------|-------------|---------|
| `pattern` | Regex pattern match | `{ "type": "pattern", "pattern": "review.*PR" }` |
| `keyword` | Keyword presence | `{ "type": "keyword", "keywords": ["urgent", "asap"] }` |
| `time` | Time-based | `{ "type": "time", "timeRule": { "type": "hour", "value": [9,10,11] } }` |
| `channel` | Specific channels | `{ "type": "channel", "channels": ["telegram", "discord"] }` |
| `always` | Always trigger | `{ "type": "always" }` |

### Action Types

| Type | Description | Example |
|------|-------------|---------|
| `inject_snippet` | Inject a snippet | `{ "type": "inject_snippet", "snippetId": "my-snippet" }` |
| `inject_text` | Inject raw text | `{ "type": "inject_text", "text": "Remember this!" }` |
| `inject_file` | Inject file content | `{ "type": "inject_file", "filePath": "~/notes.md" }` |

## ⚙️ Configuration

Full configuration options in `moltbot.json`:

```json5
{
  "plugins": {
    "entries": {
      "context-boost": {
        "enabled": true,
        "config": {
          // Enable/disable globally
          "enabled": true,

          // Custom paths
          "snippetsPath": "~/.clawdbot/context-boost/snippets",
          "rulesPath": "~/.clawdbot/context-boost/rules.json",

          // Limits
          "maxSnippetsPerTurn": 5,
          "maxSnippetChars": 2000,

          // Features
          "enableTimeAware": true,
          "enablePatternMatch": true,

          // Debugging
          "logInjections": false,

          // Timezone for time rules
          "timezone": "local"
        }
      }
    }
  }
}
```

## 🔧 Use Cases

### 1. Project-Specific Context

```bash
moltbot cb add "Project Alpha" \
  --content "Project Alpha uses React, TypeScript, and PostgreSQL. API is at api.alpha.com. Deploy via GitHub Actions." \
  --patterns "alpha,project alpha"
```

### 2. Personal Preferences

```bash
moltbot cb add "My Preferences" \
  --content "I prefer: TypeScript over JavaScript, tabs over spaces, dark mode, concise responses." \
  --patterns "preference,prefer,style"
```

### 3. Daily Standup Helper

```bash
moltbot cb add "Standup Format" \
  --content "Standup format: 1) What I did yesterday 2) What I'm doing today 3) Any blockers" \
  --patterns "standup,daily,scrum"
```

### 4. Time-Aware Productivity

Create a snippet for focused work hours:
```json
{
  "id": "focus-time",
  "name": "Focus Time",
  "content": "This is your focus block (9-12). Minimize distractions. Consider: Do Not Disturb mode.",
  "timeRules": [
    { "type": "hour", "value": [9, 10, 11] },
    { "type": "dayOfWeek", "value": [1, 2, 3, 4, 5] }
  ]
}
```

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines and submit PRs.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Context Boost** — Making your AI assistant smarter, one context at a time. 🧠✨
