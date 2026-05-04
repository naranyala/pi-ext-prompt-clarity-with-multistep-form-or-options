import type { ExtensionContext, ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { VaguenessDimension, type AmbiguityReport } from "./types";

export class AmbiguityDetector {
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
                ctx.ui.notify(
                    `Tip: You can use /clarify if you want to be more specific about your requirements.`, 
                    "info"
                );
            }
        });
    }

    /**
     * Analyzes the input for vagueness score and dimensions using TypeScript heuristics.
     * Rust CLI integration is disabled - to re-enable, uncomment the block below.
     */
    public analyzeAmbiguity(text: string): AmbiguityReport {
        // Rust CLI integration disabled - using TypeScript heuristics only
        // To re-enable Rust CLI:
        // 1. Uncomment the try-catch block below
        // 2. Re-add imports: import { execSync } from "child_process"; import path from "path";
        
        return this.analyzeAmbiguityTS(text);
    }

    /**
     * Fallback TypeScript implementation of ambiguity detection.
     */
    private analyzeAmbiguityTS(text: string): AmbiguityReport {
        const normalized = text.toLowerCase();
        const words = normalized.split(/\s+/).filter(Boolean);
        let score = 0;

        if (words.length < 3) score += 0.5;
        else if (words.length < 8) score += 0.2;

        const highVague = ["whatever", "something", "somehow", "anywhere", "anyway"];
        const medVague = ["maybe", "probably", "approx", "roughly", "basically", "etc", "and so on", "a few", "a couple"];

        highVague.forEach(kw => {
            const matches = normalized.match(new RegExp(`\\b${kw}\\b`, 'gi'));
            if (matches) score += matches.length * 0.3;
        });

        medVague.forEach(kw => {
            const matches = normalized.match(new RegExp(`\\b${kw}\\b`, 'gi'));
            if (matches) score += matches.length * 0.15;
        });

        if (!normalized.includes(".") && !normalized.includes(",") && words.length > 5) {
            score += 0.1;
        }

        const dims: VaguenessDimension[] = [];
        if (/(use|with|via|using|framework|library|stack|language|in react|in rust)/.test(normalized)) {
            if (/(using something|with whatever|via somehow)/.test(normalized)) dims.push(VaguenessDimension.TECHNOLOGY);
        }
        if (/(entire|all|just|this|that|whole|part of|some|any|everything)/.test(normalized)) dims.push(VaguenessDimension.SCOPE);
        if (/(format|output|as a|list|json|markdown|table|summary|explain)/.test(normalized)) dims.push(VaguenessDimension.FORMAT);
        if (/(the|that|those|these|it|they|it's|there)/.test(normalized) && !/(the file|the code|the folder)/.test(normalized)) dims.push(VaguenessDimension.CONTEXT);
        if (/(fix|make|change|update|do|something|whatever)/.test(normalized)) dims.push(VaguenessDimension.INTENT);

        return {
            score: Math.min(1.0, score),
            dimensions: dims,
            isAmbiguous: Math.min(1.0, score) >= 0.2
        };
    }
}
