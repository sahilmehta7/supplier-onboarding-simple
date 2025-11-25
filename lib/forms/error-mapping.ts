import { z } from "zod";

/**
 * Maps Zod issues to user-friendly error messages
 */
export function mapZodIssueToMessage(issue: z.ZodIssue): string {
    const code = issue.code as string;

    // For required fields
    if (code === "invalid_type") {
        const received = (issue as any).received;
        if (received === "undefined" || received === "null") {
            return "This field is required";
        }
        const expected = (issue as any).expected;
        if (expected === "number") {
            return "Please enter a valid number";
        }
        if (expected === "string") {
            return "Please enter text";
        }
        if (expected === "date") {
            return "Please select a valid date";
        }
        return issue.message;
    }

    // For enum/select validations - check by message content to avoid type narrowing issues
    if (issue.message.includes("Invalid enum value") ||
        issue.message.includes("Invalid input") ||
        code === "invalid_union") {
        return "Please select a valid option from the list";
    }

    // For length/size validations
    if (code === "too_small") {
        const type = (issue as any).type;
        const minimum = (issue as any).minimum;
        if (type === "string") {
            return `Must be at least ${minimum} characters`;
        }
        if (type === "number") {
            return `Must be at least ${minimum}`;
        }
        if (type === "array") {
            return `Please select at least ${minimum} option${minimum > 1 ? "s" : ""}`;
        }
        return issue.message;
    }

    if (code === "too_big") {
        const type = (issue as any).type;
        const maximum = (issue as any).maximum;
        if (type === "string") {
            return `Must be at most ${maximum} characters`;
        }
        if (type === "number") {
            return `Must be at most ${maximum}`;
        }
        if (type === "array") {
            return `Please select at most ${maximum} option${maximum > 1 ? "s" : ""}`;
        }
        return issue.message;
    }

    // For string format validations
    if (issue.message.includes("email")) {
        return "Please enter a valid email address";
    }
    if (issue.message.includes("phone")) {
        return "Please enter a valid phone number";
    }
    if (issue.message.includes("Invalid date")) {
        return "Please enter a valid date";
    }

    // For custom validations, use the custom message
    if (code === "custom") {
        return issue.message;
    }

    // Fallback: clean up technical messages
    if (issue.message.startsWith("Expected") && issue.message.includes("received")) {
        return "Invalid value";
    }

    return issue.message;
}
