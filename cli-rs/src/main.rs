mod analysis;
mod scoring;
mod types;

use analysis::SemanticAnalyzer;
use anyhow::Result;
use clap::{Parser, Subcommand};
use scoring::ScoringEngine;
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

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Score { text } => {
            let engine = ScoringEngine::new();
            let report = engine.analyze(text);
            println!("{}", serde_json::to_string(&report)?);
        }
        Commands::Analyze {
            text,
            api_key,
            base_url,
        } => {
            let key = api_key.clone().unwrap_or_else(|| {
                env::var("OPENAI_API_KEY").expect("OPENAI_API_KEY must be set")
            });
            let url = base_url.clone();

            let analyzer = SemanticAnalyzer::new(key, url, None);

            match analyzer.analyze(text).await {
                Ok(report) => println!("{}", serde_json::to_string(&report)?),
                Err(e) => {
                    eprintln!("Error during semantic analysis: {}", e);
                    std::process::exit(1);
                }
            }
        }
    }

    Ok(())
}
