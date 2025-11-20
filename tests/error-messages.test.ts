import { describe, it, expect } from "vitest";
import {
  getUserFriendlyError,
  getActionableError,
} from "@/lib/error-messages";

describe("Error Messages", () => {
  describe("getUserFriendlyError", () => {
    it("should handle OPTIMISTIC_LOCK_ERROR", () => {
      const error = new Error("Conflict") as Error & { code: string };
      error.code = "OPTIMISTIC_LOCK_ERROR";

      const message = getUserFriendlyError(error);
      expect(message).toContain("recently updated");
      expect(message).toContain("refresh");
    });

    it("should handle Unauthorized errors", () => {
      const error = new Error("Unauthorized");
      const message = getUserFriendlyError(error);
      expect(message).toContain("permission");
      expect(message).toContain("administrator");
    });

    it("should handle not found errors", () => {
      const error = new Error("Application not found");
      const message = getUserFriendlyError(error);
      expect(message).toContain("could not be found");
    });

    it("should handle already exists errors", () => {
      const error = new Error("Application already exists");
      const message = getUserFriendlyError(error);
      expect(message).toContain("already exists");
    });

    it("should handle Cannot edit errors with context", () => {
      const error = new Error("Cannot edit application");
      const message = getUserFriendlyError(error, { status: "SUBMITTED" });
      expect(message).toContain("submitted");
      expect(message).toContain("under review");
    });

    it("should handle Cannot edit APPROVED status", () => {
      const error = new Error("Cannot edit application");
      const message = getUserFriendlyError(error, { status: "APPROVED" });
      expect(message).toContain("approved");
      expect(message).toContain("Company Profile");
    });

    it("should handle Validation failed errors", () => {
      const error = new Error("Validation failed");
      const message = getUserFriendlyError(error);
      expect(message).toContain("check your form");
    });

    it("should provide generic fallback for unknown errors", () => {
      const error = new Error("Some unknown error");
      const message = getUserFriendlyError(error);
      expect(message).toBe("Some unknown error");
    });

    it("should handle string errors", () => {
      const message = getUserFriendlyError("String error");
      expect(message).toBe("String error");
    });
  });

  describe("getActionableError", () => {
    it("should return refresh action for OPTIMISTIC_LOCK_ERROR", () => {
      const error = new Error("OPTIMISTIC_LOCK_ERROR") as Error & {
        code: string;
      };
      error.code = "OPTIMISTIC_LOCK_ERROR";

      const result = getActionableError(error);
      expect(result.action).toBe("refresh");
      expect(result.actionLabel).toBe("Refresh Page");
    });

    it("should return view-existing action for already exists errors", () => {
      const error = new Error("Application already exists");
      const result = getActionableError(error);
      expect(result.action).toBe("view-existing");
      expect(result.actionLabel).toBe("View Existing Application");
    });

    it("should return message only for other errors", () => {
      const error = new Error("Some other error");
      const result = getActionableError(error);
      expect(result.message).toBeTruthy();
      expect(result.action).toBeUndefined();
    });
  });
});

