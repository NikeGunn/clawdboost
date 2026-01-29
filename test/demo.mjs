#!/usr/bin/env node
/**
 * ClawdBoost - Interactive Demo
 * 
 * This demo shows how ClawdBoost works without needing moltbot installed.
 * Run with: node test/demo.mjs
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";

// Colors
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

// Demo directory
const DEMO_DIR = path.join(os.homedir(), ".clawdboost-demo");
const SNIPPETS_DIR = path.join(DEMO_DIR, "snippets");
const RULES_FILE = path.join(DEMO_DIR, "rules.json");

// ============================================================================
// Core Functions (simplified from manager.ts)
// ============================================================================

function ensureDirectories() {
  if (!fs.existsSync(SNIPPETS_DIR)) {
    fs.mkdirSync(SNIPPETS_DIR, { recursive: true });
  }
  if (!fs.existsSync(RULES_FILE)) {
    fs.writeFileSync(RULES_FILE, JSON.stringify({ rules: [] }, null, 2));
  }
}

function loadSnippets() {
  const snippets = new Map();
  const files = fs.readdirSync(SNIPPETS_DIR).filter(f => f.endsWith(".json"));
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(SNIPPETS_DIR, file), "utf-8");
      const snippet = JSON.parse(content);
      if (snippet.id) snippets.set(snippet.id, snippet);
    } catch (e) {}
  }
  return snippets;
}

function loadRules() {
  try {
    const content = fs.readFileSync(RULES_FILE, "utf-8");
    return JSON.parse(content).rules || [];
  } catch {
    return [];
  }
}

function saveSnippet(snippet) {
  const filePath = path.join(SNIPPETS_DIR, `${snippet.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(snippet, null, 2));
}

function saveRules(rules) {
  fs.writeFileSync(RULES_FILE, JSON.stringify({ rules }, null, 2));
}

function findMatches(message) {
  const matches = [];
  const snippets = loadSnippets();
  const rules = loadRules();
  
  // Check snippets with patterns
  for (const [id, snippet] of snippets) {
    if (snippet.enabled === false) continue;
    if (snippet.patterns && snippet.patterns.length > 0) {
      for (const pattern of snippet.patterns) {
        try {
          const regex = new RegExp(pattern, "i");
          if (regex.test(message)) {
            matches.push({
              type: "snippet",
              id: snippet.id,
              name: snippet.name,
              content: snippet.content,
              priority: snippet.priority || 50,
            });
            break;
          }
        } catch {}
      }
    }
  }
  
  // Check rules
  for (const rule of rules) {
    if (!rule.enabled) continue;
    
    let triggered = false;
    for (const trigger of rule.triggers) {
      if (trigger.type === "keyword") {
        const lower = message.toLowerCase();
        if (trigger.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
          triggered = true;
          break;
        }
      } else if (trigger.type === "pattern") {
        try {
          const regex = new RegExp(trigger.pattern, trigger.flags || "i");
          if (regex.test(message)) {
            triggered = true;
            break;
          }
        } catch {}
      }
    }
    
    if (triggered) {
      for (const action of rule.actions) {
        if (action.type === "inject_text") {
          matches.push({
            type: "rule",
            id: rule.id,
            name: rule.name,
            content: action.text,
            priority: rule.priority,
          });
        } else if (action.type === "inject_snippet") {
          const snippet = snippets.get(action.snippetId);
          if (snippet) {
            matches.push({
              type: "rule",
              id: rule.id,
              name: rule.name,
              content: snippet.content,
              priority: rule.priority,
            });
          }
        }
      }
    }
  }
  
  return matches.sort((a, b) => b.priority - a.priority);
}

function formatContext(matches) {
  if (matches.length === 0) return "";
  
  const lines = [
    `${c.cyan}╔══════════════════════════════════════════════════════════════╗${c.reset}`,
    `${c.cyan}║${c.reset} ${c.bold}ClawdBoost${c.reset} — Relevant context injected automatically       ${c.cyan}║${c.reset}`,
    `${c.cyan}╠══════════════════════════════════════════════════════════════╣${c.reset}`,
  ];
  
  for (const match of matches) {
    lines.push(`${c.cyan}║${c.reset} ${c.yellow}${match.type.toUpperCase()}:${c.reset} ${match.name} (priority: ${match.priority})`);
    lines.push(`${c.cyan}║${c.reset} ${c.dim}${"-".repeat(60)}${c.reset}`);
    
    // Word wrap content
    const words = match.content.split(" ");
    let line = `${c.cyan}║${c.reset}   `;
    for (const word of words) {
      if (line.length + word.length > 68) {
        lines.push(line);
        line = `${c.cyan}║${c.reset}   ${word} `;
      } else {
        line += word + " ";
      }
    }
    if (line.trim().length > 5) lines.push(line);
    lines.push(`${c.cyan}║${c.reset}`);
  }
  
  lines.push(`${c.cyan}╚══════════════════════════════════════════════════════════════╝${c.reset}`);
  return lines.join("\n");
}

// ============================================================================
// Demo Setup
// ============================================================================

function setupDemo() {
  ensureDirectories();
  
  // Create demo snippets
  saveSnippet({
    id: "code-review",
    name: "Code Review Guidelines",
    content: "When reviewing code: Check for security issues, verify error handling, look for performance problems, ensure tests cover edge cases.",
    patterns: ["review", "PR", "pull request", "code review"],
    priority: 60,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  saveSnippet({
    id: "meeting-prep",
    name: "Meeting Preparation",
    content: "For meetings: Review agenda, prepare talking points, gather relevant documents, note any blockers to discuss.",
    patterns: ["meeting", "sync", "standup", "call"],
    priority: 50,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  saveSnippet({
    id: "debugging-tips",
    name: "Debugging Checklist",
    content: "Debug checklist: Check logs first, reproduce the issue, isolate the problem, verify assumptions, use debugger breakpoints.",
    patterns: ["debug", "bug", "error", "fix", "broken"],
    priority: 55,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Create demo rules
  const rules = [
    {
      id: "urgent-priority",
      name: "Urgent Request Handler",
      description: "Inject priority context for urgent requests",
      enabled: true,
      priority: 80,
      triggers: [
        { type: "keyword", keywords: ["urgent", "asap", "emergency", "critical"] }
      ],
      actions: [
        { type: "inject_text", text: "⚠️ URGENT: Prioritize this request. Check for blockers, escalate if needed, provide ETA." }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "github-helper",
      name: "GitHub Context",
      enabled: true,
      priority: 55,
      triggers: [
        { type: "keyword", keywords: ["github", "repository", "commit", "branch", "merge"] }
      ],
      actions: [
        { type: "inject_text", text: "GitHub reminder: Use conventional commits, keep PRs focused, link issues in descriptions." }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  saveRules(rules);
  
  console.log(`${c.green}✓${c.reset} Demo snippets and rules created in ${DEMO_DIR}`);
}

// ============================================================================
// Interactive Demo
// ============================================================================

async function runInteractiveDemo() {
  console.log(`
${c.bold}${c.magenta}╔═══════════════════════════════════════════════════════════════╗${c.reset}
${c.bold}${c.magenta}║${c.reset}        ${c.bold}🚀 ClawdBoost - Interactive Demo${c.reset}                      ${c.bold}${c.magenta}║${c.reset}
${c.bold}${c.magenta}╚═══════════════════════════════════════════════════════════════╝${c.reset}

This demo shows how ClawdBoost automatically injects relevant
context based on your messages.

${c.yellow}Demo snippets loaded:${c.reset}
  • code-review - Triggers on: review, PR, pull request
  • meeting-prep - Triggers on: meeting, sync, standup
  • debugging-tips - Triggers on: debug, bug, error

${c.yellow}Demo rules loaded:${c.reset}
  • urgent-priority - Triggers on: urgent, asap, critical
  • github-helper - Triggers on: github, commit, branch

${c.dim}Type a message to see what context would be injected.${c.reset}
${c.dim}Type 'list' to see all snippets, 'quit' to exit.${c.reset}
`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question(`${c.blue}You:${c.reset} `, (input) => {
      const message = input.trim();
      
      if (!message) {
        prompt();
        return;
      }
      
      if (message.toLowerCase() === "quit" || message.toLowerCase() === "exit") {
        console.log(`\n${c.green}Thanks for trying ClawdBoost! 👋${c.reset}\n`);
        rl.close();
        return;
      }
      
      if (message.toLowerCase() === "list") {
        const snippets = loadSnippets();
        const rules = loadRules();
        
        console.log(`\n${c.yellow}Snippets (${snippets.size}):${c.reset}`);
        for (const [id, s] of snippets) {
          console.log(`  ${c.green}•${c.reset} ${id}: ${s.patterns?.join(", ") || "no patterns"}`);
        }
        
        console.log(`\n${c.yellow}Rules (${rules.length}):${c.reset}`);
        for (const r of rules) {
          console.log(`  ${c.green}•${c.reset} ${r.id}: ${r.name}`);
        }
        console.log("");
        
        prompt();
        return;
      }
      
      // Find matching context
      const matches = findMatches(message);
      
      if (matches.length === 0) {
        console.log(`\n${c.dim}No context matched for this message.${c.reset}\n`);
      } else {
        console.log(`\n${c.green}Found ${matches.length} matching context(s):${c.reset}\n`);
        console.log(formatContext(matches));
        console.log("");
      }
      
      prompt();
    });
  };

  prompt();
}

// ============================================================================
// Main
// ============================================================================

console.clear();
setupDemo();
runInteractiveDemo();
