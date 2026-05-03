# 🌟 Pi Prompt Clarity

**Bridge the gap between vague user intent and precise execution.**

`pi-prompt-clarity` is a powerful extension for the Pi coding agent that prevents "guessing" and reduces hallucinations by providing a structured, interactive framework for resolving ambiguity. Instead of the agent making assumptions about a vague request, it can now deploy a dynamic, multi-step questionnaire to gather the exact details needed for a perfect implementation.

---

## ✨ Key Features

### 🛠️ Interactive Clarification Wizard
- **Multi-Step Forms**: Support for complex, multi-question sequences with tabbed navigation to reduce cognitive load.
- **Dynamic UI Generation**: The agent uses `TypeBox` to define the structure of the questionnaire on the fly, tailoring the questions to the specific ambiguity detected.
- **Hybrid Input Modalities**:
    - **Rapid Selection**: Radio-style options for quick decisions.
    - **Multi-Select**: Checkbox-style options for choosing multiple constraints.
    - **Deep Input**: A built-in TUI editor for free-text, detailed responses.

### 🎯 Intelligence & Guidance
- **Proactive Ambiguity Detection**: Integrated hooks that analyze user prompts before the agent starts, suggesting the need for clarification.
- **Hard Constraint Injection**: Results from the wizard are not just "chat history"—they are injected as hard constraints into the agent's reasoning process via the `PromptClaritySkill`.
- **Command Bridge**: Quick access via the `/clarify` command to manually trigger the wizard for the last prompt.

---

## 🚀 Getting Started

### Prerequisites
- [Pi Coding Agent](https://opencode.ai) installed and configured.
- [Bun](https://bun.sh/) (for development and testing).

### Installation
The fastest way to add this capability to your Pi agent:

```bash
pi install git:github.com/naranyala/pi-ext-prompt-clarity-with-multistep-form-or-options
```

### How to Use
1. **Automatic**: The agent will naturally call the `clarify_prompt` tool when it detects your request is too vague to execute safely.
2. **Manual**: If you feel the agent is guessing too much, simply type:
   ` /clarify `
   This nudges the agent to analyze the last prompt and start the clarification wizard.

---

## 🏗️ Technical Architecture

For developers interested in the "how," this extension serves as a reference implementation for high-quality Pi extensions.

### 🧩 Service-Oriented Design
The extension employs a **ServiceContainer** (Dependency Injection) pattern, ensuring that core capabilities (Logging, Store, Shell) are decoupled from feature logic. This makes the codebase highly modular and testable.

### 🎨 TUI Engine (`QuestionnaireUI`)
The heart of the extension is a reusable TUI engine that abstracts the complexity of `ctx.ui.custom`. It handles:
- **State Management**: Tracking current tabs, selected options, and input modes.
- **Adaptive Rendering**: Dynamic line truncation and scrolling for long lists.
- **Event Routing**: Mapping terminal key-presses to application actions.

### 🛡️ Type Safety
By using `@sinclair/typebox`, the extension ensures that the parameters passed from the LLM to the UI are strictly validated, preventing runtime crashes during complex form generation.

---

## 🛠️ Development

### Running Tests
We maintain a comprehensive suite of unit and integration tests to ensure the wizard's stability.

```bash
bun test
```

### Linting & Formatting
This project uses [Biome](https://biomejs.dev/) for lightning-fast linting and formatting.

```bash
# Check for issues
bun check

# Auto-fix issues
bun check --apply
```

### Type Checking
```bash
bun typecheck
```

---

## 🤝 Contributing
Contributions are welcome! Whether it's improving the ambiguity detection heuristics or adding new UI components to the `QuestionnaireUI` engine, feel free to open a PR. Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License
This project is licensed under the MIT License.
