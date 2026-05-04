use pi_clarity_cli::analysis::SemanticAnalyzer;
use pi_clarity_cli::scoring::ScoringEngine;
use clap::{Parser, Subcommand};
use serde::{Deserialize, Serialize};
use anyhow::{Result, Context};
use std::env;

#[derive(Parser)]
#[command(name = "pi-clarity")]
#[command(about = "Pi Prompt Clarity CLI - High performance ambiguity analysis", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Calculates a vagueness score and identifies missing dimensions for a given prompt.
    Score {
        /// The input text to analyze
        #[arg(short, long)]
        text: String,
    },
    /// Uses LLM to perform deep semantic ambiguity analysis.
    Analyze {
        /// The input text to analyze
        #[arg(short, long)]
        text: String,
        /// OpenAI API Key (overrides OPENAI_API_KEY environment variable)
        #[arg(short, long)]
        api_key: Option<String>,
        /// OpenAI Base URL (overrides default)
        #[arg(short, long)]
        base_url: Option<String>,
    },
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AmbiguityReport {
    pub score: f64,
    pub dimensions: Vec<String>,
    pub is_ambiguous: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Score { text } => {
            let engine = ScoringEngine::new();
            let report = engine.analyze(text);
            
            // Map internal enum to strings for JSON output
            let dims = report.dimensions.iter().map(|d| format!("{:?}", d).to_lowercase()).collect();
            
            let output = AmbiguityReport {
                score: report.score,
                dimensions: dims,
                is_ambiguous: report.is_ambiguous,
            };
            println!("{}", serde_json::to_string(&output)?);
        }
        Commands::Analyze { text, api_key, base_url } => {
            let key = api_key.clone().unwrap_or_else(|| {
                env::var("OPENAI_API_KEY").expect("OPENAI_API_KEY must be set")
            });
            let url = base_url.clone();

            let analyzer = SemanticAnalyzer::new(key, url, None);
            let engine = ScoringEngine::new(); // Added for verification
            
            match analyzer.analyze(text).await {
                Ok(mut report) => {
                    // TRIGGER: Cross-verify LLM results with deterministic heuristics
                    let is_verified = engine.verify_llm_report(text, &report);
                    
                    if !is_verified {
                        // Override: If hallucination is suspected, force ambiguity to true
                        // and increase the score to ensure the TS layer triggers the UI.
                        report.is_ambiguous = true;
                        report.score = report.score.max(0.5); 
                    }

                    let output = AmbiguityReport {
                        score: report.score,
                        dimensions: report.dimensions.iter().map(|d| format!("{:?}", d).to_lowercase()).collect(),
                        is_ambiguous: report.is_ambiguous,
                    };
                    println!("{}", serde_json::to_string(&output)?);
                }
                Err(e) => {
                    eprintln!("Error during semantic analysis: {}", e);
                    std::process::exit(1);
                }
            }
        }
    }

    Ok(())
}
