import { describe, it, expect, vi, beforeEach } from "bun:test";
import { QuestionnaireUI, type Question } from "../../../src/features/prompt_clarity/questionnaire-ui";
import { createMockContext } from "../../mocks";

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
vi.mock("@mariozechner/pi-tui", () => {
  return {
    Key: Key,
    matchesKey: (data: string, key: string) => data === key,
    truncateToWidth: (s: string, w: number) => s.substring(0, w),
    Editor: vi.fn().mockImplementation(() => ({
      handleInput: vi.fn(),
      setText: vi.fn(),
      render: vi.fn().mockReturnValue([]),
      set onSubmit(fn: any) {
        capturedOnSubmit = fn;
      },
    })),
  };
});

describe("QuestionnaireUI", () => {
  let mockCtx: any;

  beforeEach(() => {
    capturedOnSubmit = null;
    mockCtx = createMockContext();
    mockCtx.hasUI = true;
    mockCtx.ui.theme = {
      fg: (color: string, text: string) => text,
      bg: (bg: string, fg: any) => fg,
      bold: (text: string) => text,
    };
  });

  const createSimpleQuestion = (id: string, mode: 'single' | 'multiple' = 'single'): Question => ({
    id,
    label: `Question ${id}`,
    prompt: `What is ${id}?`,
    options: [
      { value: "opt1", label: "Option 1" },
      { value: "opt2", label: "Option 2" },
    ],
    allowOther: true,
    mode,
  });

  async function runWithSimulatedInputs(ui: QuestionnaireUI, questions: Question[], inputs: string[], onInputReady?: () => void) {
    let resolver: (value: any) => void;
    const resultPromise = new Promise((resolve) => {
      resolver = resolve;
    });

    mockCtx.ui.custom = vi.fn(async (handler) => {
      const mockTui = {
        terminal: { rows: 40, cols: 80 },
        requestRender: vi.fn(),
      };
      const done = (res: any) => {
        console.log("Done called with:", res);
        resolver(res);
      };
      const state = handler(mockTui, mockCtx.ui.theme, {}, done);
      
      for (const input of inputs) {
        console.log("Simulating input:", input);
        state.handleInput(input);
        if (onInputReady) onInputReady();
      }
      
      return resultPromise;
    });

    return await ui.run(questions);
  }

  it("should throw an error if UI is not available", async () => {
    mockCtx.hasUI = false;
    const ui = new QuestionnaireUI(mockCtx);
    await expect(ui.run([])).rejects.toThrow("UI not available");
  });

  it("should handle single question single selection", async () => {
    const ui = new QuestionnaireUI(mockCtx);
    const questions = [createSimpleQuestion("q1")];
    const result = await runWithSimulatedInputs(ui, questions, [Key.down, Key.enter]);
    
    expect(result.cancelled).toBe(false);
    expect(result.answers).toHaveLength(1);
    expect(result.answers[0].values).toEqual(["opt2"]);
  });

  it("should handle 'Type something' option", async () => {
    const ui = new QuestionnaireUI(mockCtx);
    const questions = [createSimpleQuestion("q1")];
    
    const result = await runWithSimulatedInputs(ui, questions, [Key.down, Key.down, Key.enter], () => {
      if (capturedOnSubmit) {
        capturedOnSubmit("My custom answer");
      }
    });

    expect(result.cancelled).toBe(false);
    expect(result.answers).toHaveLength(1);
    expect(result.answers[0].values).toEqual(["My custom answer"]);
    expect(result.answers[0].wasCustom).toBe(true);
  });

  it("should handle cancellation", async () => {
    const ui = new QuestionnaireUI(mockCtx);
    const questions = [createSimpleQuestion("q1")];
    const result = await runWithSimulatedInputs(ui, questions, [Key.escape]);
    
    expect(result.cancelled).toBe(true);
  });
});
