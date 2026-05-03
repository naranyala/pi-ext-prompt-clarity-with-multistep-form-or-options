use regex::Regex;
use unicode_segmentation::UnicodeSegmentation;
use crate::types::{AmbiguityReport, VaguenessDimension};

pub struct ScoringEngine {
    high_vague_keywords: Vec<String>,
    medium_vague_keywords: Vec<String>,
}

impl ScoringEngine {
    pub fn new() -> Self {
        Self {
            high_vague_keywords: vec![
                "whatever".to_string(),
                "something".to_string(),
                "somehow".to_string(),
                "anywhere".to_string(),
                "anyway".to_string(),
            ],
            medium_vague_keywords: vec![
                "maybe".to_string(),
                "probably".to_string(),
                "approx".to_string(),
                "roughly".to_string(),
                "basically".to_string(),
                "etc".to_string(),
                "and so on".to_string(),
                "a few".to_string(),
                "a couple".to_string(),
            ],
        }
    }

    pub fn analyze(&self, text: &str) -> AmbiguityReport {
        let score = self.calculate_vagueness_score(text);
        let dimensions = self.detect_dimensions(text);

        AmbiguityReport {
            score,
            dimensions,
            is_ambiguous: score >= 0.2,
        }
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

        // 2. Keyword Penalty
        let mut high_vague_matches = 0;
        for kw in &self.high_vague_keywords {
            let re = Regex::new(&format!(r"\b{}\b", regex::escape(kw))).unwrap();
            high_vague_matches += re.find_iter(&normalized).count();
        }

        let mut med_vague_matches = 0;
        for kw in &self.medium_vague_keywords {
            let re = Regex::new(&format!(r"\b{}\b", regex::escape(kw))).unwrap();
            med_vague_matches += re.find_iter(&normalized).count();
        }

        score += (high_vague_matches as f64) * 0.3;
        score += (med_vague_matches as f64) * 0.15;

        // 3. Structural Gaps
        if !normalized.contains('.') && !normalized.contains(',') && words.len() > 5 {
            score += 0.1;
        }

        score.min(1.0)
    }

    fn detect_dimensions(&self, text: &str) -> Vec<VaguenessDimension> {
        let mut dims = Vec::new();
        let normalized = text.to_lowercase();

        // Technology
        if regex::Regex::new(r"(use|with|via|using|framework|library|stack|language|in react|in rust)").unwrap().is_match(&normalized) {
            if regex::Regex::new(r"(using something|with whatever|via somehow)").unwrap().is_match(&normalized) {
                dims.push(VaguenessDimension::Technology);
            }
        }

        // Scope
        if regex::Regex::new(r"(entire|all|just|this|that|whole|part of|some|any|everything)").unwrap().is_match(&normalized) {
            dims.push(VaguenessDimension::Scope);
        }

        // Format
        if regex::Regex::new(r"(format|output|as a|list|json|markdown|table|summary|explain)").unwrap().is_match(&normalized) {
            dims.push(VaguenessDimension::Format);
        }

        // Context
        if regex::Regex::new(r"(the|that|those|these|it|they|it's|there)").unwrap().is_match(&normalized) 
           && !regex::Regex::new(r"(the file|the code|the folder)").unwrap().is_match(&normalized) {
            dims.push(VaguenessDimension::Context);
        }

        // Intent
        if regex::Regex::new(r"(fix|make|change|update|do|something|whatever)").unwrap().is_match(&normalized) {
            dims.push(VaguenessDimension::Intent);
        }

        dims
    }
}
