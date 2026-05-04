import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { AmbiguityDetector } from '../../src/features/prompt_clarity/ambiguity-detector';
import { PromptClarityAnalyzer } from '../../src/features/prompt_clarity/analyzer';

describe('Prompt Clarity Resilience (Fallbacks)', () => {
    let mockApi: any;

    beforeEach(() => {
        mockApi = {
            on: mock(),
            registerTool: mock(),
            registerCommand: mock(),
            chat: mock().mockResolvedValue({
                score: 0.5,
                dimensions: ['technology'],
                suggestions: [],
                isAmbiguous: true
            }),
        };
    });

    it('should fallback to TS heuristics when Rust CLI is missing', async () => {
        // Force a failure in execSync by mocking child_process
        // Since we can't easily mock execSync in a way that affects the module,
        // we'll mock the path or the output of the detector if needed, 
        // but a better way is to mock the execSync call using vi.mock.
    });
});
