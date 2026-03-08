import { Type, type Static } from "@sinclair/typebox";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { randomUUID } from "node:crypto";

import type { ClawdBoostManager, ContextRule, ContextSnippet, RuleTrigger, RuleAction } from "./manager.js";

// ============================================================================
// Tool Schema
// ============================================================================

const ClawdBoostToolSchema = Type.Object({
  action: Type.Union([
    Type.Literal("list_snippets"),
    Type.Literal("get_snippet"),
    Type.Literal("add_snippet"),
    Type.Literal("update_snippet"),
    Type.Literal("delete_snippet"),
    Type.Literal("list_rules"),
    Type.Literal("add_rule"),
    Type.Literal("update_rule"),
    Type.Literal("delete_rule"),
    Type.Literal("test_match"),
    Type.Literal("status"),
  ]),
  // For snippet operations
  snippetId: Type.Optional(Type.String()),
  name: Type.Optional(Type.String()),
  content: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
  patterns: Type.Optional(Type.Array(Type.String())),
  timeRules: Type.Optional(Type.Array(Type.Object({
    type: Type.Union([
      Type.Literal("hour"),
      Type.Literal("dayOfWeek"),
      Type.Literal("date"),
      Type.Literal("dateRange"),
    ]),
    value: Type.Union([Type.String(), Type.Number(), Type.Array(Type.Number())]),
  }))),
  priority: Type.Optional(Type.Number()),
  enabled: Type.Optional(Type.Boolean()),
  // For rule operations
  ruleId: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  triggers: Type.Optional(Type.Array(Type.Object({
    type: Type.String(),
    pattern: Type.Optional(Type.String()),
    keywords: Type.Optional(Type.Array(Type.String())),
    timeRule: Type.Optional(Type.Any()),
    channels: Type.Optional(Type.Array(Type.String())),
  }))),
  actions: Type.Optional(Type.Array(Type.Object({
    type: Type.String(),
    snippetId: Type.Optional(Type.String()),
    text: Type.Optional(Type.String()),
    filePath: Type.Optional(Type.String()),
  }))),
  // For test_match
  testMessage: Type.Optional(Type.String()),
  testChannel: Type.Optional(Type.String()),
});

type ClawdBoostToolInput = Static<typeof ClawdBoostToolSchema>;

// ============================================================================
// Tool Implementation
// ============================================================================

