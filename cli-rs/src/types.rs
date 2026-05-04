use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "lowercase")]
pub enum VaguenessDimension {
    Technology,
    Scope,
    Format,
    Context,
    Intent,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ClarificationSuggestion {
    pub dimension: VaguenessDimension,
    pub label: String,
    pub suggestions: Vec<String>,
    pub evidence: String, // The specific reason/quote why this is considered ambiguous
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AmbiguityReport {
    pub score: f64,
    pub dimensions: Vec<VaguenessDimension>,
    pub suggestions: Vec<ClarificationSuggestion>,
    pub is_ambiguous: bool,
}
