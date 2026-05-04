import { describe, it, expect, beforeEach, mock } from "bun:test";
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

    mockCtx.ui.custom = mock(async (handler) => {
       const mockTui = {
         terminal: { rows: 40, cols: 80 },
         requestRender: mock(),
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

  it.skip("should handle multiple questions and submission", async () => {
    const ui = new QuestionnaireUI(mockCtx);
    const questions = [
      createSimpleQuestion("q1", "single"),
      createSimpleQuestion("q2", "single"),
    ];
    
    const result = await runWithSimulatedInputs(ui, questions, [
      Key.down, Key.enter, // q1
      Key.down, Key.enter, // q2
      Key.enter            // submit tab
    ]);
    
    expect(result.cancelled).toBe(false);
    expect(result.answers).toHaveLength(2);
    expect(result.answers[0].values).toEqual(["opt2"]);
    expect(result.answers[1].values).toEqual(["opt2"]);
  });

  it.skip("should handle multi-select toggle and multiple values", async () => {
    const ui = new QuestionnaireUI(mockCtx);
    const questions = [createSimpleQuestion("q1", "multiple")];
    
    // Select opt1, Select opt2, Deselect opt1, Tab to submit, Enter
    const result = await runWithSimulatedInputs(ui, questions, [
      Key.enter, // select opt1
      Key.down, Key.enter, // select opt2
      Key.up, Key.enter, // deselect opt1
      Key.tab, // move to submit
      Key.enter // submit
    ]);
    
    expect(result.cancelled).toBe(false);
    expect(result.answers[0].values).toEqual(["opt2"]);
  });

  it.skip("should handle tab navigation between questions", async () => {
    const ui = new QuestionnaireUI(mockCtx);
    const questions = [
      createSimpleQuestion("q1"),
      createSimpleQuestion("q2"),
    ];
    
    // Select q1, Tab to q2, Select q2, Tab to submit, Enter
    const result = await runWithSimulatedInputs(ui, questions, [
      Key.enter, // q1 opt1
      Key.tab,   // move to q2
      Key.enter, // q2 opt1
      Key.tab,   // move to submit
      Key.enter  // submit
    ]);
    
    expect(result.cancelled).toBe(false);
    expect(result.answers).toHaveLength(2);
  });

  it("should block submission if some questions are unanswered", async () => {
    const ui = new QuestionnaireUI(mockCtx);
    const questions = [
      createSimpleQuestion("q1"),
      createSimpleQuestion("q2"),
    ];
    
    // Select q1, Tab to submit, Enter (q2 is unanswered)
    // Since it's a mock and doesn't actually "block" rendering, 
    // we check if done is called. In our mock, if Key.enter is pressed 
    // on submit tab and allAnswered() is false, it just does nothing.
    
    let resolver: (value: any) => void;
    const resultPromise = new Promise((resolve) => {
      resolver = resolve;
    });

    mockCtx.ui.custom = mock(async (handler) => {
      const mockTui = { terminal: { rows: 40, cols: 80 }, requestRender: mock() };
      const done = (res: any) => resolver(res);
      const state = handler(mockTui, mockCtx.ui.theme, {}, done);
      
      state.handleInput(Key.enter); // answer q1
      state.handleInput(Key.tab);   // move to submit
      state.handleInput(Key.enter); // try to submit
      
      return resultPromise;
    });

    // This should timeout if we just await it, so we wrap in a timeout
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 100));
    
    await expect(Promise.race([ui.run(questions), timeoutPromise])).rejects.toThrow("Timeout");
  });

  it("should handle Esc in input mode", async () => {
    const ui = new QuestionnaireUI(mockCtx);
    const questions = [createSimpleQuestion("q1")];
    
    // Select 'Type something', then press Esc
    // In current implementation, Esc in inputMode calls refresh() and set inputMode = false.
    // To verify, we can see if it's still in questionnaire and didn't cancel.
    
    const result = await runWithSimulatedInputs(ui, questions, [
      Key.down, Key.down, Key.enter, // enter input mode
      Key.escape, // exit input mode
      Key.enter // select 'Type something' again and submit
    ], () => {
      if (capturedOnSubmit) {
        capturedOnSubmit("Actual answer");
      }
    });
    
    expect(result.cancelled).toBe(false);
    expect(result.answers[0].values).toEqual(["Actual answer"]);
  });

  it("should handle empty custom answer", async () => {
    const ui = new QuestionnaireUI(mockCtx);
    const questions = [createSimpleQuestion("q1")];
    
    const result = await runWithSimulatedInputs(ui, questions, [
      Key.down, Key.down, Key.enter, // enter input mode
    ], () => {
      if (capturedOnSubmit) {
        capturedOnSubmit("   "); // empty string
      }
    });
    
    expect(result.answers[0].values).toEqual(["(no response)"]);
  });

  it("should respect allowOther: false", async () => {
    const ui = new QuestionnaireUI(mockCtx);
    const questions = [{
      id: "q1",
      label: "Q1",
      prompt: "Prompt",
      options: [{ value: "v1", label: "L1" }],
      allowOther: false,
      mode: 'single'
    } as any];
    
    const result = await runWithSimulatedInputs(ui, questions, [Key.enter]);
    expect(result.cancelled).toBe(false);
    expect(result.answers[0].values).toEqual(["v1"]);
  });

  it("should handle cancellation", async () => {
    const ui = new QuestionnaireUI(mockCtx);
    const questions = [createSimpleQuestion("q1")];
    const result = await runWithSimulatedInputs(ui, questions, [Key.escape]);
    
    expect(result.cancelled).toBe(true);
  });
});
