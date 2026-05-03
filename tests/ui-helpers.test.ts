import { describe, expect, it } from "bun:test";
import { createStatusWidget } from "../src/core/ui";
import type { AppState } from "../src/core/primitives";
import type { AppConfig } from "../src/core/validation";

describe("Core: UI Helpers", () => {
  describe("createStatusWidget()", () => {
    it("should create a markdown status widget", () => {
      const state: AppState = { sessionCount: 5, todoList: ["Task 1", "Task 2"] };
      const config: AppConfig = { username: "Alice", useGitCheckpoint: true };

      const widget = createStatusWidget(state, config);

      expect(widget[0]).toBe("### 🍳 Kitchen Sink Status");
      expect(widget).toContain("**Session Count**: 5");
      expect(widget).toContain("**To-Do Items**: 2");
      expect(widget).toContain("**Username**: Alice");
      expect(widget).toContain("**Git Checkpoints**: ✅");
    });

    it("should show ❌ when git checkpoint is disabled", () => {
      const state: AppState = { sessionCount: 1, todoList: [] };
      const config: AppConfig = { username: "Bob", useGitCheckpoint: false };

      const widget = createStatusWidget(state, config);

      expect(widget).toContain("**Git Checkpoints**: ❌");
    });

    it("should show zero to-do items correctly", () => {
      const state: AppState = { sessionCount: 0, todoList: [] };
      const config: AppConfig = { username: "Test", useGitCheckpoint: true };

      const widget = createStatusWidget(state, config);

      expect(widget).toContain("**To-Do Items**: 0");
    });

    it("should show correct to-do count for multiple items", () => {
      const state: AppState = {
        sessionCount: 10,
        todoList: ["A", "B", "C", "D", "E"]
      };
      const config: AppConfig = { username: "Test", useGitCheckpoint: true };

      const widget = createStatusWidget(state, config);

      expect(widget).toContain("**To-Do Items**: 5");
    });

    it("should return an array of 4 lines", () => {
      const state: AppState = { sessionCount: 1, todoList: [] };
      const config: AppConfig = { username: "Test", useGitCheckpoint: true };

      const widget = createStatusWidget(state, config);

      expect(widget.length).toBeGreaterThanOrEqual(5);
    });

    it("should handle empty username", () => {
      const state: AppState = { sessionCount: 1, todoList: [] };
      const config: AppConfig = { username: "", useGitCheckpoint: true };

      const widget = createStatusWidget(state, config);

      expect(widget).toContain("**Username**: ");
    });
  });
});