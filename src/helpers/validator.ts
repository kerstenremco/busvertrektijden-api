import { z } from "zod";

export const querySchema = z.object({
  q: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9,.'"/-\s]+$/i),
});

export const validateQuery = (req, res, next) => {
  querySchema.parse(req.query);
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
  shortnamefilter: z.undefined().or(z.string().regex(/^[0-9,]+$/i)),
  tripheadsignfilter: z.undefined().or(z.string().regex(/^[a-z0-9,.'"/-\s]+$/i)),
});

export const validateStops = (req, res, next) => {
  stopParameterSchema.parse(req.params);
  stopQuerySchema.parse(req.query);
  next();
};
