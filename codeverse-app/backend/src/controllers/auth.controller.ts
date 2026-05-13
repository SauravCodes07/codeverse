import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import config from '../config/env';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { email, username, password, fullName } = req.body;

      if (!email || !username || !password || !fullName) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

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

      const refreshToken = AuthService.generateRefreshToken({ id: user.id });

      res.status(201).json({
        message: 'User registered successfully',
        token,
        refreshToken,
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

      const refreshToken = AuthService.generateRefreshToken({ id: user.id });

      res.json({
        message: 'Login successful',
        token,
        refreshToken,
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
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

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

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token required' });
        return;
      }

      const decoded = AuthService.verifyToken(refreshToken);
      if (!decoded) {
        res.status(403).json({ error: 'Invalid refresh token' });
        return;
      }

      // Check if user exists
      const result = await AuthService.findUserByEmail(decoded.email); // or by ID if refresh token has ID
      // If refresh token only has ID, we might need a different lookup
      // For now, let's assume it has what we need or we look up by ID
      
      const token = AuthService.generateToken({
        id: decoded.id,
        email: decoded.email || '', 
        username: decoded.username || '',
      });

      res.json({ token });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const user = await AuthService.findUserByEmail(email);
      
      if (user) {
        const otp = await AuthService.generateOTP(email);
        console.log(`[OTP for ${email}]: ${otp}`); // In production, send via email
      }

      res.json({ message: 'If an account exists with this email, an OTP has been sent.' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async verifyOTP(req: Request, res: Response) {
    try {
      const { email, otp, newPassword } = req.body;
      const isValid = await AuthService.verifyOTP(email, otp);
      
      if (!isValid) {
        res.status(400).json({ error: 'Invalid or expired OTP' });
        return;
      }

      if (newPassword) {
        const user = await AuthService.findUserByEmail(email);
        const passwordHash = await AuthService.hashPassword(newPassword);
        await AuthService.updatePassword(user.id, passwordHash);
        res.json({ message: 'Password updated successfully' });
      } else {
        res.json({ message: 'OTP verified successfully' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async oauthSuccess(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) {
        res.redirect(`${config.frontendUrl}/login?error=auth_failed`);
        return;
      }

      await AuthService.updateLastLogin(user.id);

      const token = AuthService.generateToken({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      res.redirect(`${config.frontendUrl}/?token=${token}`);
    } catch (error) {
      console.error('[OAuth Success Error]', error);
      res.redirect(`${config.frontendUrl}/login?error=server_error`);
    }
  }
}

