import sanitizeHtml from "sanitize-html";
import { z } from "../../middleware/validationMiddleware.js";

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid id format");

const stripTags = (value) =>
  sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

export const textSchema = (min, max, label) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`)
    .transform(stripTags);

export const optionalTextSchema = (max, label) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined) {
        return undefined;
      }
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }
      return stripTags(trimmed);
    })
    .refine((value) => value === undefined || value.length <= max, {
      message: `${label} must be at most ${max} characters`,
    });

export const dateInputSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === "") {
      return undefined;
    }
    return value;
  })
  .refine((value) => value === undefined || !Number.isNaN(Date.parse(value)), {
    message: "dueDate must be a valid date",
  });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export { z };
