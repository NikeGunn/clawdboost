import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ClawdBoostManager } from "./manager.js";

// Mock fs modules
vi.mock("node:fs/promises", () => ({
  default: {
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
    mkdir: vi.fn(),
  },
}));

vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
}));

describe("ClawdBoostManager", () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  const mockConfig = {} as any;
  const mockPluginConfig = {
    enabled: true,
    enableTimeAware: true,
    enablePatternMatch: true,
    maxSnippetsPerTurn: 5,
    maxSnippetChars: 2000,
  };

  beforeEach(() => {
    ClawdBoostManager.resetInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    ClawdBoostManager.resetInstance();
  });

  describe("getInstance", () => {
    it("should create a singleton instance", () => {
      const manager1 = ClawdBoostManager.getInstance({
        config: mockConfig,
        pluginConfig: mockPluginConfig,
        logger: mockLogger,
        resolvePath: (p) => p,
      });

      const manager2 = ClawdBoostManager.getInstance({
        config: mockConfig,
        pluginConfig: mockPluginConfig,
        logger: mockLogger,
        resolvePath: (p) => p,
      });

      expect(manager1).toBe(manager2);
    });
  });

  describe("formatContextForInjection", () => {
    it("should format matches correctly", () => {
      const manager = ClawdBoostManager.getInstance({
        config: mockConfig,
        pluginConfig: mockPluginConfig,
        logger: mockLogger,
        resolvePath: (p) => p,
      });

      const matches = [
        {
          snippetId: "test-snippet",
          content: "Test content",
          source: "snippet" as const,
          priority: 50,
        },
      ];

      const result = manager.formatContextForInjection(matches);

      expect(result).toContain("[ClawdBoost");
      expect(result).toContain("test-snippet");
      expect(result).toContain("Test content");
      expect(result).toContain("[End ClawdBoost]");
    });

    it("should return empty string for no matches", () => {
      const manager = ClawdBoostManager.getInstance({
        config: mockConfig,
        pluginConfig: mockPluginConfig,
        logger: mockLogger,
        resolvePath: (p) => p,
      });

      const result = manager.formatContextForInjection([]);
      expect(result).toBe("");
    });
  });

  describe("directory paths", () => {
    it("should return correct snippets directory", () => {
      const manager = ClawdBoostManager.getInstance({
        config: mockConfig,
        pluginConfig: mockPluginConfig,
        logger: mockLogger,
        resolvePath: (p) => p,
      });

      const snippetsDir = manager.getSnippetsDir();
      expect(snippetsDir).toContain("clawdboost");
      expect(snippetsDir).toContain("snippets");
    });

    it("should return correct rules file", () => {
      const manager = ClawdBoostManager.getInstance({
        config: mockConfig,
        pluginConfig: mockPluginConfig,
        logger: mockLogger,
        resolvePath: (p) => p,
      });

      const rulesFile = manager.getRulesFile();
      expect(rulesFile).toContain("clawdboost");
      expect(rulesFile).toContain("rules.json");
    });
  });
});

describe("Time rule matching", () => {
  it("should be testable via findMatchingContext", async () => {
    // Time-based tests would require mocking Date
    // This is a placeholder for more comprehensive tests
    expect(true).toBe(true);
  });
});
