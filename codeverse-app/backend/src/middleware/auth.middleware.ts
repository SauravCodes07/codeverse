import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export interface AuthRequest extends Request {
  user?: any; // Use any or a specific user type that matches what AuthService.verifyToken returns
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = AuthService.verifyToken(token);

    if (!decoded) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }

    (req as any).user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

