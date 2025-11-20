export interface ErrorContext {
  action?: string;
  status?: string;
  field?: string;
  [key: string]: unknown;
}

/**
 * Map technical errors to user-friendly messages
 */
export function getUserFriendlyError(
  error: Error | string,
  context?: ErrorContext
): string {
  const errorMessage = typeof error === "string" ? error : error.message;
  const errorCode =
    typeof error === "object" && "code" in error ? error.code : null;

  // Handle specific error codes
  if (errorCode === "OPTIMISTIC_LOCK_ERROR") {
    return "This application was recently updated by another user. Please refresh the page and try again.";
  }

  // Handle common error patterns
  if (errorMessage.includes("Unauthorized")) {
    return "You don't have permission to perform this action. Please contact your administrator if you believe this is an error.";
  }

  if (errorMessage.includes("not found")) {
    return "The requested item could not be found. It may have been deleted or you may not have access to it.";
  }

  if (errorMessage.includes("already exists")) {
    return "An active application already exists for this form configuration. Please complete or cancel the existing application first.";
  }

  if (errorMessage.includes("Cannot edit")) {
    const status = context?.status;
    if (status === "SUBMITTED" || status === "IN_REVIEW") {
      return "This application has been submitted and is currently under review. You cannot make changes at this time.";
    }
    if (status === "APPROVED") {
      return "This application has been approved. To make changes, please edit your Company Profile.";
    }
    if (status === "REJECTED") {
      return "This application has been rejected. You can create a new application if needed.";
    }
  }

  if (errorMessage.includes("Cannot submit")) {
    const status = context?.status;
    if (status === "SUBMITTED" || status === "IN_REVIEW") {
      return "This application has already been submitted and is under review.";
    }
    if (status === "APPROVED") {
      return "This application has already been approved. No further action is needed.";
    }
    if (status === "REJECTED") {
      return "This application has been rejected. Please create a new application to resubmit.";
    }
  }

  if (errorMessage.includes("Validation failed")) {
    return "Please check your form for errors. All required fields must be filled correctly.";
  }

  if (errorMessage.includes("Cannot edit fields")) {
    return "You can only edit the fields that procurement has requested changes for. Other fields are locked.";
  }

  // Generic fallback
  return (
    errorMessage ||
    "An unexpected error occurred. Please try again or contact support if the problem persists."
  );
}

/**
 * Get actionable error message with next steps
 */
export function getActionableError(
  error: Error | string,
  context?: ErrorContext
): { message: string; action?: string; actionLabel?: string } {
  const friendlyMessage = getUserFriendlyError(error, context);
  const errorMessage = typeof error === "string" ? error : error.message;

  // Add actionable steps for specific errors
  if (errorMessage.includes("OPTIMISTIC_LOCK_ERROR")) {
    return {
      message: friendlyMessage,
      action: "refresh",
      actionLabel: "Refresh Page",
    };
  }

  if (errorMessage.includes("already exists")) {
    return {
      message: friendlyMessage,
      action: "view-existing",
      actionLabel: "View Existing Application",
    };
  }

  return {
    message: friendlyMessage,
  };
}

