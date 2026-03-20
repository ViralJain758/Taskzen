import {
  z,
  dateInputSchema,
  objectIdSchema,
  optionalTextSchema,
  textSchema,
} from "./common.js";

export const taskCreateSchema = z.object({
  params: z.object({
    projectId: objectIdSchema,
  }),
  body: z
    .object({
      title: textSchema(1, 200, "title"),
      description: optionalTextSchema(5000, "description"),
      assignee: z.union([objectIdSchema, z.null()]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      dueDate: dateInputSchema,
    })
    .strict(),
});

export const taskProjectParamsSchema = z.object({
  params: z.object({
    projectId: objectIdSchema,
  }),
});

export const taskStatusSchema = z.object({
  params: z.object({
    taskId: objectIdSchema,
  }),
  body: z
    .object({
      status: z.enum(["todo", "in_progress", "completed"]),
    })
    .strict(),
});

export const taskUpdateSchema = z.object({
  params: z.object({
    taskId: objectIdSchema,
  }),
  body: z
    .object({
      title: textSchema(1, 200, "title").optional(),
      description: optionalTextSchema(5000, "description"),
      priority: z.enum(["low", "medium", "high"]).optional(),
      assignee: z.union([objectIdSchema, z.null()]).optional(),
      dueDate: dateInputSchema,
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field is required",
    }),
});

export const taskIdParamsSchema = z.object({
  params: z.object({
    taskId: objectIdSchema,
  }),
});
