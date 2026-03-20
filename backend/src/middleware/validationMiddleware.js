import { z } from "zod";

const formatZodError = (error) => {
  const issue = error.issues?.[0];
  if (!issue) {
    return "Invalid request";
  }

  const path = issue.path?.length ? issue.path.join(".") : "request";
  return `${path}: ${issue.message}`;
};

export const validateRequest = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    return res.status(400).json({
      message: formatZodError(result.error),
    });
  }

  if (result.data.body !== undefined) {
    req.body = result.data.body;
  }

  if (result.data.params !== undefined) {
    req.params = result.data.params;
  }

  if (
    result.data.query !== undefined &&
    req.query &&
    typeof req.query === "object"
  ) {
    Object.keys(req.query).forEach((key) => {
      delete req.query[key];
    });

    Object.assign(req.query, result.data.query);
  }

  return next();
};

export { z };
