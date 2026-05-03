/**
 * Questionnaire UI Engine
 * 
 * A reusable TUI component for presenting structured questions to the user.
 * Supports single-select (radio) and multi-select (checkbox) modes.
 */
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Editor, type EditorTheme, Key, matchesKey, truncateToWidth } from "@mariozechner/pi-tui";

export type SelectionMode = 'single' | 'multiple';

export interface QuestionOption {
    value: string;
    label: string;
    description?: string;
    isOther?: boolean;
}

export interface Question {
    id: string;
    label: string;
    prompt: string;
    options: QuestionOption[];
    allowOther: boolean;
    mode: SelectionMode;
}

export interface Answer {
    id: string;
    values: string[]; // Always an array to support both modes
    labels: string[];
    wasCustom: boolean;
    indices?: number[];
}

export interface QuestionnaireResult {
    questions: Question[];
    answers: Answer[];
    cancelled: boolean;
}

export class QuestionnaireUI {
    constructor(private readonly ctx: ExtensionContext) {}

    async run(questions: Question[]): Promise<QuestionnaireResult> {
        if (!this.ctx.hasUI) {
            throw new Error("UI not available");
        }

        const { theme } = this.ctx.ui;
        const isMultiQuestion = questions.length > 1;
        const totalTabs = questions.length + 1; // questions + Submit

        return await this.ctx.ui.custom<QuestionnaireResult>((tui, theme, _kb, done) => {
            // --- State ---
            let currentTab = 0;
            let optionIndex = 0;
            let scrollOffset = 0;
            let inputMode = false;
            let inputQuestionId: string | null = null;
            let cachedLines: string[] | undefined;
            const answers = new Map<string, Answer>();

            // Editor for "Type something"
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

            // --- Helpers ---
            const refresh = () => {
                cachedLines = undefined;
                tui.requestRender();
            };

            const getVisibleCount = () => Math.max(1, tui.terminal.rows - 10);

            const submit = (cancelled: boolean) => {
                done({ questions, answers: Array.from(answers.values()), cancelled });
            };

            const currentQuestion = () => questions[currentTab];

            const currentOptions = (): QuestionOption[] => {
                const q = currentQuestion();
                if (!q) return [];
                const opts: QuestionOption[] = [...q.options];
                if (q.allowOther) {
                    opts.push({ value: "__other__", label: "Type something.", isOther: true });
                }
                return opts;
            };

            const allAnswered = () => questions.every((q) => answers.has(q.id));

            const advanceAfterAnswer = () => {
                if (!isMultiQuestion) {
                    submit(false);
                    return;
                }
                if (currentTab < questions.length - 1) {
                    currentTab++;
                } else {
                    currentTab = questions.length; // Move to Submit tab
                }
                optionIndex = 0;
                scrollOffset = 0;
                refresh();
            };

            const saveAnswer = (questionId: string, values: string[], labels: string[], wasCustom: boolean, indices?: number[]) => {
                answers.set(questionId, { id: questionId, values, labels, wasCustom, indices });
            };

            // --- Event Handlers ---
            editor.onSubmit = (value) => {
                if (!inputQuestionId) return;
                const trimmed = value.trim() || "(no response)";
                saveAnswer(inputQuestionId, [trimmed], [trimmed], true);
                inputMode = false;
                inputQuestionId = null;
                editor.setText("");
                advanceAfterAnswer();
            };

            const handleInput = (data: string) => {
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
                if (!q) return;
                const opts = currentOptions();

                // 1. Tab Navigation
                if (isMultiQuestion) {
                    if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) {
                        currentTab = (currentTab + 1) % totalTabs;
                        optionIndex = 0;
                        scrollOffset = 0;
                        refresh();
                        return;
                    }
                    if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) {
                        currentTab = (currentTab - 1 + totalTabs) % totalTabs;
                        optionIndex = 0;
                        scrollOffset = 0;
                        refresh();
                        return;
                    }
                }

                // 2. Submit Tab
                if (currentTab === questions.length) {
                    if (matchesKey(data, Key.enter) && allAnswered()) {
                        submit(false);
                    } else if (matchesKey(data, Key.escape)) {
                        submit(true);
                    }
                    return;
                }

                // 3. Option Navigation
                if (matchesKey(data, Key.up)) {
                    optionIndex = Math.max(0, optionIndex - 1);
                    if (optionIndex < scrollOffset) {
                        scrollOffset = optionIndex;
                    }
                    refresh();
                    return;
                }
                if (matchesKey(data, Key.down)) {
                    optionIndex = Math.min(opts.length - 1, optionIndex + 1);
                    const visibleCount = getVisibleCount();
                    if (optionIndex >= scrollOffset + visibleCount) {
                        scrollOffset = optionIndex - visibleCount + 1;
                    }
                    refresh();
                    return;
                }

                // 4. Selection Logic
                if (matchesKey(data, Key.enter)) {
                    const opt = opts[optionIndex];
                    if (opt.isOther) {
                        inputMode = true;
                        inputQuestionId = q.id;
                        editor.setText("");
                        refresh();
                        return;
                    }

                    if (q.mode === 'single') {
                        saveAnswer(q.id, [opt.value], [opt.label], false, [optionIndex]);
                        advanceAfterAnswer();
                    } else {
                        // Multi-select logic
                        const existing = answers.get(q.id);
                        const currentValues = existing ? [...existing.values] : [];
                        const currentLabels = existing ? [...existing.labels] : [];
                        const currentIndices = existing ? [...existing.indices!] : [];

                        const idxInOpts = opts.indexOf(opt);
                        if (currentValues.includes(opt.value)) {
                            // Deselect
                            const vIdx = currentValues.indexOf(opt.value);
                            currentValues.splice(vIdx, 1);
                            currentLabels.splice(vIdx, 1);
                            currentIndices.splice(vIdx, 1);
                        } else {
                            // Select
                            currentValues.push(opt.value);
                            currentLabels.push(opt.label);
                            currentIndices.push(idxInOpts);
                        }
                        saveAnswer(q.id, currentValues, currentLabels, false, currentIndices);
                        refresh();
                    }
                    return;
                }

                // 5. Cancel
                if (matchesKey(data, Key.escape)) {
                    submit(true);
                }
            };

            // --- Rendering ---
            const render = (width: number): string[] => {
                if (cachedLines) return cachedLines;
                const lines: string[] = [];
                const add = (s: string) => lines.push(truncateToWidth(s, width));

                add(theme.fg("accent", "─".repeat(width)));

                // Tab Bar
                if (isMultiQuestion) {
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

                const q = currentQuestion();
                if (inputMode && q) {
                    add(theme.fg("text", ` ${q.prompt}`));
                    lines.push("");
                    for (let i = 0; i < currentOptions().length; i++) {
                        const opt = currentOptions()[i];
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
                    // Summary view
                    add(theme.fg("accent", theme.bold(" Ready to submit")));
                    lines.push("");
                    for (const question of questions) {
                        const ans = answers.get(question.id);
                        if (ans) {
                            const prefix = ans.wasCustom ? "(wrote) " : "";
                            add(`${theme.fg("muted", ` ${question.label}: `)}${theme.fg("text", prefix + ans.labels.join(", "))}`);
                        }
                    }
                    lines.push("");
                    if (allAnswered()) {
                        add(theme.fg("success", " Press Enter to submit"));
                    } else {
                        const missing = questions.filter(v => !answers.has(v.id)).map(v => v.label).join(", ");
                        add(theme.fg("warning", ` Unanswered: ${missing}`));
                    }
                } else if (q) {
                    add(theme.fg("text", ` ${q.prompt}`));
                    lines.push("");
                    const opts = currentOptions();
                    const visibleCount = getVisibleCount();
                    for (let i = scrollOffset; i < Math.min(scrollOffset + visibleCount, opts.length); i++) {
                        const opt = opts[i];
                        const selected = i === optionIndex;
                        const prefix = selected ? theme.fg("accent", "> ") : "  ";
                        const color = selected ? "accent" : "text";
                        const checkbox = q.mode === 'multiple' ? (answers.get(q.id)?.values.includes(opt.value) ? "[x] " : "[ ] ") : "  ";
                        
                        add(`${prefix}${checkbox}${theme.fg(color, opt.label)}`);
                        if (opt.description) {
                            add(`     ${theme.fg("muted", opt.description)}`);
                        }
                    }
                }

                lines.push("");
                if (!inputMode) {
                    const help = isMultiQuestion
                        ? " Tab/←→ navigate • ↑↓ select • Enter confirm • Esc cancel"
                        : " ↑↓ navigate • Enter select • Esc cancel";
                    add(theme.fg("dim", help));
                }
                add(theme.fg("accent", "─".repeat(width)));

                cachedLines = lines;
                return lines;
            };

            return {
                render,
                invalidate: () => { cachedLines = undefined; },
                handleInput,
            };
        });

        if (result.cancelled) {
            return {
                content: [{ type: "text", text: "User cancelled" }],
                details: result,
            };
        }

        return result;
    }
}
