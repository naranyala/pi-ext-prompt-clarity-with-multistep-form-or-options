import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { VaguenessDimension, type AmbiguityReport } from "./types";
import { execSync } from "child_process";
import path from "path";

export class PromptClarityAnalyzer {
    constructor(private readonly api: ExtensionAPI) {}

    /**
     * Performs semantic analysis on a prompt using the Rust CLI engine,
     * falling back to internal LLM analysis if the CLI fails.
     */
    async analyze(prompt: string): Promise<AmbiguityReport> {
        try {
            // Execute the Rust CLI for high-performance analysis
            const cliPath = path.join(process.cwd(), "cli-rs", "target", "release", "pi-clarity-cli");
            const output = execSync(
                `"${cliPath}" analyze --text ${JSON.stringify(prompt)}`, 
                { encoding: 'utf8' }
            );

            const parsed = JSON.parse(output);

            return {
                score: parsed.score ?? 0.5,
                dimensions: Array.isArray(parsed.dimensions) ? parsed.dimensions.map((d: string) => d as VaguenessDimension) : [],
                suggestions: parsed.suggestions || [],
                isAmbiguous: (parsed.score ?? 0.5) >= 0.2
            };
        } catch (error) {
            console.warn("Rust semantic analyzer failed, falling back to TS LLM analysis:", error);
            return this.analyzeTS(prompt);
        }
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
