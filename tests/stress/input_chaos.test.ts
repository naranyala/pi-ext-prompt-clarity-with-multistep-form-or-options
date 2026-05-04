import { describe, it, expect, beforeEach, mock } from "bun:test";
import { AmbiguityDetector } from "../../src/features/prompt_clarity/ambiguity-detector";
import { PromptClarityAnalyzer } from "../../src/features/prompt_clarity/analyzer";
import { createMockApi, createMockContext } from "../../tests/mocks";

// Mock Rust CLI to fail, force TS fallback
mock.module("child_process", () => ({
  execSync: mock().mockImplementation(() => {
    throw new Error("Mocked CLI failure");
  }),
}));

describe("Input Chaos Stress Tests", () => {
  let api: any;
  let ctx: any;
  let detector: AmbiguityDetector;
  let analyzer: PromptClarityAnalyzer;

  beforeEach(() => {
    api = createMockApi();
    ctx = createMockContext();
    detector = new AmbiguityDetector(api);
    detector.register();
    analyzer = new PromptClarityAnalyzer(api);
  });

  describe("AmbiguityDetector (Heuristics)", () => {
    it("should handle extremely long strings without crashing (Memory/Regex Stress)", async () => {
      const longString = "a".repeat(100000);
      // We don't check the score, just that it doesn't throw or hang
      const startTime = Date.now();
      await api.__unstable_fireEvent("input", { text: longString }, ctx);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Should process within 1s
    });

    it("should handle emoji-only prompts (Unicode Stress)", async () => {
      const emojiString = "🤯🔥🚀🌈✨".repeat(50);
      await api.__unstable_fireEvent("input", { text: emojiString }, ctx);
    });

    it("should handle zero-width character strings (Sneaky Prompt Stress)", async () => {
      // "whatever" with zero-width joiners
      const sneakyString = "w\u200Fe\u200Ft\u200Fh\u200Fe\u200Fv\u200Fe\u200Fr";
      await api.__unstable_fireEvent("input", { text: sneakyString }, ctx);
    });

    it("should handle massive amount of whitespace", async () => {
      const whitespaceString = " ".repeat(1000) + "whatever" + " ".repeat(1000);
      await api.__unstable_fireEvent("input", { text: whitespaceString }, ctx);
    });

    it("should handle non-standard/unusual control characters", async () => {
      const controlChars = "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\x0C\x0D\x0E\x0F";
      await api.__unstable_fireEvent("input", { text: controlChars }, ctx);
    });
  });

  describe("PromptClarityAnalyzer (LLM Interface)", () => {
    it("should gracefully handle LLM returning massive amount of text", async () => {
      const massiveResponse = JSON.stringify({
        score: 0.9,
        dimensions: ["technology", "scope", "format", "context", "intent"]
      });
      // Repeat the string to make it large, but it's still one valid JSON object
      const largeValue = "a".repeat(100000);
      const massiveResponseWithLargeValue = JSON.stringify({
        score: 0.9,
        dimensions: ["technology", "scope", "format", "context", "intent"],
        extra: largeValue
      });
      
      api.chat = mock().mockResolvedValue(massiveResponseWithLargeValue);
      
      const report = await analyzer.analyze("some prompt");
      expect(report.score).toBe(0.9);
    });

    it("should handle LLM returning non-string/non-JSON (Garbage Stress)", async () => {
      api.chat = mock().mockResolvedValue("This is not JSON at all!");
      
      const report = await analyzer.analyze("some prompt");
      // Should fallback to default report instead of crashing
      expect(report.score).toBe(0.5);
      expect(report.dimensions).toEqual([]);
    });
  });
});
