/**
 * Ambiguity Detector
 * 
 * Analyzes user input to detect vagueness and triggers a clarification request.
 */
import type { ExtensionContext, ExtensionAPI } from "@mariozechner/pi-coding-agent";

export class AmbiguityDetector {
    private readonly VAGUE_KEYWORDS = {
        high: ["whatever", "something", "somehow", "anywhere", "anyway"],
        medium: ["maybe", "probably", "approx", "roughly", "basically", "etc", "and so on", "a few", "a couple"],
    };

    constructor(private readonly api: ExtensionAPI) {}

    register() {
        this.api.on("input", (event, ctx) => {
            const score = this.calculateVaguenessScore(event.text);
            
            if (score >= 0.8) {
                ctx.ui.notify(
                    "Your prompt is very vague. I strongly recommend using /clarify to ensure the best result.", 
                    "error"
                );
            } else if (score >= 0.4) {
                ctx.ui.notify(
                    "Your prompt is slightly ambiguous. Consider using /clarify for a more precise outcome.", 
                    "warning"
                );
            } else if (score >= 0.2) {
                // Soft hint, doesn't interrupt as much
                ctx.ui.notify(
                    "Tip: You can use /clarify if you want to be more specific about your requirements.", 
                    "info"
                );
            }
        });
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
        const highVagueMatch = this.VAGUE_KEYWORDS.high.filter(kw => normalized.includes(kw)).length;
        const medVagueMatch = this.VAGUE_KEYWORDS.medium.filter(kw => normalized.includes(kw)).length;
        
        score += highVagueMatch * 0.3;
        score += medVagueMatch * 0.15;

        // 3. Structural Gaps (Simple heuristic: lack of punctuation/connectors)
        if (!normalized.includes(".") && !normalized.includes(",") && words.length > 5) {
            score += 0.1;
        }

        return Math.min(1.0, score);
    }
}
