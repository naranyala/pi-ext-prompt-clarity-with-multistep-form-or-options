/**
 * Prompt Clarity Feature
 * 
 * Provides a way for the agent to ask the user for clarification
 * using a structured questionnaire.
 */
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Editor, type EditorTheme, Key, matchesKey, Text, truncateToWidth } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";
import type { Services } from "../../core/services";
import { AmbiguityDetector } from "./ambiguity-detector";
import { PromptClaritySkill } from "./skill";

// --- Types ---

interface QuestionOption {
	value: string;
	label: string;
	description?: string;
}

interface Question {
	id: string;
	label: string;
	prompt: string;
	options: QuestionOption[];
	allowOther: boolean;
}

interface Answer {
	id: string;
	value: string;
	label: string;
	wasCustom: boolean;
	index?: number;
}

interface QuestionnaireResult {
	questions: Question[];
	answers: Answer[];
	cancelled: boolean;
}

const QuestionOptionSchema = Type.Object({
	value: Type.String({ description: "The value returned when selected" }),
	label: Type.String({ description: "Display label for the option" }),
	description: Type.Optional(Type.String({ description: "Optional description shown below label" })),
});

const QuestionSchema = Type.Object({
	id: Type.String({ description: "Unique identifier for this question" }),
	label: Type.Optional(
		Type.String({
			description: "Short contextual label for tab bar, e.g. 'Scope', 'Priority' (defaults to Q1, Q2)",
		}),
	),
	prompt: Type.String({ description: "The full question text to display" }),
	options: Type.Array(QuestionOptionSchema, { description: "Available options to choose from" }),
	allowOther: Type.Optional(Type.Boolean({ description: "Allow 'Type something' option (default: true)" })),
});

const ClarificationWizardParams = Type.Object({
	questions: Type.Array(QuestionSchema, { description: "Questions to ask the user to clarify their intent." }),
});

function errorResult(
	message: string,
	questions: Question[] = [],
): { content: { type: "text"; text: string }[]; details: QuestionnaireResult } {
	return {
		content: [{ type: "text", text: message }],
		details: { questions, answers: [], cancelled: true },
	};
}

// --- Handlers ---

export class PromptClarityHandlers {
	constructor(private readonly services: Services) {}

	register() {
		const { api, logger } = this.services;

		// Register Ambiguity Detector
		const detector = new AmbiguityDetector(api);
		detector.register();

		// Register Prompt Clarity Skill (Constraint Injection)
		const skill = new PromptClaritySkill();
		api.on("before_agent_start", (event) => {
			return {
				systemPrompt: event.systemPrompt + "\n\n" + skill.getInstructions(),
			};
		});

		api.registerTool({
			name: "clarify_prompt",
			label: "Clarify Prompt",
			description: "Ask the user clarifying questions to resolve ambiguity in their request. Use this when the user's prompt is too vague or lacks necessary details.",
			parameters: ClarificationWizardParams,
			execute: async (_id, params, _signal, _onUpdate, ctx) => {
				if (!ctx.hasUI) {
					return errorResult("Error: UI not available (running in non-interactive mode)");
				}
				if (params.questions.length === 0) {
					return errorResult("Error: No questions provided");
				}

				const questions: Question[] = params.questions.map((q, i) => ({
					...q,
					label: q.label || `Q${i + 1}`,
					allowOther: q.allowOther !== false,
				}));

				return await this.runQuestionnaire(questions, ctx);
			},
		});

		api.registerCommand("clarify", {
			description: "Trigger a clarification wizard for the last prompt",
			handler: async (_args, ctx) => {
				ctx.ui.notify("Triggering clarification wizard...", "info");
				
				// Inject an instruction to the agent to force the use of the clarify_prompt tool.
				(api as any).appendEntry?.({
					role: "system",
					content: "The user has requested a clarification wizard for their last prompt. " +
							"Please analyze the last user message, identify ambiguities, and call " +
							"the `clarify_prompt` tool with a structured set of questions (QuestionSchema[]) " +
							"to gather the necessary details."
				});
			}
		});
	}

