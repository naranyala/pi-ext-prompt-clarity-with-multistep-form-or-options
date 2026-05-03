/**
 * Prompt Clarity Skill
 * 
 * Ensures that the agent treats the results of the `clarify_prompt` tool
 * as strict constraints for the final output.
 */
export class PromptClaritySkill {
    /**
     * The system prompt snippet that binds the questionnaire results to the agent's reasoning.
     */
    static readonly CONSTRAINT_PROMPT = `
# PROMPT CLARITY CONSTRAINTS
You have used the 'clarify_prompt' tool to resolve ambiguities in the user's request.
The resulting answers are NOT suggestions; they are HARD CONSTRAINTS.

1. ALWAYS prioritize the explicit answers provided in the clarification questionnaire over any assumptions.
2. If a user specified a preference (e.g., "Use TypeScript" or "Performance over Readability"), treat it as a requirement.
3. Do not introduce patterns or technologies that contradict the clarified intent.
4. If the clarification results are contradictory, ask the user for a final decision before proceeding.
`;

    /**
     * Returns the instruction to be injected into the agent's system context.
     */
    getInstructions(): string {
        return PromptClaritySkill.CONSTRAINT_PROMPT;
    }
}
