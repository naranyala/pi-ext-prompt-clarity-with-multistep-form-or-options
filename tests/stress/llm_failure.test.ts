import { describe, it, expect, vi, beforeEach } from "bun:test";
import { PromptClarityAnalyzer } from "../../src/features/prompt_clarity/analyzer";
import { createMockApi, createMockContext } from "../../tests/mocks";

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
      api.chat = vi.fn().mockResolvedValue("This is definitely not JSON!");
      const report = await analyzer.analyze("some prompt");
      expect(report.score).toBe(0.5);
      expect(report.dimensions).toEqual([]);
      expect(report.isAmbiguous).toBe(false);
    });

    it("should handle LLM returning valid JSON but invalid Schema (Type Stress)", async () => {
      api.chat = vi.fn().mockResolvedValue({
        score: 0.8,
        dimensions: "technology" 
      });
      const report = await analyzer.analyze("some prompt");
      expect(report.score).toBe(0.8);
      expect(report.dimensions).toEqual(["technology"]);
    });

    it("should handle LLM returning an empty response", async () => {
      api.chat = vi.fn().mockResolvedValue("");
      const report = await analyzer.analyze("some prompt");
      expect(report.score).toBe(0.5);
      expect(report.dimensions).toEqual([]);
    });

    it("should handle LLM returning unexpected dimension values (Hallucination)", async () => {
      api.chat = vi.fn().mockResolvedValue({
        score: 0.8,
        dimensions: ["magic", "cosmic_horror", "transcendence"]
      });
      const report = await analyzer.analyze("some prompt");
      expect(report.score).toBe(0.8);
      expect(report.dimensions).toContain("magic");
    });
  });
});
