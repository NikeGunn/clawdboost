import type { MoltbotPluginApi, PluginRuntime } from "moltbot/plugin-sdk";
import type { ClawdBoostManager } from "./manager.js";

type HookContext = {
  message?: string;
  channel?: string;
  sessionKey?: string;
  agentId?: string;
};

type AgentStartContext = {
  sessionKey?: string;
  agentId?: string;
  config?: Record<string, unknown>;
};

export function createClawdBoostHooks(manager: ClawdBoostManager, api: MoltbotPluginApi) {
  const pluginConfig = api.pluginConfig as Record<string, unknown> | undefined;
  const logInjections = pluginConfig?.logInjections === true;

  return {
    /**
     * Hook: message_received
     * Finds matching context and prepares it for injection
     */
    async onMessageReceived(ctx: HookContext): Promise<void> {
      if (!ctx.message) return;

      try {
        const matches = await manager.findMatchingContext({
          message: ctx.message,
          channel: ctx.channel,
          sessionKey: ctx.sessionKey,
        });

        if (matches.length > 0) {
          // Store matches in a temporary location for the agent start hook to pick up
          (globalThis as any).__clawdBoostPendingInjection = {
            sessionKey: ctx.sessionKey,
            matches,
            timestamp: Date.now(),
          };

          if (logInjections) {
            api.logger.info(
              `🚀 ClawdBoost: ${matches.length} context(s) matched for session ${ctx.sessionKey}`
            );
          }
        }
      } catch (err) {
        api.logger.error(`ClawdBoost message hook error: ${err}`);
      }
    },

    /**
     * Hook: before_agent_start
     * Injects the prepared context into the agent's system prompt
     */
    async onBeforeAgentStart(ctx: AgentStartContext): Promise<void> {
      try {
        const pending = (globalThis as any).__clawdBoostPendingInjection;

        // Clean up stale injections (older than 30 seconds)
        if (pending && Date.now() - pending.timestamp > 30000) {
          delete (globalThis as any).__clawdBoostPendingInjection;
          return;
        }

        // Check if this is the right session
        if (!pending || pending.sessionKey !== ctx.sessionKey) {
          return;
        }

        // Clear pending injection
        delete (globalThis as any).__clawdBoostPendingInjection;

        const { matches } = pending;
        if (!matches || matches.length === 0) return;

        const contextText = manager.formatContextForInjection(matches);

        if (logInjections) {
          api.logger.info(
            `🚀 ClawdBoost: Injecting ${matches.length} context(s) into agent turn`
          );
        }

        // The actual injection happens via the runtime system event mechanism
        // This is a simplified approach - in production, you'd want to integrate
        // with the proper system prompt injection point

        // For now, we emit an internal event that the agent runtime can pick up
        if (api.runtime && typeof (api.runtime as any).emitSystemEvent === "function") {
          (api.runtime as any).emitSystemEvent({
            type: "clawdboost_injection",
            content: contextText,
            sessionKey: ctx.sessionKey,
          });
        }
      } catch (err) {
        api.logger.error(`ClawdBoost agent start hook error: ${err}`);
      }
    },
  };
}
