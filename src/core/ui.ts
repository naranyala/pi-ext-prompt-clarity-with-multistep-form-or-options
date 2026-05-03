/**
 * The UI service provides helper functions for creating consistent UI components.
 */
import type { AppState } from "./primitives";
import type { AppConfig } from "./validation";

export function createStatusWidget(state: AppState, config: AppConfig): string[] {
    return [
        `### 🍳 Kitchen Sink Status`,
        `**Session Count**: ${state.sessionCount}`,
        `**To-Do Items**: ${state.todoList.length}`,
        `**Username**: ${config.username}`,
        `**Git Checkpoints**: ${config.useGitCheckpoint ? '✅' : '❌'}`
    ];
}
