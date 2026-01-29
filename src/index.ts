import type { MoltbotPluginApi, MoltbotPluginToolContext } from "moltbot/plugin-sdk";

import { createClawdBoostTool } from "./clawdboost-tool.js";
import { createClawdBoostHooks } from "./hooks.js";
import { ClawdBoostManager } from "./manager.js";
import { registerClawdBoostCli } from "./cli.js";

export type ClawdBoostConfig = {
  enabled?: boolean;
  snippetsPath?: string;
  rulesPath?: string;
  maxSnippetsPerTurn?: number;
  maxSnippetChars?: number;
  enableTimeAware?: boolean;
  enablePatternMatch?: boolean;
  logInjections?: boolean;
  timezone?: string;
};

const clawdBoostPlugin = {
  id: "clawdboost",
  name: "ClawdBoost",
  description:
    "🚀 Supercharge your Clawdbot with smart context injection - pattern-matched, time-aware context snippets",

  register(api: MoltbotPluginApi) {
    const pluginConfig = (api.pluginConfig ?? {}) as ClawdBoostConfig;

    // Initialize the manager singleton
    const manager = ClawdBoostManager.getInstance({
      config: api.config,
      pluginConfig,
      logger: api.logger,
      resolvePath: api.resolvePath,
    });

    // Register the main tool for managing snippets and rules
    api.registerTool(
      (ctx: MoltbotPluginToolContext) => {
        if (ctx.sandboxed) return null;
        return createClawdBoostTool(manager, api);
      },
      { names: ["clawdboost", "cb"], optional: true }
    );

    // Register hooks for automatic context injection
    const hooks = createClawdBoostHooks(manager, api);
    api.registerHook("message_received", hooks.onMessageReceived, {
      name: "clawdboost-injection",
      description: "Inject relevant context snippets based on message patterns",
    });

    // Register before_agent_start hook for time-aware context
    api.on("before_agent_start", hooks.onBeforeAgentStart, { priority: 10 });

    // Register CLI commands
    api.registerCli(
      (ctx) => registerClawdBoostCli(ctx, manager),
      { commands: ["clawdboost", "cb"] }
    );

    api.logger.info("🚀 ClawdBoost plugin registered successfully!");
  },
};

export default clawdBoostPlugin;