export function createClawdBoostTool(manager: ClawdBoostManager, api: OpenClawPluginApi) {
  return {
    name: "clawdboost",
    description: `Manage ClawdBoost snippets and rules for automatic context injection.

Actions:
- list_snippets: List all context snippets
- get_snippet: Get a specific snippet by ID
- add_snippet: Create a new snippet (requires: name, content)
- update_snippet: Update an existing snippet (requires: snippetId)
- delete_snippet: Delete a snippet (requires: snippetId)
- list_rules: List all context injection rules
- add_rule: Create a new rule (requires: name, triggers, actions)
- update_rule: Update an existing rule (requires: ruleId)
- delete_rule: Delete a rule (requires: ruleId)
- test_match: Test what context would be injected for a message (requires: testMessage)
- status: Get ClawdBoost status and statistics

Snippets are text content that can be automatically injected based on patterns or time rules.
Rules define complex trigger conditions and actions for context injection.`,
    parameters: ClawdBoostToolSchema,

    async execute(input: ClawdBoostToolInput): Promise<string> {
      try {
        switch (input.action) {
          case "list_snippets": {
            const snippets = await manager.getAllSnippets();
            if (snippets.length === 0) {
              return "No snippets found. Use add_snippet to create one.";
            }
            const list = snippets.map((s) => ({
              id: s.id,
              name: s.name,
              tags: s.tags,
              patterns: s.patterns?.length || 0,
              timeRules: s.timeRules?.length || 0,
              enabled: s.enabled !== false,
              priority: s.priority ?? 50,
            }));
            return JSON.stringify(list, null, 2);
          }

          case "get_snippet": {
            if (!input.snippetId) {
              return "Error: snippetId is required";
            }
            const snippet = await manager.getSnippet(input.snippetId);
            if (!snippet) {
              return `Snippet not found: ${input.snippetId}`;
            }
            return JSON.stringify(snippet, null, 2);
          }

          case "add_snippet": {
            if (!input.name || !input.content) {
              return "Error: name and content are required";
            }
            const id = input.snippetId || generateId(input.name);
            const snippet: ContextSnippet = {
              id,
              name: input.name,
              content: input.content,
              tags: input.tags,
              patterns: input.patterns,
              timeRules: input.timeRules as ContextSnippet["timeRules"],
              priority: input.priority,
              enabled: input.enabled ?? true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await manager.saveSnippet(snippet);
            return `Created snippet: ${id}`;
          }

          case "update_snippet": {
            if (!input.snippetId) {
              return "Error: snippetId is required";
            }
            const existing = await manager.getSnippet(input.snippetId);
            if (!existing) {
              return `Snippet not found: ${input.snippetId}`;
            }
            const updated: ContextSnippet = {
              ...existing,
              name: input.name ?? existing.name,
              content: input.content ?? existing.content,
              tags: input.tags ?? existing.tags,
              patterns: input.patterns ?? existing.patterns,
              timeRules: (input.timeRules as ContextSnippet["timeRules"]) ?? existing.timeRules,
              priority: input.priority ?? existing.priority,
              enabled: input.enabled ?? existing.enabled,
              updatedAt: new Date().toISOString(),
            };
            await manager.saveSnippet(updated);
            return `Updated snippet: ${input.snippetId}`;
          }

          case "delete_snippet": {
            if (!input.snippetId) {
              return "Error: snippetId is required";
            }
            const deleted = await manager.deleteSnippet(input.snippetId);
            return deleted
              ? `Deleted snippet: ${input.snippetId}`
              : `Snippet not found: ${input.snippetId}`;
          }

          case "list_rules": {
            const rules = await manager.loadRules();
            if (rules.length === 0) {
              return "No rules found. Use add_rule to create one.";
            }
            const list = rules.map((r) => ({
              id: r.id,
              name: r.name,
              description: r.description,
              enabled: r.enabled,
              priority: r.priority,
              triggers: r.triggers.length,
              actions: r.actions.length,
            }));
            return JSON.stringify(list, null, 2);
          }

          case "add_rule": {
            if (!input.name || !input.triggers || !input.actions) {
              return "Error: name, triggers, and actions are required";
            }
            const rule = await manager.addRule({
              id: input.ruleId || generateId(input.name),
              name: input.name,
              description: input.description,
              enabled: input.enabled ?? true,
              priority: input.priority ?? 50,
              triggers: input.triggers as RuleTrigger[],
              actions: input.actions as RuleAction[],
            });
            return `Created rule: ${rule.id}`;
          }

          case "update_rule": {
            if (!input.ruleId) {
              return "Error: ruleId is required";
            }
            const updated = await manager.updateRule(input.ruleId, {
              name: input.name,
              description: input.description,
              enabled: input.enabled,
              priority: input.priority,
              triggers: input.triggers as RuleTrigger[],
              actions: input.actions as RuleAction[],
            });
            return updated
              ? `Updated rule: ${input.ruleId}`
              : `Rule not found: ${input.ruleId}`;
          }

          case "delete_rule": {
            if (!input.ruleId) {
              return "Error: ruleId is required";
            }
            const deleted = await manager.deleteRule(input.ruleId);
            return deleted
              ? `Deleted rule: ${input.ruleId}`
              : `Rule not found: ${input.ruleId}`;
          }

          case "test_match": {
            if (!input.testMessage) {
              return "Error: testMessage is required";
            }
            const matches = await manager.findMatchingContext({
              message: input.testMessage,
              channel: input.testChannel,
            });
            if (matches.length === 0) {
              return "No context would be injected for this message.";
            }
            return JSON.stringify({
              matchCount: matches.length,
              matches: matches.map((m) => ({
                snippetId: m.snippetId,
                ruleId: m.ruleId,
                source: m.source,
                priority: m.priority,
                contentPreview: m.content.slice(0, 200) + (m.content.length > 200 ? "..." : ""),
              })),
              formattedContext: manager.formatContextForInjection(matches),
            }, null, 2);
          }

          case "status": {
            const [snippets, rules] = await Promise.all([
              manager.getAllSnippets(),
              manager.loadRules(),
            ]);
            const enabledSnippets = snippets.filter((s) => s.enabled !== false);
            const enabledRules = rules.filter((r) => r.enabled);
            const patternSnippets = snippets.filter((s) => s.patterns && s.patterns.length > 0);
            const timeSnippets = snippets.filter((s) => s.timeRules && s.timeRules.length > 0);

            return JSON.stringify({
              status: "active",
              snippetsDir: manager.getSnippetsDir(),
              rulesFile: manager.getRulesFile(),
              stats: {
                totalSnippets: snippets.length,
                enabledSnippets: enabledSnippets.length,
                patternSnippets: patternSnippets.length,
                timeSnippets: timeSnippets.length,
                totalRules: rules.length,
                enabledRules: enabledRules.length,
              },
            }, null, 2);
          }

          default:
            return `Unknown action: ${input.action}`;
        }
      } catch (err) {
        return `Error: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
  };
}

function generateId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const suffix = randomUUID().slice(0, 6);
  return `${slug}-${suffix}`;
}
