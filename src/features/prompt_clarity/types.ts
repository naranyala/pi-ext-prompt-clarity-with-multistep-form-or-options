/**
 * Vagueness Dimensions
 * These represent the specific areas where a prompt might be lacking detail.
 */
export enum VaguenessDimension {
    TECHNOLOGY = "technology", // Missing tech stack, libraries, or frameworks
    SCOPE = "scope",           // Missing boundaries (file, folder, project)
    FORMAT = "format",         // Missing output requirement (JSON, Markdown, etc.)
    CONTEXT = "context",       // Missing reference to existing code or state
    INTENT = "intent"          // Missing clear goal (fix, refactor, explain)
}

/**
 * A semantic report of how ambiguous a prompt is.
 */
export interface AmbiguityReport {
    score: number; // 0.0 to 1.0
    dimensions: VaguenessDimension[];
    isAmbiguous: boolean;
}

/**
 * Interface for a question to be used in the QuestionnaireUI.
 */
export interface QuestionOption {
    value: string;
    label: string;
    description?: string;
}

export interface Question {
    id: string;
    label: string;
    prompt: string;
    options: QuestionOption[];
    allowOther: boolean;
    mode: 'single' | 'multiple';
}
