import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import os from "node:os";

import type { OpenClawConfig } from "openclaw/plugin-sdk";
import type { ClawdBoostConfig } from "./index.js";

// ============================================================================
// Types
// ============================================================================

export type ContextSnippet = {
  id: string;
  name: string;
  content: string;
  tags?: string[];
  patterns?: string[];
  timeRules?: TimeRule[];
  priority?: number;
  enabled?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TimeRule = {
  type: "hour" | "dayOfWeek" | "date" | "dateRange";
  value: string | number | number[];
  timezone?: string;
};

export type ContextRule = {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  priority: number;
  triggers: RuleTrigger[];
  actions: RuleAction[];
  createdAt: string;
  updatedAt: string;
};

export type RuleTrigger =
  | { type: "pattern"; pattern: string; flags?: string }
  | { type: "keyword"; keywords: string[] }
  | { type: "time"; timeRule: TimeRule }
  | { type: "channel"; channels: string[] }
  | { type: "always" };

export type RuleAction =
  | { type: "inject_snippet"; snippetId: string }
  | { type: "inject_text"; text: string }
  | { type: "inject_file"; filePath: string };

export type ContextMatch = {
  snippetId?: string;
  ruleId?: string;
  content: string;
  source: "snippet" | "rule" | "time";
  priority: number;
};

export type ManagerLogger = {
  debug?: (message: string) => void;
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

// ============================================================================
// Manager
// ============================================================================

export class ClawdBoostManager {
  private static instance: ClawdBoostManager | null = null;

  private readonly config: OpenClawConfig;
  private readonly pluginConfig: ClawdBoostConfig;
  private readonly logger: ManagerLogger;
  private readonly resolvePath: (input: string) => string;

  private snippetsDir: string;
  private rulesFile: string;
  private snippetsCache: Map<string, ContextSnippet> = new Map();
  private rulesCache: ContextRule[] = [];
  private lastSnippetsLoad = 0;
  private lastRulesLoad = 0;

  private readonly CACHE_TTL_MS = 5000;

  private constructor(params: {
    config: OpenClawConfig;
    pluginConfig: ClawdBoostConfig;
    logger: ManagerLogger;
    resolvePath: (input: string) => string;
  }) {
    this.config = params.config;
    this.pluginConfig = params.pluginConfig;
    this.logger = params.logger;
    this.resolvePath = params.resolvePath;

    const baseDir = path.join(os.homedir(), ".openclaw", "clawdboost");
    this.snippetsDir = params.pluginConfig.snippetsPath
      ? this.resolvePath(params.pluginConfig.snippetsPath)
      : path.join(baseDir, "snippets");
    this.rulesFile = params.pluginConfig.rulesPath
      ? this.resolvePath(params.pluginConfig.rulesPath)
      : path.join(baseDir, "rules.json");

    this.ensureDirectories();
  }

  static getInstance(params: {
    config: OpenClawConfig;
    pluginConfig: ClawdBoostConfig;
    logger: ManagerLogger;
    resolvePath: (input: string) => string;
  }): ClawdBoostManager {
    if (!ClawdBoostManager.instance) {
      ClawdBoostManager.instance = new ClawdBoostManager(params);
    }
    return ClawdBoostManager.instance;
  }

  static resetInstance(): void {
    ClawdBoostManager.instance = null;
  }

  // ============================================================================
  // Directory Management
  // ============================================================================

  private ensureDirectories(): void {
    try {
      if (!fsSync.existsSync(this.snippetsDir)) {
        fsSync.mkdirSync(this.snippetsDir, { recursive: true });
        this.logger.info(`Created snippets directory: ${this.snippetsDir}`);
      }
      const rulesDir = path.dirname(this.rulesFile);
      if (!fsSync.existsSync(rulesDir)) {
        fsSync.mkdirSync(rulesDir, { recursive: true });
      }
      if (!fsSync.existsSync(this.rulesFile)) {
        fsSync.writeFileSync(this.rulesFile, JSON.stringify({ rules: [] }, null, 2));
        this.logger.info(`Created rules file: ${this.rulesFile}`);
      }
    } catch (err) {
      this.logger.error(`Failed to ensure directories: ${err}`);
    }
  }

  getSnippetsDir(): string {
    return this.snippetsDir;
  }

  getRulesFile(): string {
    return this.rulesFile;
  }

  // ============================================================================
  // Snippet Operations
  // ============================================================================

  async loadSnippets(force = false): Promise<Map<string, ContextSnippet>> {
    const now = Date.now();
    if (!force && now - this.lastSnippetsLoad < this.CACHE_TTL_MS) {
      return this.snippetsCache;
    }

    try {
      const files = await fs.readdir(this.snippetsDir);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      const newCache = new Map<string, ContextSnippet>();
      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(path.join(this.snippetsDir, file), "utf-8");
          const snippet = JSON.parse(content) as ContextSnippet;
          if (snippet.id && snippet.content) {
            newCache.set(snippet.id, snippet);
          }
        } catch (err) {
          this.logger.warn(`Failed to load snippet ${file}: ${err}`);
        }
      }

      this.snippetsCache = newCache;
      this.lastSnippetsLoad = now;
      return this.snippetsCache;
    } catch (err) {
      this.logger.error(`Failed to load snippets: ${err}`);
      return this.snippetsCache;
    }
  }

  async getSnippet(id: string): Promise<ContextSnippet | null> {
    await this.loadSnippets();
    return this.snippetsCache.get(id) ?? null;
  }

  async getAllSnippets(): Promise<ContextSnippet[]> {
    await this.loadSnippets();
    return Array.from(this.snippetsCache.values());
  }

  async saveSnippet(snippet: ContextSnippet): Promise<void> {
    const now = new Date().toISOString();
    const toSave: ContextSnippet = {
      ...snippet,
      updatedAt: now,
      createdAt: snippet.createdAt || now,
    };

    const filePath = path.join(this.snippetsDir, `${snippet.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(toSave, null, 2));
    this.snippetsCache.set(snippet.id, toSave);
    this.logger.info(`Saved snippet: ${snippet.id}`);
  }

  async deleteSnippet(id: string): Promise<boolean> {
    const filePath = path.join(this.snippetsDir, `${id}.json`);
    try {
      await fs.unlink(filePath);
      this.snippetsCache.delete(id);
      this.logger.info(`Deleted snippet: ${id}`);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Rule Operations
  // ============================================================================

  async loadRules(force = false): Promise<ContextRule[]> {
    const now = Date.now();
    if (!force && now - this.lastRulesLoad < this.CACHE_TTL_MS) {
      return this.rulesCache;
    }

    try {
      const content = await fs.readFile(this.rulesFile, "utf-8");
      const data = JSON.parse(content) as { rules: ContextRule[] };
      this.rulesCache = data.rules || [];
      this.lastRulesLoad = now;
      return this.rulesCache;
    } catch (err) {
      this.logger.error(`Failed to load rules: ${err}`);
      return this.rulesCache;
    }
  }

  async saveRules(rules: ContextRule[]): Promise<void> {
    await fs.writeFile(this.rulesFile, JSON.stringify({ rules }, null, 2));
    this.rulesCache = rules;
    this.logger.info(`Saved ${rules.length} rules`);
  }

  async addRule(rule: Omit<ContextRule, "createdAt" | "updatedAt">): Promise<ContextRule> {
    const rules = await this.loadRules(true);
    const now = new Date().toISOString();
    const newRule: ContextRule = {
      ...rule,
      createdAt: now,
      updatedAt: now,
    };
    rules.push(newRule);
    await this.saveRules(rules);
    return newRule;
  }

  async updateRule(id: string, updates: Partial<ContextRule>): Promise<ContextRule | null> {
    const rules = await this.loadRules(true);
    const index = rules.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const updated: ContextRule = {
      ...rules[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    rules[index] = updated;
    await this.saveRules(rules);
    return updated;
  }

  async deleteRule(id: string): Promise<boolean> {
    const rules = await this.loadRules(true);
    const filtered = rules.filter((r) => r.id !== id);
    if (filtered.length === rules.length) return false;
    await this.saveRules(filtered);
    return true;
  }

  // ============================================================================
  // Context Matching
  // ============================================================================

  async findMatchingContext(params: {
    message: string;
    channel?: string;
    sessionKey?: string;
  }): Promise<ContextMatch[]> {
    const matches: ContextMatch[] = [];
    const { message, channel } = params;

    if (this.pluginConfig.enabled === false) {
      return matches;
    }

    // Load data
    const [snippets, rules] = await Promise.all([
      this.loadSnippets(),
      this.loadRules(),
    ]);

    // Check pattern-based snippets
    if (this.pluginConfig.enablePatternMatch !== false) {
      for (const snippet of snippets.values()) {
        if (snippet.enabled === false) continue;
        if (snippet.patterns && snippet.patterns.length > 0) {
          for (const pattern of snippet.patterns) {
            try {
              const regex = new RegExp(pattern, "i");
              if (regex.test(message)) {
                matches.push({
                  snippetId: snippet.id,
                  content: this.truncateContent(snippet.content),
                  source: "snippet",
                  priority: snippet.priority ?? 50,
                });
                break;
              }
            } catch {
              // Invalid regex, skip
            }
          }
        }
      }
    }

    // Check time-based snippets
    if (this.pluginConfig.enableTimeAware !== false) {
      for (const snippet of snippets.values()) {
        if (snippet.enabled === false) continue;
        if (snippet.timeRules && snippet.timeRules.length > 0) {
          if (this.matchesTimeRules(snippet.timeRules)) {
            matches.push({
              snippetId: snippet.id,
              content: this.truncateContent(snippet.content),
              source: "time",
              priority: snippet.priority ?? 40,
            });
          }
        }
      }
    }

    // Check rules
    for (const rule of rules) {
      if (!rule.enabled) continue;

      let triggered = false;
      for (const trigger of rule.triggers) {
        if (this.checkTrigger(trigger, message, channel)) {
          triggered = true;
          break;
        }
      }

      if (triggered) {
        for (const action of rule.actions) {
          const content = await this.executeAction(action, snippets);
          if (content) {
            matches.push({
              ruleId: rule.id,
              content: this.truncateContent(content),
              source: "rule",
              priority: rule.priority,
            });
          }
        }
      }
    }

    // Sort by priority and limit
    matches.sort((a, b) => b.priority - a.priority);
    const maxSnippets = this.pluginConfig.maxSnippetsPerTurn ?? 5;
    return matches.slice(0, maxSnippets);
  }

  private checkTrigger(trigger: RuleTrigger, message: string, channel?: string): boolean {
    switch (trigger.type) {
      case "always":
        return true;

      case "pattern": {
        try {
          const regex = new RegExp(trigger.pattern, trigger.flags || "i");
          return regex.test(message);
        } catch {
          return false;
        }
      }

      case "keyword": {
        const lower = message.toLowerCase();
        return trigger.keywords.some((kw) => lower.includes(kw.toLowerCase()));
      }

      case "time":
        return this.matchesTimeRules([trigger.timeRule]);

      case "channel":
        return channel ? trigger.channels.includes(channel) : false;

      default:
        return false;
    }
  }

  private matchesTimeRules(rules: TimeRule[]): boolean {
    const now = new Date();
    const tz = this.pluginConfig.timezone || "local";

    for (const rule of rules) {
      switch (rule.type) {
        case "hour": {
          const hour = now.getHours();
          if (typeof rule.value === "number") {
            if (hour !== rule.value) return false;
          } else if (Array.isArray(rule.value)) {
            if (!rule.value.includes(hour)) return false;
          }
          break;
        }

        case "dayOfWeek": {
          const day = now.getDay();
          if (typeof rule.value === "number") {
            if (day !== rule.value) return false;
          } else if (Array.isArray(rule.value)) {
            if (!rule.value.includes(day)) return false;
          }
          break;
        }

        case "date": {
          const dateStr = now.toISOString().split("T")[0];
          if (dateStr !== rule.value) return false;
          break;
        }

        case "dateRange": {
          const dateStr = now.toISOString().split("T")[0];
          if (typeof rule.value === "string") {
            const [start, end] = rule.value.split("/");
            if (dateStr < start || dateStr > end) return false;
          }
          break;
        }
      }
    }

    return true;
  }

  private async executeAction(
    action: RuleAction,
    snippets: Map<string, ContextSnippet>
  ): Promise<string | null> {
    switch (action.type) {
      case "inject_snippet": {
        const snippet = snippets.get(action.snippetId);
        return snippet?.content ?? null;
      }

      case "inject_text":
        return action.text;

      case "inject_file": {
        try {
          const filePath = this.resolvePath(action.filePath);
          const content = await fs.readFile(filePath, "utf-8");
          return content;
        } catch {
          return null;
        }
      }

      default:
        return null;
    }
  }

  private truncateContent(content: string): string {
    const maxChars = this.pluginConfig.maxSnippetChars ?? 2000;
    if (content.length <= maxChars) return content;
    return content.slice(0, maxChars) + "\n[... truncated]";
  }

  // ============================================================================
  // Formatting
  // ============================================================================

  formatContextForInjection(matches: ContextMatch[]): string {
    if (matches.length === 0) return "";

    const lines = ["[ClawdBoost — relevant context injected automatically]", ""];

    for (const match of matches) {
      const label = match.snippetId
        ? `Snippet: ${match.snippetId}`
        : match.ruleId
          ? `Rule: ${match.ruleId}`
          : "Context";
      lines.push(`--- ${label} ---`);
      lines.push(match.content);
      lines.push("");
    }

    lines.push("[End ClawdBoost]");
    return lines.join("\n");
  }
}
