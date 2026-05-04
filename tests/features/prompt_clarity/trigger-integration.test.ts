import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { PromptClarityHandlers } from '../../../src/features/prompt_clarity/index';
import { AmbiguityDetector } from '../../../src/features/prompt_clarity/ambiguity-detector';
import { PromptClarityAnalyzer } from '../../../src/features/prompt_clarity/analyzer';
import { VaguenessDimension } from '../../../src/features/prompt_clarity/types';

// Mock Rust CLI to fail
mock.module("child_process", () => ({
  execSync: mock().mockImplementation(() => {
    throw new Error("Mocked CLI failure");
  }),
}));

describe('Prompt Clarity Trigger Integration', () => {
    let mockApi: any;
    let mockCtx: any;
    let handlers: PromptClarityHandlers;

    beforeEach(() => {
        mockApi = {
            on: mock(),
            registerTool: mock(),
            registerCommand: mock(),
            chat: mock().mockResolvedValue(JSON.stringify({
                score: 0.5,
                dimensions: ["scope"],
                suggestions: [{
                    dimension: "scope",
                    label: "Scope",
                    suggestions: ["Frontend", "Backend"],
                    evidence: "Missing scope"
                }]
            })),
        };
        mockCtx = {
            ui: {
                notify: mock(),
                custom: mock().mockResolvedValue({
                    questions: [],
                    answers: [],
                    cancelled: false,
                }),
                theme: {},
            },
            hasUI: true,
            lastPrompt: "Do something with the code",
        };
        handlers = new PromptClarityHandlers({ api: mockApi, logger: console } as any);
        handlers.register();
    });

    it('should trigger the proactive nudge in before_agent_start', async () => {
        // Find the before_agent_start callback
        const beforeAgentStartCallback = mockApi.on.mock.calls.find(
            (call: any) => call[0] === 'before_agent_start'
        )[1];

        const event = { systemPrompt: "Initial prompt" };
        const result = beforeAgentStartCallback(event, mockCtx);

        expect(result.systemPrompt).toContain("SYSTEM NOTICE");
        expect(result.systemPrompt).toContain("clarify_prompt");
    });

    it('should trigger the reactive wizard when clarify_prompt tool is called', async () => {
        const toolCall = mockApi.registerTool.mock.calls.find(
            (call: any) => call[0].name === 'clarify_prompt'
        )[0].execute;

        const params = { questions: [] }; // Trigger SMART MODE
        await toolCall("id", params, {}, {}, mockCtx);

        expect(mockCtx.ui.custom).toHaveBeenCalled();
    });

    it('should trigger the manual override when /clarify command is run', async () => {
        const commandHandler = mockApi.registerCommand.mock.calls.find(
            (call: any) => call[0] === 'clarify'
        )[1].handler;

        await commandHandler([], mockCtx);

        expect(mockCtx.ui.notify).toHaveBeenCalledWith(
            expect.stringContaining("Triggering clarification wizard"), 
            "info"
        );
    });
});

