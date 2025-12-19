import { z } from "zod";

export const querySchema = z.object({
  q: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9,./-\s]+$/i),
});

export const validateQuery = (req, res, next) => {
  const parseResult = querySchema.safeParse(req.query);
  if (!parseResult.success) {
    console.error("Validation error:", parseResult.error);
    return res.status(500).json({ error: "Invalid request" });
  }
  next();
};

export const stopParameterSchema = z.object({
  ids: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9:,]+$/i),
});

export const stopQuerySchema = z.object({
  date: z.undefined().or(z.string().regex(/^20[0-9]{6}$/)),
});

export const validateStops = (req, res, next) => {
  const stopParameters = stopParameterSchema.safeParse(req.params);
  const stopQuery = stopQuerySchema.safeParse(req.query);

  if (!stopParameters.success) {
    console.error("Validation error:", stopParameters.error);
    return res.status(500).json({ error: "Invalid request" });
  }

  if (!stopQuery.success && req.query.date !== undefined) {
    console.error("Validation error:", stopQuery.error);
    return res.status(500).json({ error: "Invalid request" });
  }

  next();
};
