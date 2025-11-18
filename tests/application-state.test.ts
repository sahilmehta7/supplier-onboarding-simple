import { describe, it, expect } from "vitest";
import { canTransition } from "@/lib/application-state";

describe("application state machine", () => {
  it("allows valid transition", () => {
    expect(canTransition("SUBMITTED", "IN_REVIEW")).toBe(true);
  });

  it("blocks invalid transition", () => {
    expect(canTransition("SUBMITTED", "APPROVED")).toBe(false);
  });
});
