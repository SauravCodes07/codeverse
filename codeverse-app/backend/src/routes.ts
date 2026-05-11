import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

interface User {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// AUTH MIDDLEWARE & UTILITIES
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user: any) => {
    if (err) {
      console.error('Token verification failed:', err);
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

export const generateToken = (userId: string, email: string): string => {
  return jwt.sign(
    { id: userId, email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 10);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

export const createAuthRoutes = (router: express.Router, db: Pool) => {
  // Register
  router.post('/auth/register', async (req: Request, res: Response) => {
    try {
      const { email, username, password, fullName } = req.body;

      // Validation
      if (!email || !password || !username) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if user exists
      const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const userId = uuidv4();
      const result = await db.query(
        `INSERT INTO users (id, email, username, password_hash, full_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, email, username, created_at`,
        [userId, email, username, passwordHash, fullName || username]
      );

      // Create JWT token
      const token = generateToken(result.rows[0].id, result.rows[0].email);

      console.log(`User registered: ${email}`);

      res.status(201).json({
        token,
        user: result.rows[0],
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login
  router.post('/auth/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validation
      if (!email || !password) {
        return res.status(400).json({ error: 'Missing email or password' });
      }

      // Get user
      const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = userResult.rows[0] as User;

      // Verify password
      const passwordMatch = await verifyPassword(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Create JWT token
      const token = generateToken(user.id, user.email);

      console.log(`User logged in: ${email}`);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get current user
  router.get('/auth/me', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const result = await db.query(
        'SELECT id, email, username, full_name, avatar_url, created_at FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Logout
  router.post('/auth/logout', authenticateToken, (req: AuthRequest, res: Response) => {
    // In production, you might want to blacklist the token in Redis
    res.json({ message: 'Logged out successfully' });
  });

  return router;
};

// ============================================================================
// WORKSPACE ROUTES
// ============================================================================

export const createWorkspaceRoutes = (router: express.Router, db: Pool) => {
  // Get user's workspaces
  router.get('/workspaces', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const result = await db.query(
        `SELECT * FROM workspaces WHERE owner_id = $1 ORDER BY created_at DESC`,
        [userId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create workspace
  router.post('/workspaces', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Workspace name is required' });
      }

      const workspaceId = uuidv4();
      const result = await db.query(
        `INSERT INTO workspaces (id, name, description, owner_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`,
        [workspaceId, name, description, userId]
      );

      console.log(`Workspace created: ${name} by ${userId}`);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating workspace:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get workspace
  router.get('/workspaces/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const result = await db.query('SELECT * FROM workspaces WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching workspace:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update workspace
  router.put('/workspaces/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const result = await db.query(
        `UPDATE workspaces SET name = $1, description = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [name, description, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating workspace:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete workspace
  router.delete('/workspaces/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Delete associated files first
      await db.query('DELETE FROM files WHERE workspace_id = $1', [id]);

      // Delete workspace
      const result = await db.query('DELETE FROM workspaces WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      res.json({ message: 'Workspace deleted' });
    } catch (error) {
      console.error('Error deleting workspace:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

// ============================================================================
// FILE ROUTES
// ============================================================================

export const createFileRoutes = (router: express.Router, db: Pool) => {
  // Get files in workspace
  router.get('/workspaces/:workspaceId/files', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;

      const result = await db.query(
        `SELECT * FROM files WHERE workspace_id = $1 ORDER BY path ASC`,
        [workspaceId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching files:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create file
  router.post('/workspaces/:workspaceId/files', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const { name, path, content, language } = req.body;

      if (!name || !path || !language) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const fileId = uuidv4();
      const result = await db.query(
        `INSERT INTO files (id, workspace_id, name, path, content, language, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [fileId, workspaceId, name, path, content || '', language]
      );

      console.log(`File created: ${name} in workspace ${workspaceId}`);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update file
  router.put('/workspaces/:workspaceId/files/:fileId', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, fileId } = req.params;
      const { content } = req.body;

      const result = await db.query(
        `UPDATE files SET content = $1, updated_at = NOW()
         WHERE id = $2 AND workspace_id = $3
         RETURNING *`,
        [content, fileId, workspaceId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete file
  router.delete('/workspaces/:workspaceId/files/:fileId', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, fileId } = req.params;

      const result = await db.query(
        'DELETE FROM files WHERE id = $1 AND workspace_id = $2 RETURNING *',
        [fileId, workspaceId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json({ message: 'File deleted' });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};

// ============================================================================
// AI ROUTES
// ============================================================================

export const createAIRoutes = (router: express.Router) => {
  // Chat with AI
  router.post('/ai/chat', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const { message, context, language } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Mock AI response
      // In production, this would call OpenAI API
      const mockResponses = [
        'I can help you optimize this code. Consider using async/await for better readability.',
        'This looks like a great implementation! The structure is clean and maintainable.',
        'I found a potential issue. Have you considered refactoring this function into smaller components?',
        'Your code follows best practices. Nice work on the error handling!',
      ];

      const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];

      res.json({
        id: uuidv4(),
        message: response,
        tokens_used: 50,
      });
    } catch (error) {
      console.error('Error processing AI request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
