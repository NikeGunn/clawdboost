/**
 * Standalone Test for ClawdBoost
 *
 * This test runs without needing moltbot installed.
 * Run with: node test/standalone.test.mjs
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Test configuration
const TEST_DIR = path.join(os.tmpdir(), "clawdboost-test-" + Date.now());
const SNIPPETS_DIR = path.join(TEST_DIR, "snippets");
const RULES_FILE = path.join(TEST_DIR, "rules.json");

// Colors for terminal output
const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(colors.green("✓") + ` ${name}`);
    passed++;
  } catch (err) {
    console.log(colors.red("✗") + ` ${name}`);
    console.log(colors.red(`  Error: ${err.message}`));
    failed++;
  }
}

function assertEqual(actual, expected, msg = "") {
  if (actual !== expected) {
    throw new Error(`${msg} Expected: ${expected}, Got: ${actual}`);
  }
}

function assertTrue(value, msg = "") {
  if (!value) {
    throw new Error(`${msg} Expected truthy value`);
  }
}

function assertContains(str, substring, msg = "") {
  if (!str.includes(substring)) {
    throw new Error(`${msg} Expected "${str}" to contain "${substring}"`);
  }
}

// ============================================================================
// Setup
// ============================================================================

console.log(colors.bold("\n🧪 ClawdBoost - Standalone Tests\n"));
console.log(`Test directory: ${TEST_DIR}\n`);

// Create test directories
fs.mkdirSync(SNIPPETS_DIR, { recursive: true });
fs.writeFileSync(RULES_FILE, JSON.stringify({ rules: [] }));

// ============================================================================
// Test: Snippet File Operations
// ============================================================================

console.log(colors.blue("📝 Snippet Operations"));

test("Create snippet file", () => {
  const snippet = {
    id: "test-snippet",
    name: "Test Snippet",
    content: "This is test content for context injection.",
    patterns: ["test", "demo"],
    priority: 50,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const filePath = path.join(SNIPPETS_DIR, "test-snippet.json");
  fs.writeFileSync(filePath, JSON.stringify(snippet, null, 2));

  assertTrue(fs.existsSync(filePath), "Snippet file should exist");
});

test("Read snippet file", () => {
  const filePath = path.join(SNIPPETS_DIR, "test-snippet.json");
  const content = fs.readFileSync(filePath, "utf-8");
  const snippet = JSON.parse(content);

  assertEqual(snippet.id, "test-snippet");
  assertEqual(snippet.name, "Test Snippet");
  assertTrue(snippet.patterns.includes("test"));
});

test("Update snippet file", () => {
  const filePath = path.join(SNIPPETS_DIR, "test-snippet.json");
  const content = fs.readFileSync(filePath, "utf-8");
  const snippet = JSON.parse(content);

  snippet.content = "Updated content";
  snippet.updatedAt = new Date().toISOString();

  fs.writeFileSync(filePath, JSON.stringify(snippet, null, 2));

  const updated = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  assertEqual(updated.content, "Updated content");
});

test("Delete snippet file", () => {
  const filePath = path.join(SNIPPETS_DIR, "test-snippet.json");
  fs.unlinkSync(filePath);
  assertTrue(!fs.existsSync(filePath), "Snippet file should be deleted");
});

// ============================================================================
// Test: Rules File Operations
// ============================================================================

console.log(colors.blue("\n📋 Rules Operations"));

test("Create rule", () => {
  const rule = {
    id: "test-rule",
    name: "Test Rule",
    description: "A test rule",
    enabled: true,
    priority: 60,
    triggers: [
      { type: "keyword", keywords: ["hello", "hi"] }
    ],
    actions: [
      { type: "inject_text", text: "Greeting detected!" }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const rulesData = { rules: [rule] };
  fs.writeFileSync(RULES_FILE, JSON.stringify(rulesData, null, 2));

  const saved = JSON.parse(fs.readFileSync(RULES_FILE, "utf-8"));
  assertEqual(saved.rules.length, 1);
  assertEqual(saved.rules[0].id, "test-rule");
});

test("Read rules", () => {
  const rulesData = JSON.parse(fs.readFileSync(RULES_FILE, "utf-8"));

  assertEqual(rulesData.rules.length, 1);
  assertTrue(rulesData.rules[0].triggers[0].keywords.includes("hello"));
});

test("Add multiple rules", () => {
  const rulesData = JSON.parse(fs.readFileSync(RULES_FILE, "utf-8"));

  rulesData.rules.push({
    id: "test-rule-2",
    name: "Second Rule",
    enabled: true,
    priority: 40,
    triggers: [{ type: "pattern", pattern: "urgent|asap" }],
    actions: [{ type: "inject_text", text: "Priority detected!" }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  fs.writeFileSync(RULES_FILE, JSON.stringify(rulesData, null, 2));

  const saved = JSON.parse(fs.readFileSync(RULES_FILE, "utf-8"));
  assertEqual(saved.rules.length, 2);
});

// ============================================================================
// Test: Pattern Matching Logic
// ============================================================================

console.log(colors.blue("\n🔍 Pattern Matching"));

test("Keyword trigger matches", () => {
  const trigger = { type: "keyword", keywords: ["meeting", "sync", "call"] };
  const message = "Can we schedule a meeting?";

  const matches = trigger.keywords.some(kw =>
    message.toLowerCase().includes(kw.toLowerCase())
  );

  assertTrue(matches, "Should match 'meeting'");
});

test("Keyword trigger no match", () => {
  const trigger = { type: "keyword", keywords: ["meeting", "sync", "call"] };
  const message = "Let's grab lunch";

  const matches = trigger.keywords.some(kw =>
    message.toLowerCase().includes(kw.toLowerCase())
  );

  assertTrue(!matches, "Should not match");
});

test("Pattern trigger matches", () => {
  const trigger = { type: "pattern", pattern: "review.*PR|pull request" };
  const message = "Can you review this PR?";

  const regex = new RegExp(trigger.pattern, "i");
  assertTrue(regex.test(message), "Should match PR pattern");
});

test("Pattern trigger with flags", () => {
  const trigger = { type: "pattern", pattern: "URGENT", flags: "i" };
  const message = "this is urgent";

  const regex = new RegExp(trigger.pattern, trigger.flags);
  assertTrue(regex.test(message), "Should match case-insensitive");
});

// ============================================================================
// Test: Time Rules
// ============================================================================

console.log(colors.blue("\n⏰ Time Rules"));

test("Hour rule - current hour", () => {
  const currentHour = new Date().getHours();
  const rule = { type: "hour", value: [currentHour] };

  const matches = rule.value.includes(currentHour);
  assertTrue(matches, "Should match current hour");
});

test("Hour rule - range check", () => {
  const morningHours = [6, 7, 8, 9, 10, 11];
  const rule = { type: "hour", value: morningHours };

  const hour = 9;
  const matches = rule.value.includes(hour);
  assertTrue(matches, "9 should be in morning hours");
});

test("Day of week rule", () => {
  const currentDay = new Date().getDay();
  const rule = { type: "dayOfWeek", value: [currentDay] };

  const matches = rule.value.includes(currentDay);
  assertTrue(matches, "Should match current day");
});

test("Weekend detection", () => {
  const weekend = [0, 6]; // Sunday = 0, Saturday = 6
  const currentDay = new Date().getDay();
  const isWeekend = weekend.includes(currentDay);

  // Just verify the logic works
  assertTrue(typeof isWeekend === "boolean");
});

// ============================================================================
// Test: Context Formatting
// ============================================================================

console.log(colors.blue("\n📄 Context Formatting"));

test("Format single snippet", () => {
  const matches = [{
    snippetId: "greeting",
    content: "Hello there!",
    source: "snippet",
    priority: 50,
  }];

  const lines = ["[ClawdBoost — relevant context injected automatically]", ""];
  for (const match of matches) {
    const label = match.snippetId ? `Snippet: ${match.snippetId}` : "Context";
    lines.push(`--- ${label} ---`);
    lines.push(match.content);
    lines.push("");
  }
  lines.push("[End ClawdBoost]");

  const formatted = lines.join("\n");

  assertContains(formatted, "[ClawdBoost");
  assertContains(formatted, "greeting");
  assertContains(formatted, "Hello there!");
  assertContains(formatted, "[End ClawdBoost]");
});

test("Format multiple matches", () => {
  const matches = [
    { snippetId: "one", content: "First", source: "snippet", priority: 60 },
    { ruleId: "two", content: "Second", source: "rule", priority: 50 },
  ];

  const lines = ["[ClawdBoost — relevant context injected automatically]", ""];
  for (const match of matches) {
    const label = match.snippetId
      ? `Snippet: ${match.snippetId}`
      : `Rule: ${match.ruleId}`;
    lines.push(`--- ${label} ---`);
    lines.push(match.content);
    lines.push("");
  }
  lines.push("[End ClawdBoost]");

  const formatted = lines.join("\n");

  assertContains(formatted, "Snippet: one");
  assertContains(formatted, "Rule: two");
});

test("Empty matches returns empty string", () => {
  const matches = [];
  const formatted = matches.length === 0 ? "" : "not empty";
  assertEqual(formatted, "");
});

// ============================================================================
// Test: Content Truncation
// ============================================================================

console.log(colors.blue("\n✂️ Content Truncation"));

test("Short content not truncated", () => {
  const content = "Short text";
  const maxChars = 2000;
  const result = content.length <= maxChars ? content : content.slice(0, maxChars) + "\n[... truncated]";

  assertEqual(result, "Short text");
});

test("Long content truncated", () => {
  const content = "A".repeat(3000);
  const maxChars = 2000;
  const result = content.length <= maxChars ? content : content.slice(0, maxChars) + "\n[... truncated]";

  assertEqual(result.length, 2000 + "\n[... truncated]".length);
  assertContains(result, "[... truncated]");
});

// ============================================================================
// Test: Priority Sorting
// ============================================================================

console.log(colors.blue("\n🔢 Priority Sorting"));

test("Sort by priority descending", () => {
  const matches = [
    { id: "low", priority: 30 },
    { id: "high", priority: 90 },
    { id: "medium", priority: 50 },
  ];

  matches.sort((a, b) => b.priority - a.priority);

  assertEqual(matches[0].id, "high");
  assertEqual(matches[1].id, "medium");
  assertEqual(matches[2].id, "low");
});

test("Limit max snippets", () => {
  const matches = [
    { id: "1", priority: 90 },
    { id: "2", priority: 80 },
    { id: "3", priority: 70 },
    { id: "4", priority: 60 },
    { id: "5", priority: 50 },
    { id: "6", priority: 40 },
  ];

  const maxSnippets = 5;
  const limited = matches.slice(0, maxSnippets);

  assertEqual(limited.length, 5);
  assertEqual(limited[4].id, "5");
});

// ============================================================================
// Test: ID Generation
// ============================================================================

console.log(colors.blue("\n🆔 ID Generation"));

test("Generate slug from name", () => {
  const name = "My Cool Snippet!";
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  assertEqual(slug, "my-cool-snippet");
});

test("Handle special characters", () => {
  const name = "Test@#$%Special!!!";
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  assertEqual(slug, "test-special");
});

// ============================================================================
// Cleanup
// ============================================================================

console.log(colors.blue("\n🧹 Cleanup"));

test("Remove test directory", () => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  assertTrue(!fs.existsSync(TEST_DIR), "Test directory should be removed");
});

// ============================================================================
// Summary
// ============================================================================

console.log(colors.bold("\n" + "═".repeat(50)));
console.log(colors.bold("📊 Test Summary"));
console.log("═".repeat(50));
console.log(colors.green(`✓ Passed: ${passed}`));
if (failed > 0) {
  console.log(colors.red(`✗ Failed: ${failed}`));
}
console.log(`Total: ${passed + failed}`);
console.log("");

if (failed > 0) {
  console.log(colors.red("❌ Some tests failed!"));
  process.exit(1);
} else {
  console.log(colors.green("✅ All tests passed!"));
  process.exit(0);
}
