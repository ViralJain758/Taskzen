import { z, textSchema } from "./common.js";

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
