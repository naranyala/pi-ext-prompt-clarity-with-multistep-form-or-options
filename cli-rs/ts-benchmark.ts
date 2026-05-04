import { performance } from 'perf_hooks';

class ScoringEngine {
    private highVagueKeywords = [
        "whatever", "something", "somehow", "anywhere", "anyway"
    ];
    private medVagueKeywords = [
        "maybe", "probably", "approx", "roughly", "basically", "etc", "and so on", "a few", "a couple"
    ];

    // Pre-compile regexes to be fair to Rust
    private highVagueRegexes = this.highVagueKeywords.map(kw => new RegExp(`\\b${kw}\\b`, 'i'));
    private medVagueRegexes = this.medVagueKeywords.map(kw => new RegExp(`\\b${kw}\\b`, 'i'));
    
    private techRe = /(use|with|via|using|framework|library|stack|language|in react|in rust)/i;
    private techAmbiguityRe = /(using something|with whatever|via somehow)/i;
    private scopeRe = /(entire|all|just|this|that|whole|part of|some|any|everything)/i;
    private formatRe = /(format|output|as a|list|json|markdown|table|summary|explain)/i;
    private contextRe = /(the|that|those|these|it|they|it's|there)/i;
    private contextNegationRe = /(the file|the code| the folder)/i;
    private intentRe = /(fix|make|change|update|do|something|whatever|create|implement|write|show|explain|list|generate)/i;
    private imperativeRe = /^(fix|make|change|update|do|create|delete|add|remove|implement|write|show|explain|list|generate|get|find)\b/i;

    analyze(text: string) {
        const normalized = text.toLowerCase();
        const words = normalized.split(/\s+/).filter(w => w.length > 0);
        let score = 0.0;

        // 1. Length Penalty
        if (words.length < 3) {
            score += 0.5;
        } else if (words.length < 8) {
            score += 0.2;
        }

        // 2. Keyword Penalty
        let highVagueMatches = 0;
        for (const re of this.highVagueRegexes) {
            const matches = normalized.match(re);
            if (matches) highVagueMatches += (normalized.match(new RegExp(re.source, 'gi')) || []).length;
        }

        let medVagueMatches = 0;
        for (const re of this.medVagueRegexes) {
            const matches = normalized.match(re);
            if (matches) medVagueMatches += (normalized.match(new RegExp(re.source, 'gi')) || []).length;
        }

        score += highVagueMatches * 0.3;
        score += medVagueMatches * 0.15;

        // 3. Structural Gaps
        const punctuationCount = (normalized.match(/[.,!?;]/g) || []).length;
        if (punctuationCount === 0 && words.length > 5) {
            score += 0.15;
        } else if (punctuationCount < Math.max(1, Math.floor(words.length / 5))) {
            score += 0.05;
        }

        // 4. Intent Clarity
        if (!this.imperativeRe.test(normalized) && words.length > 3) {
            score += 0.1;
        }

        return Math.min(score, 1.0);
    }
}

function benchmark(name: string, text: string, iterations: number = 100000) {
    const engine = new ScoringEngine();
    // Warmup
    for(let i=0; i<1000; i++) engine.analyze(text);

    const start = performance.now();
    let sum = 0;
    for(let i=0; i<iterations; i++) {
        sum += engine.analyze(text);
    }
    const end = performance.now();
    
    const totalTime = end - start;
    const avgTime = totalTime / iterations;
    console.log(`${name}: Avg ${avgTime.toFixed(4)} ms (${(avgTime * 1000).toFixed(2)} µs)`);
    // print sum to prevent DCE
    if (sum === 0) console.log("checksum: 0"); else console.log("checksum: " + sum);
}

const tests = [
    { name: "score_short", text: "Hello" },
    { name: "score_medium", text: "How do I use some framework to do something in a couple of ways?" },
    { name: "score_long", text: "I want to implement a full-scale distributed system using some library, but I am not sure about the framework. Maybe I can use whatever is available in the stack. I need it to be roughly efficient and possibly scalable, but I don't really know the scope or the format I should use for the output. Just give me a few examples of how to do this somehow." }
];

console.log("Starting TypeScript Benchmark...");
tests.forEach(t => benchmark(t.name, t.text));
