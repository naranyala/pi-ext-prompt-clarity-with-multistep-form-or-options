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
pub struct AmbiguityReport {
    pub score: f64,
    pub dimensions: Vec<VaguenessDimension>,
    pub is_ambiguous: bool,
}
