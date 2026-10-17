import { Request, Response, NextFunction } from "express";
import { z, ZodType, ZodError } from "zod";

export interface RequestValidators {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function validate(schemas: RequestValidators) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        const parsedQuery = (await schemas.query.parseAsync(req.query)) as any;
        try {
          req.query = parsedQuery;
        } catch {
          Object.defineProperty(req, "query", {
            value: parsedQuery,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        }
      }
      if (schemas.params) {
        const parsedParams = (await schemas.params.parseAsync(req.params)) as any;
        try {
          req.params = parsedParams;
        } catch {
          Object.defineProperty(req, "params", {
            value: parsedParams,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        }
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: "error",
          message: "Validation failed",
          errors: z.flattenError(error).fieldErrors,
        });
        return;
      }
      next(error);
    }
  };
}
