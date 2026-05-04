import { describe, it, expect, beforeEach, mock } from "bun:test";
import { AmbiguityDetector } from "../../../src/features/prompt_clarity/ambiguity-detector";
import { createMockApi, createMockContext } from "../../mocks";

// Mock child_process to force Rust CLI failure, use TS heuristics
mock.module("child_process", () => ({
  execSync: mock().mockImplementation(() => {
    throw new Error("Mocked CLI failure");
  }),
}));

// Define Key constants manually since we are mocking the whole module
const Key = {
  up: "\x1b[A",
  down: "\x1b[B",
  right: "\x1b[C",
  left: "\x1b[D",
  tab: "\t",
  enter: "\r",
  escape: "\x1b",
  shift: (k: string) => k, // simplified
};

// Mock Editor to capture onSubmit
let capturedOnSubmit: ((val: string) => void) | null = null;
mock.module("@mariozechner/pi-tui", () => {
   return {
     Key: Key,
     matchesKey: (data: string, key: string) => data === key,
     truncateToWidth: (s: string, w: number) => s.substring(0, w),
     Editor: mock().mockImplementation(() => ({
       handleInput: mock(),
       setText: mock(),
       render: mock().mockReturnValue([]),
       set onSubmit(fn: any) {
         capturedOnSubmit = fn;
       },
     })),
   };
});

describe("AmbiguityDetector", () => {
  let api: any;
  let ctx: any;
  let detector: AmbiguityDetector;

  beforeEach(() => {
    api = createMockApi();
    ctx = createMockContext();
    detector = new AmbiguityDetector(api);
    detector.register();
  });

  it("should notify error for very vague prompt (score >= 0.8)", async () => {
    // "whatever" (0.3) + length < 3 words (0.5) = 0.8
    await api.__unstable_fireEvent("input", { text: "whatever" }, ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("very vague"),
      "error"
    );
  });

  it("should notify warning for slightly ambiguous prompt (score >= 0.4)", async () => {
    // "maybe" (0.15) + length < 3 words (0.5) = 0.65
    await api.__unstable_fireEvent("input", { text: "maybe" }, ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("slightly ambiguous"),
      "warning"
    );
  });

  it("should notify info for mildly ambiguous prompt (score >= 0.2)", async () => {
    // "maybe" (0.15) + length < 8 words (0.2) = 0.35
    await api.__unstable_fireEvent("input", { text: "maybe it is okay" }, ctx);

    expect(ctx.ui.notify).toHaveBeenCalledWith(
      expect.stringContaining("Tip: You can use /clarify"),
      "info"
    );
  });

  it("should not notify for precise prompts", async () => {
    // Long, precise prompt: should have score < 0.2
    await api.__unstable_fireEvent("input", { text: "Please execute the following command on the server immediately." }, ctx);

    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });

  it("should handle multiple vague keywords", async () => {
    // "whatever" (0.3) + "somehow" (0.3) + length < 8 (0.2) = 0.8
    await api.__unstable_fireEvent("input", { text: "do whatever somehow" }, ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.any(String), "error");
  });

  it("should be case insensitive", async () => {
    // "WHATEVER" (0.3) + length < 3 (0.5) = 0.8
    await api.__unstable_fireEvent("input", { text: "WHATEVER" }, ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.any(String), "error");
  });

  it("should handle non-English characters", async () => {
    // Just checking it doesn't crash and handles length/punctuation
    await api.__unstable_fireEvent("input", { text: "你好" }, ctx); // length 2 < 3 (0.5) -> warning
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.any(String), "warning");
  });

  it("should handle prompts that are only vague keywords", async () => {
    // "maybe probably roughly" -> 0.15 * 3 (0.45) + length 3 (0.2) = 0.65 -> warning
    await api.__unstable_fireEvent("input", { text: "maybe probably roughly" }, ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.any(String), "warning");
  });

  it("should handle punctuation correctly", async () => {
    // "maybe" (0.15) + length < 8 (0.2) = 0.35
    // Without punctuation and length > 5: + 0.1
    // "maybe I will do it somehow" (length 6)
    // keywords: maybe (0.15), somehow (0.3) = 0.45
    // Total: 0.75 -> warning
    await api.__unstable_fireEvent("input", { text: "maybe I will do it somehow" }, ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.any(String), "warning");

    // With punctuation: "maybe I will do it somehow."
    // Total: 0.75 - 0.1 = 0.65 -> warning
    ctx.ui.notify.mockClear();
    await api.__unstable_fireEvent("input", { text: "maybe I will do it somehow." }, ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.any(String), "warning");
  });

  it("should handle empty or whitespace input", async () => {
    // length < 3 (0.5) + no keywords (0) = 0.5 -> warning
    await api.__unstable_fireEvent("input", { text: "" }, ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.any(String), "warning");
  });

  it("should not flag 'fetch' as vague due to 'etc' being a substring", async () => {
    // 'fetching data now is really great and wonderful' (length 8, score 0)
    await api.__unstable_fireEvent("input", { text: "fetching data now is really great and wonderful" }, ctx);
    expect(ctx.ui.notify).not.toHaveBeenCalled();
  });

  it("should handle multiple occurrences of the same vague keyword", async () => {
    // "please do whatever whatever" (length 4, score 0.2)
    // 2 * 0.3 = 0.6. 0.2 + 0.6 = 0.8 -> error
    await api.__unstable_fireEvent("input", { text: "please do whatever whatever" }, ctx);
    expect(ctx.ui.notify).toHaveBeenCalledWith(expect.any(String), "error");
  });
});
