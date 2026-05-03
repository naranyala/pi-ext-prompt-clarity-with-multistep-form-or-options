/**
 * Ambiguity Detector
 * 
 * Analyzes user input to detect vagueness and triggers a clarification request.
 */
import type { ExtensionContext, ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { VaguenessDimension, type AmbiguityReport } from "./types";

export class AmbiguityDetector {
    private readonly VAGUE_KEYWORDS = {
        high: ["whatever", "something", "somehow", "anywhere", "anyway"],
        medium: ["maybe", "probably", "approx", "roughly", "basically", "etc", "and so on", "a few", "a couple"],
    };

    constructor(private readonly api: ExtensionAPI) {}

    register() {
        this.api.on("input", (event, ctx) => {
            const report = this.analyzeAmbiguity(event.text);
            
            if (report.score >= 0.8) {
                ctx.ui.notify(
                    `Your prompt is very vague (${report.dimensions.join(", ")}). I strongly recommend using /clarify.`, 
                    "error"
                );
            } else if (report.score >= 0.4) {
                ctx.ui.notify(
                    `Your prompt is slightly ambiguous (${report.dimensions.join(", ")}). Consider using /clarify.`, 
                    "warning"
                );
            } else if (report.score >= 0.2) {
                // Soft hint, doesn't interrupt as much
                ctx.ui.notify(
                    `Tip: You can use /clarify if you want to be more specific about your requirements.`, 
                    "info"
                );
            }
        });
    }

    /**
     * Analyzes the input for vagueness score and dimensions.
     */
    private analyzeAmbiguity(text: string): AmbiguityReport {
        const score = this.calculateVaguenessScore(text);
        const dimensions = this.detectDimensions(text);
        
        return {
            score,
            dimensions,
            isAmbiguous: score >= 0.2
        };
    }

    /**
     * Calculates a vagueness score from 0.0 (precise) to 1.0 (very vague).
     */
    private calculateVaguenessScore(text: string): number {
        const normalized = text.toLowerCase();
        const words = normalized.split(/\s+/).filter(Boolean);
        let score = 0;

        // 1. Length Penalty (Short prompts are often vague)
        if (words.length < 3) score += 0.5;
        else if (words.length < 8) score += 0.2;

        // 2. Keyword Penalty
        let highVagueMatches = 0;
        for (const kw of this.VAGUE_KEYWORDS.high) {
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            const matches = normalized.match(regex);
            if (matches) highVagueMatches += matches.length;
        }

        let medVagueMatches = 0;
        for (const kw of this.VAGUE_KEYWORDS.medium) {
            const regex = new RegExp(`\\b${kw}\\b`, 'gi');
            const matches = normalized.match(regex);
            if (matches) medVagueMatches += matches.length;
        }
        
        score += highVagueMatches * 0.3;
        score += medVagueMatches * 0.15;

        // 3. Structural Gaps (Simple heuristic: lack of punctuation/connectors)
        if (!normalized.includes(".") && !normalized.includes(",") && words.length > 5) {
            score += 0.1;
        }

        return Math.min(1.0, score);
    }

    /**
     * Detects which dimensions of vagueness are present using heuristics.
     */
    private detectDimensions(text: string): VaguenessDimension[] {
        const dims: VaguenessDimension[] = [];
        const normalized = text.toLowerCase();

        // Technology heuristics
        if (/(use|with|via|using|framework|library|stack|language|in react|in rust)/.test(normalized)) {
            // This is actually a positive sign, but if the user says "using something" it's vague
            if (/(using something|with whatever|via somehow)/.test(normalized)) {
                dims.push(VaguenessDimension.TECHNOLOGY);
            }
        }

        // Scope heuristics
        if (/(entire|all|just|this|that|whole|part of|some|any|everything)/.test(normalized)) {
            dims.push(VaguenessDimension.SCOPE);
        }

        // Format heuristics
        if (/(format|output|as a|list|json|markdown|table|summary|explain)/.test(normalized)) {
            dims.push(VaguenessDimension.FORMAT);
        }

        // Context heuristics
        if (/(the|that|those|these|it|they|it's|there)/.test(normalized) && !/(the file|the code|the folder)/.test(normalized)) {
            dims.push(VaguenessDimension.CONTEXT);
        }

        // Intent heuristics
        if (/(fix|make|change|update|do|something|whatever)/.test(normalized)) {
            dims.push(VaguenessDimension.INTENT);
        }

        return dims;
    }
}
