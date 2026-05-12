import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, username, password, fullName } = req.body;

      if (!email || !username || !password || !fullName) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Check if user already exists
      const existingEmail = await AuthService.findUserByEmail(email);
      if (existingEmail) {
        res.status(409).json({ error: 'Email already registered' });
        return;
      }

      const existingUsername = await AuthService.findUserByUsername(username);
      if (existingUsername) {
        res.status(409).json({ error: 'Username already taken' });
        return;
      }

      // Hash password and create user
      const passwordHash = await AuthService.hashPassword(password);
      const user = await AuthService.createUser({
        email,
        username,
        fullName,
        passwordHash,
      });

      const token = AuthService.generateToken({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user,
      });
      return;
    } catch (error) {
      console.error('[Register Error]', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password required' });
        return;
      }

      const user = await AuthService.findUserByEmail(email);
      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const isMatch = await AuthService.comparePasswords(password, user.password_hash);
      if (!isMatch) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      await AuthService.updateLastLogin(user.id);

      const token = AuthService.generateToken({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
        },
      });
      return;
    } catch (error) {
      console.error('[Login Error]', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }

  static async me(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const fullUser = await AuthService.findUserByEmail(user.email);
      
      if (!fullUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        id: fullUser.id,
        email: fullUser.email,
        username: fullUser.username,
        full_name: fullUser.full_name,
        avatar_url: fullUser.avatar_url,
        created_at: fullUser.created_at,
      });
      return;
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  }
}
