import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';

export const validate = (schema: ZodObject<any>) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      // Return the first specific error message as the main error
      const firstError = error.issues[0].message;
      return res.status(400).json({
        error: firstError,
        details: error.issues.map(e => ({ path: e.path, message: e.message }))
      });
    }
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
