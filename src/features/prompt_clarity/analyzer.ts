import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { VaguenessDimension, type AmbiguityReport } from "./types";

export class PromptClarityAnalyzer {
    constructor(private readonly api: ExtensionAPI) {}

    /**
     * Performs semantic analysis on a prompt using TypeScript LLM analysis.
     * Rust CLI integration is disabled - to re-enable, uncomment the block below.
     */
    async analyze(prompt: string): Promise<AmbiguityReport> {
        // Rust CLI integration disabled - using TypeScript LLM analysis only
        // To re-enable Rust CLI:
        // 1. Uncomment the try-catch block below
        // 2. Re-add imports: import { execSync } from "child_process"; import path from "path";
        
        return this.analyzeTS(prompt);
    }

    private async analyzeTS(prompt: string): Promise<AmbiguityReport> {
        try {
            const response = await (this.api as any).chat({
                systemPrompt: `You are an ambiguity analysis expert. 
                Analyze the user's prompt to identify missing information.
                Categorize the missing information into one or more of these dimensions:
                - technology, scope, format, context, intent.
                
                Return ONLY a valid JSON object:
                {
                  "score": number,
                  "dimensions": ["technology", "scope", etc...],
                  "suggestions": []
                }`,
                userPrompt: prompt
            });

            const parsed = typeof response === 'string' ? JSON.parse(response) : response;

            return {
                score: parsed.score ?? 0.5,
                dimensions: Array.isArray(parsed.dimensions) ? parsed.dimensions.map((d: string) => d as VaguenessDimension) : [],
                suggestions: parsed.suggestions || [],
                isAmbiguous: (parsed.score ?? 0.5) >= 0.2
            };
        } catch (error) {
            console.error("TS fallback LLM analysis also failed:", error);
            return {
                score: 0.5,
                dimensions: [],
                suggestions: [],
                isAmbiguous: false
            };
        }
    }
}
