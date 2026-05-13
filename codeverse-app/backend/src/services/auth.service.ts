import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db';
import redis from '../config/redis';
import config from '../config/env';

const JWT_SECRET = config.jwtSecret;
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  static async comparePasswords(password: string, hash: string): Promise<boolean> {
    if (!hash) return false;
    return bcrypt.compare(password, hash);
  }

  static generateToken(payload: { id: string; email: string; username: string }): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static generateRefreshToken(payload: { id: string }): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
  }

  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  static async findUserByEmail(email: string) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  }

  static async findUserByUsername(username: string) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  }

  static async createUser(userData: {
    email: string;
    username: string;
    fullName: string;
    passwordHash: string;
  }) {
    const { email, username, fullName, passwordHash } = userData;
    const result = await pool.query(
      `INSERT INTO users (email, username, full_name, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, full_name, avatar_url, created_at`,
      [email, username, fullName, passwordHash]
    );
    return result.rows[0];
  }

  static async updateLastLogin(userId: string) {
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [userId]);
  }

  // OTP & Password Reset
  static async generateOTP(email: string): Promise<string> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(`otp:${email}`, otp, 'EX', 600); // 10 minutes
    return otp;
  }

  static async verifyOTP(email: string, otp: string): Promise<boolean> {
    const storedOTP = await redis.get(`otp:${email}`);
    if (storedOTP === otp) {
      await redis.del(`otp:${email}`);
      return true;
    }
    return false;
  }

  static async updatePassword(userId: string, passwordHash: string) {
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
  }
}

