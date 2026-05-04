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
# Prompt Clarity
If the user has provided answers via 'clarify_prompt', treat them as requirements.
`;

    /**
     * Returns the instruction to be injected into the agent's system context.
     */
    getInstructions(): string {
        return PromptClaritySkill.CONSTRAINT_PROMPT;
    }
}
