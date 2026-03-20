import { z, objectIdSchema, paginationQuerySchema } from "./common.js";

export const activityWorkspaceSchema = z.object({
  params: z.object({
    workspaceId: objectIdSchema,
  }),
  query: paginationQuerySchema,
});

export const activityProjectSchema = z.object({
  params: z.object({
    projectId: objectIdSchema,
  }),
});
