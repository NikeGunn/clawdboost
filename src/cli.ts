import type { Command } from "commander";
import type { MoltbotPluginCliContext } from "moltbot/plugin-sdk";
import type { ClawdBoostManager, ContextSnippet, ContextRule } from "./manager.js";

export function registerClawdBoostCli(
  ctx: MoltbotPluginCliContext,
  manager: ClawdBoostManager
): void {
  const cb = ctx.program
    .command("clawdboost")
    .alias("cb")
    .description("🚀 ClawdBoost - Smart context injection for supercharged AI conversations");

  // ============================================================================
  // Snippet Commands
  // ============================================================================

  cb.command("snippets")
    .alias("ls")
    .description("List all context snippets")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const snippets = await manager.getAllSnippets();

      if (opts.json) {
        console.log(JSON.stringify(snippets, null, 2));
        return;
      }

      if (snippets.length === 0) {
        console.log("No snippets found. Create one with: moltbot cb add <name>");
        return;
      }

      console.log("\n🚀 ClawdBoost Snippets:");
      console.log("═".repeat(60));

      for (const s of snippets) {
        const status = s.enabled !== false ? "✓" : "○";
        const patterns = s.patterns?.length ? ` [${s.patterns.length} patterns]` : "";
        const time = s.timeRules?.length ? ` [${s.timeRules.length} time rules]` : "";
        console.log(`${status} ${s.id}`);
        console.log(`  Name: ${s.name}${patterns}${time}`);
        console.log(`  Priority: ${s.priority ?? 50}`);
        if (s.tags?.length) console.log(`  Tags: ${s.tags.join(", ")}`);
        console.log("");
      }
    });

  cb.command("add <name>")
    .description("Create a new context snippet")
    .option("-c, --content <text>", "Snippet content (or read from stdin)")
    .option("-t, --tags <tags>", "Comma-separated tags")
    .option("-p, --patterns <patterns>", "Comma-separated regex patterns")
    .option("--priority <n>", "Priority (1-100, default 50)")
    .option("--disabled", "Create in disabled state")
    .action(async (name, opts) => {
      let content = opts.content;

      if (!content) {
        // Read from stdin if available
        if (!process.stdin.isTTY) {
          const chunks: Buffer[] = [];
          for await (const chunk of process.stdin) {
            chunks.push(chunk);
          }
          content = Buffer.concat(chunks).toString("utf-8").trim();
        }
      }

      if (!content) {
        console.error("Error: Content is required. Use --content or pipe content via stdin.");
        process.exit(1);
      }

      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const snippet: ContextSnippet = {
        id,
        name,
        content,
        tags: opts.tags ? opts.tags.split(",").map((t: string) => t.trim()) : undefined,
        patterns: opts.patterns ? opts.patterns.split(",").map((p: string) => p.trim()) : undefined,
        priority: opts.priority ? parseInt(opts.priority, 10) : 50,
        enabled: !opts.disabled,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await manager.saveSnippet(snippet);
      console.log(`✓ Created snippet: ${id}`);
      console.log(`  Location: ${manager.getSnippetsDir()}/${id}.json`);
    });

  cb.command("get <id>")
    .description("Get a snippet by ID")
    .option("--json", "Output as JSON")
    .action(async (id, opts) => {
      const snippet = await manager.getSnippet(id);

      if (!snippet) {
        console.error(`Snippet not found: ${id}`);
        process.exit(1);
      }

      if (opts.json) {
        console.log(JSON.stringify(snippet, null, 2));
        return;
      }

      console.log(`\nSnippet: ${snippet.id}`);
      console.log("═".repeat(40));
      console.log(`Name: ${snippet.name}`);
      console.log(`Enabled: ${snippet.enabled !== false ? "yes" : "no"}`);
      console.log(`Priority: ${snippet.priority ?? 50}`);
      if (snippet.tags?.length) console.log(`Tags: ${snippet.tags.join(", ")}`);
      if (snippet.patterns?.length) console.log(`Patterns: ${snippet.patterns.join(", ")}`);
      if (snippet.timeRules?.length) console.log(`Time Rules: ${snippet.timeRules.length}`);
      console.log(`\nContent:\n${"-".repeat(40)}\n${snippet.content}`);
    });

  cb.command("delete <id>")
    .alias("rm")
    .description("Delete a snippet")
    .action(async (id) => {
      const deleted = await manager.deleteSnippet(id);
      if (deleted) {
        console.log(`✓ Deleted snippet: ${id}`);
      } else {
        console.error(`Snippet not found: ${id}`);
        process.exit(1);
      }
    });

  cb.command("enable <id>")
    .description("Enable a snippet")
    .action(async (id) => {
      const snippet = await manager.getSnippet(id);
      if (!snippet) {
        console.error(`Snippet not found: ${id}`);
        process.exit(1);
      }
      snippet.enabled = true;
      await manager.saveSnippet(snippet);
      console.log(`✓ Enabled snippet: ${id}`);
    });

  cb.command("disable <id>")
    .description("Disable a snippet")
    .action(async (id) => {
      const snippet = await manager.getSnippet(id);
      if (!snippet) {
        console.error(`Snippet not found: ${id}`);
        process.exit(1);
      }
      snippet.enabled = false;
      await manager.saveSnippet(snippet);
      console.log(`○ Disabled snippet: ${id}`);
    });

  // ============================================================================
  // Rule Commands
  // ============================================================================

  cb.command("rules")
    .description("List all context injection rules")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const rules = await manager.loadRules();

      if (opts.json) {
        console.log(JSON.stringify(rules, null, 2));
        return;
      }

      if (rules.length === 0) {
        console.log("No rules found. Create one with: moltbot cb rule-add <name>");
        return;
      }

      console.log("\nContext Boost Rules:");
      console.log("═".repeat(60));

      for (const r of rules) {
        const status = r.enabled ? "✓" : "○";
        console.log(`${status} ${r.id}`);
        console.log(`  Name: ${r.name}`);
        if (r.description) console.log(`  Description: ${r.description}`);
        console.log(`  Priority: ${r.priority}`);
        console.log(`  Triggers: ${r.triggers.length}, Actions: ${r.actions.length}`);
        console.log("");
      }
    });

  cb.command("rule-add <name>")
    .description("Create a new context injection rule")
    .option("-d, --description <text>", "Rule description")
    .option("--pattern <regex>", "Trigger pattern (regex)")
    .option("--keywords <words>", "Trigger keywords (comma-separated)")
    .option("--inject-snippet <id>", "Action: inject snippet by ID")
    .option("--inject-text <text>", "Action: inject text directly")
    .option("--priority <n>", "Priority (1-100, default 50)")
    .option("--disabled", "Create in disabled state")
    .action(async (name, opts) => {
      const triggers: any[] = [];
      const actions: any[] = [];

      if (opts.pattern) {
        triggers.push({ type: "pattern", pattern: opts.pattern });
      }
      if (opts.keywords) {
        triggers.push({
          type: "keyword",
          keywords: opts.keywords.split(",").map((k: string) => k.trim())
        });
      }
      if (triggers.length === 0) {
        console.error("Error: At least one trigger is required (--pattern or --keywords)");
        process.exit(1);
      }

      if (opts.injectSnippet) {
        actions.push({ type: "inject_snippet", snippetId: opts.injectSnippet });
      }
      if (opts.injectText) {
        actions.push({ type: "inject_text", text: opts.injectText });
      }
      if (actions.length === 0) {
        console.error("Error: At least one action is required (--inject-snippet or --inject-text)");
        process.exit(1);
      }

      const rule = await manager.addRule({
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name,
        description: opts.description,
        enabled: !opts.disabled,
        priority: opts.priority ? parseInt(opts.priority, 10) : 50,
        triggers,
        actions,
      });

      console.log(`✓ Created rule: ${rule.id}`);
    });

  cb.command("rule-delete <id>")
    .alias("rule-rm")
    .description("Delete a rule")
    .action(async (id) => {
      const deleted = await manager.deleteRule(id);
      if (deleted) {
        console.log(`✓ Deleted rule: ${id}`);
      } else {
        console.error(`Rule not found: ${id}`);
        process.exit(1);
      }
    });

  // ============================================================================
  // Test & Status Commands
  // ============================================================================

  cb.command("test <message>")
    .description("Test what context would be injected for a message")
    .option("-c, --channel <channel>", "Simulate channel context")
    .option("--json", "Output as JSON")
    .action(async (message, opts) => {
      const matches = await manager.findMatchingContext({
        message,
        channel: opts.channel,
      });

      if (opts.json) {
        console.log(JSON.stringify({
          message,
          channel: opts.channel,
          matches,
          formattedContext: manager.formatContextForInjection(matches),
        }, null, 2));
        return;
      }

      console.log(`\nTest Message: "${message}"`);
      if (opts.channel) console.log(`Channel: ${opts.channel}`);
      console.log("═".repeat(60));

      if (matches.length === 0) {
        console.log("\nNo context would be injected for this message.");
        return;
      }

      console.log(`\n${matches.length} context(s) matched:\n`);

      for (const match of matches) {
        const source = match.snippetId ? `Snippet: ${match.snippetId}` : `Rule: ${match.ruleId}`;
        console.log(`• ${source} (priority: ${match.priority}, source: ${match.source})`);
        console.log(`  Preview: ${match.content.slice(0, 100)}${match.content.length > 100 ? "..." : ""}`);
        console.log("");
      }

      console.log("\nFormatted injection:");
      console.log("-".repeat(40));
      console.log(manager.formatContextForInjection(matches));
    });

  cb.command("status")
    .description("Show Context Boost status and statistics")
    .option("--json", "Output as JSON")
    .action(async (opts) => {
      const [snippets, rules] = await Promise.all([
        manager.getAllSnippets(),
        manager.loadRules(),
      ]);

      const stats = {
        snippetsDir: manager.getSnippetsDir(),
        rulesFile: manager.getRulesFile(),
        totalSnippets: snippets.length,
        enabledSnippets: snippets.filter((s) => s.enabled !== false).length,
        patternSnippets: snippets.filter((s) => s.patterns && s.patterns.length > 0).length,
        timeSnippets: snippets.filter((s) => s.timeRules && s.timeRules.length > 0).length,
        totalRules: rules.length,
        enabledRules: rules.filter((r) => r.enabled).length,
      };

      if (opts.json) {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }

      console.log("\nContext Boost Status");
      console.log("═".repeat(40));
      console.log(`Snippets Directory: ${stats.snippetsDir}`);
      console.log(`Rules File: ${stats.rulesFile}`);
      console.log("");
      console.log("Snippets:");
      console.log(`  Total: ${stats.totalSnippets}`);
      console.log(`  Enabled: ${stats.enabledSnippets}`);
      console.log(`  With patterns: ${stats.patternSnippets}`);
      console.log(`  With time rules: ${stats.timeSnippets}`);
      console.log("");
      console.log("Rules:");
      console.log(`  Total: ${stats.totalRules}`);
      console.log(`  Enabled: ${stats.enabledRules}`);
    });

  cb.command("init")
    .description("Initialize Context Boost with example snippets")
    .action(async () => {
      console.log("Initializing Context Boost with example snippets...\n");

      // Example: Morning context
      await manager.saveSnippet({
        id: "morning-context",
        name: "Morning Context",
        content: `Good morning! Here's helpful context for morning conversations:
- I'm usually more focused in the morning
- Check calendar for today's meetings
- Review any overnight notifications
- Morning is best for complex tasks`,
        timeRules: [{ type: "hour", value: [6, 7, 8, 9, 10, 11] }],
        priority: 30,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log("✓ Created snippet: morning-context");

      // Example: Code review context
      await manager.saveSnippet({
        id: "code-review",
        name: "Code Review Guidelines",
        content: `When reviewing code, remember to:
- Check for security vulnerabilities
- Verify error handling is comprehensive
- Look for performance implications
- Ensure tests cover edge cases
- Check for proper logging
- Verify documentation is updated`,
        patterns: ["review", "pull request", "PR", "code review", "merge"],
        tags: ["development", "review"],
        priority: 60,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log("✓ Created snippet: code-review");

      // Example: Meeting prep context
      await manager.saveSnippet({
        id: "meeting-prep",
        name: "Meeting Preparation",
        content: `For meeting preparation:
- Review agenda and objectives
- Prepare talking points
- Gather relevant documents
- Note any blockers to discuss
- List decisions needed`,
        patterns: ["meeting", "sync", "standup", "call", "discuss"],
        tags: ["meetings", "productivity"],
        priority: 50,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log("✓ Created snippet: meeting-prep");

      // Example rule: GitHub-related context
      await manager.addRule({
        id: "github-context",
        name: "GitHub Context Injection",
        description: "Inject helpful GitHub context when discussing repos",
        enabled: true,
        priority: 55,
        triggers: [
          { type: "keyword", keywords: ["github", "repository", "commit", "branch"] },
        ],
        actions: [
          {
            type: "inject_text",
            text: `GitHub workflow reminders:
- Use conventional commits (feat:, fix:, docs:, etc.)
- Keep PRs focused and reviewable
- Link issues in PR descriptions
- Run CI checks before requesting review`
          },
        ],
      });
      console.log("✓ Created rule: github-context");

      console.log("\n✨ Context Boost initialized!");
      console.log("\nNext steps:");
      console.log("  moltbot cb snippets     # List all snippets");
      console.log("  moltbot cb rules        # List all rules");
      console.log('  moltbot cb test "hello" # Test context matching');
    });
}
