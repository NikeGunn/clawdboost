# ClawdBoost - Contributing

## Overview

This is an OpenClaw community plugin that provides smart context injection capabilities.

## File Structure

```
clawdboost/
├── package.json              # NPM package definition
├── openclaw.plugin.json      # OpenClaw plugin manifest
├── tsconfig.json             # TypeScript configuration
├── README.md                 # User documentation
├── LICENSE                   # MIT License
└── src/
    ├── index.ts              # Plugin entry point
    ├── manager.ts            # Core manager (snippets, rules, matching)
    ├── clawdboost-tool.ts    # AI tool implementation
    ├── hooks.ts              # Message and agent hooks
    └── cli.ts                # CLI commands
```

## Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm typecheck

# Run tests
pnpm test

# Run standalone tests (no OpenClaw dependency needed)
pnpm test:standalone
```

## Local Testing with OpenClaw

1. Add to your OpenClaw config:
```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/clawdboost"]
    }
  }
}
```

2. Restart the gateway

3. Test:
```bash
openclaw cb init
openclaw cb status
openclaw cb test "test message"
```
