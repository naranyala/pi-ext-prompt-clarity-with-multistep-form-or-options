import { describe, it, expect, vi, beforeEach } from "bun:test";
import { AmbiguityDetector } from "../../../src/features/prompt_clarity/ambiguity-detector";
import { createMockApi, createMockContext } from "../../mocks";

describe("AmbiguityDetector Edge Cases", () => {
  let api: any;
  let ctx: any;
  let detector: AmbiguityDetector;

  beforeEach(() => {
    api = createMockApi();
    ctx = createMockContext();
    detector = new AmbiguityDetector(api);
    detector.register();
  });

  it("should not flag 'fetch' as vague due to 'etc' being a substring", async () => {
    // 'fetching data now is really great and wonderful' (length 8, score 0)
    // If 'etc' is detected in 'fetching', score becomes 0.15 -> info
    // If 'etc' is NOT detected, score = 0 -> nothing
    await api.__unstable_fireEvent("input", { text: "fetching data now is really great and wonderful" }, ctx);
    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });

  it("should handle multiple occurrences of the same vague keyword", async () => {
    // "whatever whatever" (length 2, score 0.5)
    // With old implementation: highVagueMatch = 1. Score = 0.5 + 0.3 = 0.8 -> error
    // With new implementation: highVagueMatches = 2. Score = 0.5 + 0.6 = 1.1 -> capped at 1.0 -> error
    // Let's use longer words to avoid length penalty.
    // "please do whatever whatever" (length 4, score 0.2)
    // If 2 "whatever": score = 0.2 + 0.6 = 0.8 -> error
    // If 1 "whatever": score = 0.2 + 0.3 = 0.5 -> warning
    
    await api.__unstable_fireEvent("input", { text: "please do whatever whatever" }, ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.any(String), "error");
  });
});
