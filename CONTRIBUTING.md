# Context Boost - Project Files

## Overview

This is a Moltbot plugin that provides smart context injection capabilities.

## File Structure

```
context-boost/
├── package.json              # NPM package definition
├── clawdbot.plugin.json      # Moltbot plugin manifest
├── tsconfig.json             # TypeScript configuration
├── README.md                 # User documentation
├── LICENSE                   # MIT License
└── src/
    ├── index.ts              # Plugin entry point
    ├── manager.ts            # Core manager (snippets, rules, matching)
    ├── context-boost-tool.ts # AI tool implementation
    ├── hooks.ts              # Message and agent hooks
    └── cli.ts                # CLI commands
```

## Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm typecheck

# Lint
pnpm lint

# Test
pnpm test
```

## Local Testing with Moltbot

1. Add to your moltbot.json:
```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/context-boost"]
    }
  }
}
```

2. Restart the gateway

3. Test:
```bash
moltbot cb init
moltbot cb status
moltbot cb test "test message"
```
