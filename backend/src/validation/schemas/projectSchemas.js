import { z, objectIdSchema, optionalTextSchema, textSchema } from "./common.js";

export const projectCreateSchema = z.object({
  params: z.object({
    workspaceId: objectIdSchema,
  }),
  body: z
    .object({
      name: textSchema(1, 120, "name"),
      description: optionalTextSchema(2000, "description"),
    })
    .strict(),
});

export const projectIdParamsSchema = z.object({
  params: z.object({
    projectId: objectIdSchema,
  }),
});

export const workspaceProjectParamsSchema = z.object({
  params: z.object({
    workspaceId: objectIdSchema,
    projectId: objectIdSchema,
  }),
});
