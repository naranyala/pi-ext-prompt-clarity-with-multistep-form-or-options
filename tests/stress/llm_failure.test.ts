import { describe, it, expect, beforeEach, mock } from "bun:test";
import { PromptClarityAnalyzer } from "../../src/features/prompt_clarity/analyzer";
import { createMockApi, createMockContext } from "../../tests/mocks";

// Mock Rust CLI to fail, force TS fallback
mock.module("child_process", () => ({
  execSync: mock().mockImplementation(() => {
    throw new Error("Mocked CLI failure");
  }),
}));

describe("LLM Failure & Hallucination Stress Tests", () => {
  let api: any;
  let ctx: any;
  let analyzer: PromptClarityAnalyzer;

  beforeEach(() => {
    api = createMockApi();
    ctx = createMockContext();
    analyzer = new PromptClarityAnalyzer(api);
  });

  describe("Analyzer Resilience", () => {
    it("should handle LLM returning malformed JSON (Syntax Error)", async () => {
      api.chat = mock().mockResolvedValue("This is definitely not JSON!");
      const report = await analyzer.analyze("some prompt");
      expect(report.score).toBe(0.5);
      expect(report.dimensions).toEqual([]);
      expect(report.isAmbiguous).toBe(false);
    });

    it("should handle LLM returning valid JSON but invalid Schema (Type Stress)", async () => {
      api.chat = mock().mockResolvedValue({
        score: 0.8,
        dimensions: "technology" // Invalid: should be array
      });
      const report = await analyzer.analyze("some prompt");
      expect(report.score).toBe(0.8);
      expect(report.dimensions).toEqual([]); // Invalid dimensions ignored
    });

    it("should handle LLM returning an empty response", async () => {
      api.chat = mock().mockResolvedValue("");
      const report = await analyzer.analyze("some prompt");
      expect(report.score).toBe(0.5);
      expect(report.dimensions).toEqual([]);
    });

    it("should handle LLM returning unexpected dimension values (Hallucination)", async () => {
      api.chat = mock().mockResolvedValue({
        score: 0.8,
        dimensions: ["magic", "cosmic_horror", "transcendence"]
      });
      const report = await analyzer.analyze("some prompt");
      expect(report.score).toBe(0.8);
      expect(report.dimensions).toContain("magic");
    });
  });
});
