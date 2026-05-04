use once_cell::sync::Lazy;
use regex::Regex;
use unicode_segmentation::UnicodeSegmentation;
use crate::types::{AmbiguityReport, VaguenessDimension};

// Pre-compiled Regexes for high-performance matching
static HIGH_VAGUE_REGEXES: Lazy<Vec<Regex>> = Lazy::new(|| {
    vec![
        "whatever", "something", "somehow", "anywhere", "anyway"
    ].iter().map(|&kw| Regex::new(&format!(r"\b{}\b", regex::escape(kw))).unwrap()).collect()
});

static MED_VAGUE_REGEXES: Lazy<Vec<Regex>> = Lazy::new(|| {
    vec![
        "maybe", "probably", "approx", "roughly", "basically", "etc", "and so on", "a few", "a couple"
    ].iter().map(|&kw| Regex::new(&format!(r"\b{}\b", regex::escape(kw))).unwrap()).collect()
});

static TECH_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(use|with|via|using|framework|library|stack|language|in react|in rust)").unwrap());
static TECH_AMBIGUITY_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(using something|with whatever|via somehow|using some framework|using a library)").unwrap());

static SCOPE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(entire|all|just|this|that|whole|part of|some|any|everything)").unwrap());

static FORMAT_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(format|output|as a|list|json|markdown|table|summary|explain)").unwrap());

static CONTEXT_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(the|that|those|these|it|they|it's|there)").unwrap());
static CONTEXT_NEGATION_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(the file|the code|the folder)").unwrap());

static INTENT_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(fix|make|change|update|do|something|whatever|create|implement|write|show|explain|list|generate)").unwrap());

static IMPERATIVE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^(fix|make|change|update|do|create|delete|add|remove|implement|write|show|explain|list|generate|get|find)\b").unwrap());

pub struct ScoringEngine {}

impl ScoringEngine {
    pub fn new() -> Self {
        Self {}
    }

    pub fn analyze(&self, text: &str) -> AmbiguityReport {
        let score = self.calculate_vagueness_score(text);
        let dimensions = self.detect_dimensions(text);

        AmbiguityReport {
            score,
            dimensions,
            suggestions: vec![], // Heuristics don't generate specific suggestions
            is_ambiguous: score >= 0.2,
        }
    }

    /// Verifies an LLM-generated report against deterministic heuristics.
    /// Returns true if the report is consistent, false if a hallucination is suspected.
    pub fn verify_llm_report(&self, text: &str, report: &AmbiguityReport) -> bool {
        let heuristic_score = self.calculate_vagueness_score(text);
        
        // HALLUCINATION CHECK 1: The LLM says the prompt is precise (score < 0.2),
        // but the heuristic engine finds it very vague (score > 0.5).
        if report.score < 0.2 && heuristic_score > 0.5 {
            return false; 
        }

        // HALLUCINATION CHECK 2: The LLM claims no dimensions are missing,
        // but the heuristic engine found multiple.
        if report.dimensions.is_empty() && self.detect_dimensions(text).len() > 2 {
            return false;
        }

        true
    }

    fn calculate_vagueness_score(&self, text: &str) -> f64 {
        let normalized = text.to_lowercase();
        let words: Vec<&str> = normalized.unicode_words().collect();
        let mut score = 0.0;

        // 1. Length Penalty
        if words.len() < 3 {
            score += 0.5;
        } else if words.len() < 8 {
            score += 0.2;
        }

        // 2. Keyword Penalty (Optimized with pre-compiled regexes)
        let mut high_vague_matches = 0;
        for re in HIGH_VAGUE_REGEXES.iter() {
            high_vague_matches += re.find_iter(&normalized).count();
        }

        let mut med_vague_matches = 0;
        for re in MED_VAGUE_REGEXES.iter() {
            med_vague_matches += re.find_iter(&normalized).count();
        }

        score += (high_vague_matches as f64) * 0.3;
        score += (med_vague_matches as f64) * 0.15;

        // 3. Structural Gaps (Punctuation density)
        let punctuation_count = normalized.chars().filter(|c| matches!(c, '.' | ',' | '!' | '?' | ';')).count();
        if punctuation_count == 0 && words.len() > 5 {
            score += 0.15;
        } else if punctuation_count < (words.len() / 5).max(1) {
            score += 0.05;
        }

        // 4. Intent Clarity (Imperative detection)
        if !IMPERATIVE_RE.is_match(&normalized) && words.len() > 3 {
            score += 0.1;
        }

        score.min(1.0)
    }

    fn detect_dimensions(&self, text: &str) -> Vec<VaguenessDimension> {
        let mut dims = Vec::new();
        let normalized = text.to_lowercase();

        // Technology
        if TECH_RE.is_match(&normalized) {
            if TECH_AMBIGUITY_RE.is_match(&normalized) {
                dims.push(VaguenessDimension::Technology);
            }
        }

        // Scope
        if SCOPE_RE.is_match(&normalized) {
            dims.push(VaguenessDimension::Scope);
        }

        // Format
        if FORMAT_RE.is_match(&normalized) {
            dims.push(VaguenessDimension::Format);
        }

        // Context
        if CONTEXT_RE.is_match(&normalized) 
           && !CONTEXT_NEGATION_RE.is_match(&normalized) {
            dims.push(VaguenessDimension::Context);
        }

        // Intent
        if INTENT_RE.is_match(&normalized) {
            dims.push(VaguenessDimension::Intent);
        }

        dims
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::AmbiguityReport;

    #[test]
    fn test_score_precise_prompt() {
        let engine = ScoringEngine::new();
        let report = engine.analyze("Implement a binary search algorithm in Rust for a sorted integer array.");
        assert!(report.score < 0.2);
        assert!(!report.is_ambiguous);
    }

    #[test]
    fn test_score_vague_prompt() {
        let engine = ScoringEngine::new();
        let report = engine.analyze("Do something with the code.");
        assert!(report.score >= 0.4);
        assert!(report.is_ambiguous);
    }

    #[test]
    fn test_score_keyword_penalty() {
        let engine = ScoringEngine::new();
        let report = engine.analyze("I want whatever something is in some way.");
        assert!(report.score > 0.6);
    }

    #[test]
    fn test_dimension_detection() {
        let engine = ScoringEngine::new();
        let report = engine.analyze("I want a JSON output for the whole project using some framework.");
        assert!(report.dimensions.contains(&VaguenessDimension::Format));
        assert!(report.dimensions.contains(&VaguenessDimension::Scope));
        assert!(report.dimensions.contains(&VaguenessDimension::Technology));
    }

    #[test]
    fn test_hallucination_verification() {
        let engine = ScoringEngine::new();
        let text = "Do something whatever.";
        
        // Mock a hallucinated report where LLM says it's precise
        let hallucinated_report = AmbiguityReport {
            score: 0.1,
            dimensions: vec![],
            suggestions: vec![],
            is_ambiguous: false,
        };
        
        assert!(!engine.verify_llm_report(text, &hallucinated_report), "Should detect hallucinated precision");
        
        let honest_report = AmbiguityReport {
            score: 0.7,
            dimensions: vec![VaguenessDimension::Intent],
            suggestions: vec![],
            is_ambiguous: true,
        };
        assert!(engine.verify_llm_report(text, &honest_report), "Should verify honest report");
    }
}
