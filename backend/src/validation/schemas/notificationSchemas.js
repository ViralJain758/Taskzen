import { z, objectIdSchema } from "./common.js";

export const notificationIdParamsSchema = z.object({
  params: z.object({
    notificationId: objectIdSchema,
  }),
});
