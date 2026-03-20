import { z, objectIdSchema, textSchema } from "./common.js";

export const commentCreateSchema = z.object({
  params: z.object({
    taskId: objectIdSchema,
  }),
  body: z
    .object({
      content: textSchema(1, 2000, "content"),
    })
    .strict(),
});

export const commentIdParamsSchema = z.object({
  params: z.object({
    commentId: objectIdSchema,
  }),
});
