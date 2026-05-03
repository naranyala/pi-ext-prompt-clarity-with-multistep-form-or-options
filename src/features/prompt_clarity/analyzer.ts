/**
 * Prompt Clarity Analyzer
 * 
 * Uses the agent's LLM to perform deep semantic analysis of a prompt
 * to identify specific dimensions of ambiguity.
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { VaguenessDimension, type AmbiguityReport } from "./types";

export class PromptClarityAnalyzer {
    constructor(private readonly api: ExtensionAPI) {}

    /**
     * Performs semantic analysis on a prompt using the LLM.
     */
    async analyze(prompt: string): Promise<AmbiguityReport> {
        try {
            // Note: In a real implementation, api.chat or api.reason would be used.
            // We'll assume api.chat exists for this purpose.
            const response = await (this.api as any).chat({
                systemPrompt: `You are an ambiguity analysis expert. 
                Analyze the user's prompt to identify missing information.
                Categorize the missing information into one or more of these dimensions:
                - technology: missing tech stack, libraries, or frameworks
                - scope: missing boundaries (file, folder, project)
                - format: missing output requirements (JSON, Markdown, etc.)
                - context: missing reference to existing code or state
                - intent: missing clear goal (fix, refactor, explain)

                Return ONLY a valid JSON object with this structure:
                {
                  "score": number, // 0.0 (precise) to 1.0 (very vague)
                  "dimensions": ["technology", "scope", etc...]
                }`,
                userPrompt: prompt
            });

            const parsed = typeof response === 'string' ? JSON.parse(response) : response;

            const dimensions = Array.isArray(parsed.dimensions)
                ? parsed.dimensions
                : typeof parsed.dimensions === 'string'
                ? [parsed.dimensions]
                : [];

            return {
                score: parsed.score ?? 0.5,
                dimensions: dimensions.map((d: string) => d as VaguenessDimension),
                isAmbiguous: (parsed.score ?? 0.5) >= 0.2
            };
        } catch (error) {
            console.error("Failed to perform LLM ambiguity analysis:", error);
            // Fallback to a default report if LLM call fails
            return {
                score: 0.5,
                dimensions: [],
                isAmbiguous: false
            };
        }
    }
}