	private async runQuestionnaire(questions: Question[], ctx: ExtensionContext): Promise<any> {
		const { theme } = ctx.ui;
		const isMulti = questions.length > 1;
		const totalTabs = questions.length + 1; // questions + Submit

		const result = await ctx.ui.custom<QuestionnaireResult>((tui, theme, _kb, done) => {
			// State
			let currentTab = 0;
			let optionIndex = 0;
			let inputMode = false;
			let inputQuestionId: string | null = null;
			let cachedLines: string[] | undefined;
			const answers = new Map<string, Answer>();

			// Editor for "Type something" option
			const editorTheme: EditorTheme = {
				borderColor: (s) => theme.fg("accent", s),
				selectList: {
					selectedPrefix: (t) => theme.fg("accent", t),
					selectedText: (t) => theme.fg("accent", t),
					description: (t) => theme.fg("muted", t),
					scrollInfo: (t) => theme.fg("dim", t),
					noMatch: (t) => theme.fg("warning", t),
				},
			};
			const editor = new Editor(tui, editorTheme);

			// Helpers
			function refresh() {
				cachedLines = undefined;
				tui.requestRender();
			}

			function submit(cancelled: boolean) {
				done({ questions, answers: Array.from(answers.values()), cancelled });
			}

			function currentQuestion(): Question | undefined {
				return questions[currentTab];
			}

			function currentOptions(): any[] {
				const q = currentQuestion();
				if (!q) return [];
				const opts: any[] = [...q.options];
				if (q.allowOther) {
					opts.push({ value: "__other__", label: "Type something.", isOther: true });
				}
				return opts;
			}

			function allAnswered(): boolean {
				return questions.every((q) => answers.has(q.id));
			}

			function advanceAfterAnswer() {
				if (!isMulti) {
					submit(false);
					return;
				}
				if (currentTab < questions.length - 1) {
					currentTab++;
				} else {
					currentTab = questions.length; // Submit tab
				}
				optionIndex = 0;
				refresh();
			}

			function saveAnswer(questionId: string, value: string, label: string, wasCustom: boolean, index?: number) {
				answers.set(questionId, { id: questionId, value, label, wasCustom, index });
			}

			// Editor submit callback
			editor.onSubmit = (value) => {
				if (!inputQuestionId) return;
				const trimmed = value.trim() || "(no response)";
				saveAnswer(inputQuestionId, trimmed, trimmed, true);
				inputMode = false;
				inputQuestionId = null;
				editor.setText("");
				advanceAfterAnswer();
			};

			function handleInput(data: string) {
				// Input mode: route to editor
				if (inputMode) {
					if (matchesKey(data, Key.escape)) {
						inputMode = false;
						inputQuestionId = null;
						editor.setText("");
						refresh();
						return;
					}
					editor.handleInput(data);
					refresh();
					return;
				}

				const q = currentQuestion();
				const opts = currentOptions();

				// Tab navigation (multi-question only)
				if (isMulti) {
					if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) {
						currentTab = (currentTab + 1) % totalTabs;
						optionIndex = 0;
						refresh();
						return;
					}
					if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) {
						currentTab = (currentTab - 1 + totalTabs) % totalTabs;
						optionIndex = 0;
						refresh();
						return;
					}
				}

				// Submit tab
				if (currentTab === questions.length) {
					if (matchesKey(data, Key.enter) && allAnswered()) {
						submit(false);
					} else if (matchesKey(data, Key.escape)) {
						submit(true);
					}
					return;
				}

				// Option navigation
				if (matchesKey(data, Key.up)) {
					optionIndex = Math.max(0, optionIndex - 1);
					refresh();
					return;
				}
				if (matchesKey(data, Key.down)) {
					optionIndex = Math.min(opts.length - 1, optionIndex + 1);
					refresh();
					return;
				}

				// Select option
				if (matchesKey(data, Key.enter) && q) {
					const opt = opts[optionIndex];
					if (opt.isOther) {
						inputMode = true;
						inputQuestionId = q.id;
						editor.setText("");
						refresh();
						return;
					}
					saveAnswer(q.id, opt.value, opt.label, false, optionIndex + 1);
					advanceAfterAnswer();
					return;
				}

				// Cancel
				if (matchesKey(data, Key.escape)) {
					submit(true);
				}
			}

			function render(width: number): string[] {
				if (cachedLines) return cachedLines;

				const lines: string[] = [];
				const q = currentQuestion();
				const opts = currentOptions();

				// Helper to add truncated line
				const add = (s: string) => lines.push(truncateToWidth(s, width));

				add(theme.fg("accent", "─".repeat(width)));

				// Tab bar (multi-question only)
				if (isMulti) {
					const tabs: string[] = ["← "];
					for (let i = 0; i < questions.length; i++) {
						const isActive = i === currentTab;
						const isAnswered = answers.has(questions[i].id);
						const lbl = questions[i].label;
						const box = isAnswered ? "■" : "□";
						const color = isAnswered ? "success" : "muted";
						const text = ` ${box} ${lbl} `;
						const styled = isActive ? theme.bg("selectedBg", theme.fg("text", text)) : theme.fg(color, text);
						tabs.push(`${styled} `);
					}
					const canSubmit = allAnswered();
					const isSubmitTab = currentTab === questions.length;
					const submitText = " ✓ Submit ";
					const submitStyled = isSubmitTab
						? theme.bg("selectedBg", theme.fg("text", submitText))
						: theme.fg(canSubmit ? "success" : "dim", submitText);
					tabs.push(`${submitStyled} →`);
					add(` ${tabs.join("")}`);
					lines.push("");
				}

				// Content
				if (inputMode && q) {
					add(theme.fg("text", ` ${q.prompt}`));
					lines.push("");
					// Show options for reference
					for (let i = 0; i < opts.length; i++) {
						const opt = opts[i];
						const prefix = (i === optionIndex) ? theme.fg("accent", "> ") : "  ";
						add(`${prefix}${opt.label}`);
					}
					lines.push("");
					add(theme.fg("muted", " Your answer:"));
					for (const line of editor.render(width - 2)) {
						add(` ${line}`);
					}
					lines.push("");
					add(theme.fg("dim", " Enter to submit • Esc to cancel"));
				} else if (currentTab === questions.length) {
					add(theme.fg("accent", theme.bold(" Ready to submit")));
					lines.push("");
					for (const question of questions) {
						const answer = answers.get(question.id);
						if (answer) {
							const prefix = answer.wasCustom ? "(wrote) " : "";
							add(`${theme.fg("muted", ` ${question.label}: `)}${theme.fg("text", prefix + answer.label)}`);
						}
					}
					lines.push("");
					if (allAnswered()) {
						add(theme.fg("success", " Press Enter to submit"));
					} else {
						const missing = questions
							.filter((q) => !answers.has(q.id))
							.map((q) => q.label)
							.join(", ");
						add(theme.fg("warning", ` Unanswered: ${missing}`));
					}
				} else if (q) {
					add(theme.fg("text", ` ${q.prompt}`));
					lines.push("");
					// Render options
					for (let i = 0; i < opts.length; i++) {
						const opt = opts[i];
						const selected = i === optionIndex;
						const prefix = selected ? theme.fg("accent", "> ") : "  ";
						const color = selected ? "accent" : "text";
						add(`${prefix}${theme.fg(color, opt.label)}`);
						if (opt.description) {
							add(`     ${theme.fg("muted", opt.description)}`);
						}
					}
				}

				lines.push("");
				if (!inputMode) {
					const help = isMulti
						? " Tab/←→ navigate • ↑↓ select • Enter confirm • Esc cancel"
						: " ↑↓ navigate • Enter select • Esc cancel";
					add(theme.fg("dim", help));
				}
				add(theme.fg("accent", "─".repeat(width)));

				cachedLines = lines;
				return lines;
			}

			return {
				render,
				invalidate: () => {
					cachedLines = undefined;
				},
				handleInput,
			};
		});

		if (result.cancelled) {
			return {
				content: [{ type: "text", text: "User cancelled the questionnaire" }],
				details: result,
			};
		}

		const answerLines = result.answers.map((a) => {
			const qLabel = questions.find((q) => q.id === a.id)?.label || a.id;
			if (a.wasCustom) {
				return `${qLabel}: user wrote: ${a.label}`;
			}
			return `${qLabel}: user selected: ${a.index}. ${a.label}`;
		});

		return {
			content: [{ type: "text", text: answerLines.join("\n") }],
			details: result,
		};
	}
}
