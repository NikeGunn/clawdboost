# ClawdBoost

**Smart context injection plugin for OpenClaw.** Automatically boost AI conversations with pattern-matched, time-aware context snippets.

[![npm version](https://img.shields.io/npm/v/clawdboost?style=for-the-badge&color=red)](https://www.npmjs.com/package/clawdboost)
[![Downloads](https://img.shields.io/npm/dm/clawdboost?style=for-the-badge&color=blue)](https://www.npmjs.com/package/clawdboost)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/NikeGunn/clawdboost?style=for-the-badge&color=yellow)](https://github.com/NikeGunn/clawdboost)

> Community plugins are independently maintained and not officially supported by the OpenClaw team.

---

## Quick Start

```bash
# Install
openclaw plugins install clawdboost

# Initialize with example snippets
openclaw cb init

# Check status
openclaw cb status
```

Or install via npm directly:

```bash
npm install clawdboost
```

Add to your OpenClaw config (`~/.openclaw/config.json`):

```json
{
  "plugins": {
    "entries": {
      "clawdboost": { "enabled": true }
    },
    "load": {
      "paths": ["node_modules/clawdboost"]
    }
  }
}
```

---

## What is ClawdBoost?

ClawdBoost automatically injects relevant context into AI conversations based on:

- **Pattern Matching** — Inject context when specific keywords or regex patterns appear
- **Time Awareness** — Different context for morning vs evening, weekdays vs weekends
- **Smart Rules** — Complex trigger conditions with multiple actions
- **Personal Knowledge Base** — Quick-access facts, preferences, and reference data

## Configuration

Full configuration options in OpenClaw config:

```json5
{
  "plugins": {
    "entries": {
      "clawdboost": {
        "enabled": true,
        "config": {
          "enableTimeAware": true,      // Enable time-based context
          "enablePatternMatch": true,   // Enable pattern matching
          "maxSnippetsPerTurn": 5,      // Max snippets per message
          "maxSnippetChars": 2000,      // Max chars per snippet
          "logInjections": false,       // Debug logging
          "timezone": "local"           // Timezone for time rules
        }
      }
    }
  }
}
```

## CLI Commands

```bash
# Snippet management
openclaw cb snippets                    # List all snippets
openclaw cb add "My Context" \
  --content "Helpful info" \
  --patterns "keyword1,keyword2"        # Add a snippet
openclaw cb get my-context              # Get a snippet
openclaw cb delete my-context           # Delete a snippet
openclaw cb enable my-context           # Enable a snippet
openclaw cb disable my-context          # Disable a snippet

# Rule management
openclaw cb rules                       # List all rules
openclaw cb rule-add "GitHub Helper" \
  --pattern "github|pull request|PR" \
  --inject-text "Follow commit conventions!"  # Add a rule

# Testing & status
openclaw cb test "I need to review this PR"   # Test matching
openclaw cb status                             # Plugin status
```

## AI Tool Usage

The AI can manage snippets and rules through the `clawdboost` tool:

Actions: `list_snippets`, `get_snippet`, `add_snippet`, `update_snippet`, `delete_snippet`, `list_rules`, `add_rule`, `update_rule`, `delete_rule`, `test_match`, `status`

## Snippets

Snippets are context pieces stored in `~/.openclaw/clawdboost/snippets/`:

```json
{
  "id": "code-review",
  "name": "Code Review Guidelines",
  "content": "When reviewing code:\n- Check for security issues\n- Verify error handling\n- Look for performance problems",
  "patterns": ["review", "pull request", "PR", "code review"],
  "tags": ["development"],
  "priority": 60,
  "enabled": true
}
```

### Time-Based Snippets

```json
{
  "id": "morning-context",
  "name": "Morning Productivity",
  "content": "Good morning! Best time for focused work.",
  "timeRules": [
    { "type": "hour", "value": [6, 7, 8, 9, 10, 11] }
  ]
}
```

## Rules

Rules provide complex trigger-action logic. Stored in `~/.openclaw/clawdboost/rules.json`:

```json
{
  "rules": [
    {
      "id": "github-helper",
      "name": "GitHub Context",
      "enabled": true,
      "priority": 55,
      "triggers": [
        { "type": "keyword", "keywords": ["github", "repository", "commit"] }
      ],
      "actions": [
        { "type": "inject_text", "text": "Remember: Use conventional commits!" }
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
| `channel` | Specific channels | `{ "type": "channel", "channels": ["telegram"] }` |
| `always` | Always trigger | `{ "type": "always" }` |

### Action Types

| Type | Description | Example |
|------|-------------|---------|
| `inject_snippet` | Inject a snippet | `{ "type": "inject_snippet", "snippetId": "my-snippet" }` |
| `inject_text` | Inject raw text | `{ "type": "inject_text", "text": "Remember this!" }` |
| `inject_file` | Inject file content | `{ "type": "inject_file", "filePath": "~/notes.md" }` |

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and submit PRs.

## License

MIT License - see [LICENSE](LICENSE) for details.
