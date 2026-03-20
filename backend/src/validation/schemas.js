import sanitizeHtml from "sanitize-html";
import { z } from "../middleware/validationMiddleware.js";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id format");

const stripTags = (value) =>
  sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();

const textSchema = (min, max, label) =>
  z
    .string()
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`)
    .transform(stripTags);

const optionalTextSchema = (max, label) =>
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

const dateInputSchema = z
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

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const authRegisterSchema = z.object({
  body: z
    .object({
      name: textSchema(2, 80, "name"),
      email: z
        .string()
        .trim()
        .email("Invalid email")
        .max(254)
        .transform((v) => v.toLowerCase()),
      password: z
        .string()
        .min(8, "password must be at least 8 characters")
        .max(128),
    })
    .strict(),
});

export const authLoginSchema = z.object({
  body: z
    .object({
      email: z
        .string()
        .trim()
        .email("Invalid email")
        .max(254)
        .transform((v) => v.toLowerCase()),
      password: z.string().min(1).max(128),
    })
    .strict(),
});

export const workspaceCreateSchema = z.object({
  body: z
    .object({
      name: textSchema(1, 80, "name"),
    })
    .strict(),
});

export const workspaceIdParamsSchema = z.object({
  params: z.object({
    workspaceId: objectIdSchema,
  }),
});

export const workspaceMemberParamsSchema = z.object({
  params: z.object({
    workspaceId: objectIdSchema,
    memberId: objectIdSchema,
  }),
});

export const workspaceInviteSchema = z.object({
  params: z.object({
    workspaceId: objectIdSchema,
  }),
  body: z
    .object({
      email: z
        .string()
        .trim()
        .email("Invalid email")
        .max(254)
        .transform((v) => v.toLowerCase()),
      role: z.enum(["admin", "member"]).optional(),
    })
    .strict(),
});

export const workspaceMembersQuerySchema = z.object({
  params: z.object({
    workspaceId: objectIdSchema,
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const workspaceMemberRoleSchema = z.object({
  params: z.object({
    workspaceId: objectIdSchema,
    memberId: objectIdSchema,
  }),
  body: z
    .object({
      role: z.enum(["admin", "member"]),
    })
    .strict(),
});

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

export const workspaceOnlyParamsSchema = z.object({
  params: z.object({
    workspaceId: objectIdSchema,
  }),
});

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

export const notificationIdParamsSchema = z.object({
  params: z.object({
    notificationId: objectIdSchema,
  }),
});

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
