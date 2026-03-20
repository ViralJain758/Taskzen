type ErrorWithResponseMessage = {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message?: string;
};

const looksTechnical = (message: string): boolean => {
  const technicalPatterns = [
    /\bE\d{3,6}\b/i,
    /Mongo|Mongoose|CastError|ValidationError|BSON|ObjectId/i,
    /stack|trace|exception|errno|code\s*[:=]/i,
    /duplicate key|E11000/i,
    /TypeError|ReferenceError|SyntaxError/i,
    /body\.|params\.|query\./i,
  ];

  return technicalPatterns.some((pattern) => pattern.test(message));
};

const mapStatusToFriendlyMessage = (status?: number): string | null => {
  if (status === 400) return "Please check your input and try again.";
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403)
    return "You do not have permission to perform this action.";
  if (status === 404) return "The requested item could not be found.";
  if (status === 409) return "This action conflicts with existing data.";
  if (status === 422)
    return "Some fields are invalid. Please review and try again.";
  if (status === 429)
    return "Too many requests right now. Please try again shortly.";
  if (status && status >= 500)
    return "Something went wrong on our side. Please try again.";
  return null;
};

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const apiError = error as ErrorWithResponseMessage;
  const status = apiError?.response?.status;
  const rawMessage = apiError?.response?.data?.message;

  if (typeof rawMessage === "string" && rawMessage.trim()) {
    const sanitizedMessage = rawMessage.trim();
    if (!looksTechnical(sanitizedMessage)) {
      return sanitizedMessage;
    }
  }

  const mappedMessage = mapStatusToFriendlyMessage(status);
  if (mappedMessage) {
    return mappedMessage;
  }

  if (!apiError?.response) {
    return "Unable to reach server. Check your connection and try again.";
  }

  return fallbackMessage;
};
