type ErrorWithResponseMessage = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  const message = (error as ErrorWithResponseMessage)?.response?.data?.message;
  return typeof message === "string" && message.trim()
    ? message
    : fallbackMessage;
};
