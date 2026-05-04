use criterion::{black_box, criterion_group, criterion_main, Criterion};
use pi_clarity_cli::scoring::ScoringEngine;

fn benchmark_score_short(c: &mut Criterion) {
    let engine = ScoringEngine::new();
    let text = "Hello";
    c.bench_function("score_short", |b| b.iter(|| engine.analyze(black_box(text))));
}

fn benchmark_score_medium(c: &mut Criterion) {
    let engine = ScoringEngine::new();
    let text = "How do I use some framework to do something in a couple of ways?";
    c.bench_function("score_medium", |b| b.iter(|| engine.analyze(black_box(text))));
}

fn benchmark_score_long(c: &mut Criterion) {
    let engine = ScoringEngine::new();
    let text = "I want to implement a full-scale distributed system using some library, but I am not sure about the framework. Maybe I can use whatever is available in the stack. I need it to be roughly efficient and possibly scalable, but I don't really know the scope or the format I should use for the output. Just give me a few examples of how to do this somehow.";
    c.bench_function("score_long", |b| b.iter(|| engine.analyze(black_box(text))));
}

fn criterion_benchmark(c: &mut Criterion) {
    benchmark_score_short(c);
    benchmark_score_medium(c);
    benchmark_score_long(c);
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
