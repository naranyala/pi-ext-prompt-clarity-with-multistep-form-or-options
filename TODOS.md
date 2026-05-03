# 🚀 Project: Prompt Clarity Extension

## 🎯 Vision
Bridge the gap between vague user intent and precise execution by providing a dynamic, interactive, and multi-step questionnaire framework for the agent to resolve ambiguity.

**Architecture Note**: This extension follows a **Service-Oriented Architecture**. It leverages a centralized `ServiceContainer` for dependency injection and a decoupled UI engine (`QuestionnaireUI`) to separate feature logic from terminal rendering.

## 📊 Project Analysis

### ✅ Strengths (What Works)
- **TUI-Native Interaction**: High-fidelity use of `ctx.ui.custom` for terminal-native UX.
- **Reusable UI Engine**: The `QuestionnaireUI` class provides a generic, scalable way to build multi-step forms with support for single/multiple selection.
- **LLM-Driven UI**: Use of `typebox` allows the agent to dynamically design the questionnaire structure.
- **Hybrid Input**: Combines rapid selection with free-text input via a built-in TUI Editor.
- **Wizard Pattern**: Tabbed navigation manages cognitive load during multi-question sessions.
- **Proactive Guidance**: Integrated `AmbiguityDetector` and `PromptClaritySkill` to steer the agent towards clarification.

### ⚠️ Challenges (Potential Bugs & Technical Debt)
- **Logic Duplication**: `PromptClarityHandlers` currently implements its own internal questionnaire loop instead of utilizing the `QuestionnaireUI` abstraction, leading to redundant code and inconsistent behavior.
- **Heuristic Limitations**: Ambiguity detection relies on basic heuristics; lacks a sophisticated "Vagueness Scoring" engine.
- **Statelessness**: Clarifications are not persisted; the agent may ask the same questions in subsequent turns if the context is lost.
- **Command Bridge**: The `/clarify` command relies on a system prompt injection to "nudge" the agent; it is not a direct programmatic trigger.

## 🛠️ Implementation Roadmap

### 🟦 Phase 1: Core Refinement & Refactoring
- [x] Implement `QuestionnaireUI` generic engine.
- [x] Add `selectionMode: 'single' | 'multiple'` support.
- [x] Implement scrolling for long option lists.
- [ ] **Refactor**: Migrate `PromptClarityHandlers` to use the `QuestionnaireUI` class instead of inline TUI logic.

### 🟨 Phase 2: Intelligence & Automation
- [x] Implement `before_agent_start` hook for ambiguity detection.
- [x] Implement logic for the `/clarify` command.
- [x] Create `PromptClaritySkill` to bind results as hard constraints in the agent's reasoning.
- [ ] Develop a "Vagueness Scoring" heuristic to determine the *level* of intervention needed.

### 🟩 Phase 3: Ecosystem Integration
- [ ] **Clarification Memory**: Use `Store` to persist clarified preferences across the session.
- [ ] **Clarification Templates**: Create a library of `QuestionSchema` presets for common scenarios (Bug Reports, Feature Requests, etc.).
- [ ] **User Documentation**: Add "How to use `clarify_prompt`" guide to the agent's system instructions.

### 🚀 Phase 4: Advanced Intelligence (Enrichment)
- [ ] **Proactive Suggestion**: Automatically trigger the wizard when the agent's internal "thinking" process indicates high uncertainty.
- [ ] **Dynamic Option Generation**: Allow the agent to generate options for the questionnaire based on previous user history.

### 🦀 Native Rust Integration (Alternative Path)
*The following features can be implemented as standalone Rust CLIs to improve performance, leverage specialized libraries, and provide standalone utility.*

- [ ] **`pi-clarity-score`**: Replace TS heuristics with a Rust-native NLP engine for high-precision vagueness scoring.
- [ ] **`pi-clarity-analyze`**: A native tool to extract entities and "missing dimensions" from a prompt to automatically generate `QuestionSchema`.
- [ ] **`pi-clarity-templates`**: A Rust-based manager for complex, nested clarification templates with versioning and local caching.
- [ ] **Cross-Session Analysis**: A Rust utility to analyze historical `Store` data and suggest global "User Persona" constraints to the agent.

## 🛡️ Validation & Risk Analysis

### ✅ Confirmed Working (Low Risk)
- **TUI Interactivity**: `ctx.ui.custom` for questionnaires is stable.
- **Intent Interception**: `api.on("before_agent_start", ...)` is a reliable pattern for guiding the agent.
- **Tool Integration**: `clarify_prompt` is correctly registered and callable.

### ⚠️ Potential Limitations (Medium Risk)
- **UI Overflow**: While scrolling is implemented, extremely complex questionnaires with nested descriptions may still challenge the TUI layout.
- **LLM Compliance**: The agent may occasionally ignore the `PromptClaritySkill` instructions and attempt to guess rather than clarify.

### ❌ Architectural Hard-Ceilings (High Risk/Impossible)
- **Internal State Access**: The extension cannot access the LLM's internal confidence scores.
- **Execution Blocking**: The extension cannot "pause" the agent's turn to force a tool call; it can only influence the agent's decision.
