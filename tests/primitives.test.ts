import { describe, expect, it } from "bun:test";
import { GreetToolParams, TodoToolParams, LongProcessToolParams } from "../src/core/primitives";
import { STORE_KEY, FLAG_USERNAME, FLAG_USE_GIT_CHECKPOINT, WIDGET_ID } from "../src/core/constants";

describe("Core: Primitives & Constants", () => {
  describe("Tool Parameter Schemas", () => {
    it("should have GreetToolParams with message field", () => {
      expect(GreetToolParams.properties).toHaveProperty("message");
    });

    it("should have TodoToolParams with action and optional item fields", () => {
      expect(TodoToolParams.properties).toHaveProperty("action");
      expect(TodoToolParams.properties).toHaveProperty("item");
    });

    it("should have empty LongProcessToolParams", () => {
      expect(Object.keys(LongProcessToolParams.properties)).toHaveLength(0);
    });
  });

  describe("Constants", () => {
    it("should export STORE_KEY", () => {
      expect(STORE_KEY).toBe("kitchen_sink_v1");
    });

    it("should export FLAG_USERNAME", () => {
      expect(FLAG_USERNAME).toBe("username");
    });

    it("should export FLAG_USE_GIT_CHECKPOINT", () => {
      expect(FLAG_USE_GIT_CHECKPOINT).toBe("useGitCheckpoint");
    });

    it("should export WIDGET_ID", () => {
      expect(WIDGET_ID).toBe("kitchen-sink-status");
    });
  });
});