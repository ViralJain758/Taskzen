import { z, objectIdSchema, textSchema } from "./common.js";

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

export const workspaceOnlyParamsSchema = z.object({
  params: z.object({
    workspaceId: objectIdSchema,
  }),
});
