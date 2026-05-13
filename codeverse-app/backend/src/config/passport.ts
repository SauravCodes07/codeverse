import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { AuthService } from '../services/auth.service';
import pool from './db';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy';
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'dummy';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'dummy';

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/v1/auth/google/callback",
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0].value;
      if (!email) return done(new Error('No email found'));

      let user = await AuthService.findUserByEmail(email);

      if (!user) {
        // Create new user for OAuth
        const username = email.split('@')[0] + Math.floor(Math.random() * 1000);
        user = await AuthService.createUser({
          email,
          username,
          fullName: profile.displayName || 'Google User',
          passwordHash: '', // No password for OAuth users
        });
        
        // Update auth provider
        await pool.query('UPDATE users SET auth_provider = $1, avatar_url = $2 WHERE id = $3', 
          ['google', profile.photos?.[0].value, user.id]);
        
        user.auth_provider = 'google';
        user.avatar_url = profile.photos?.[0].value;
      }

      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }
));

passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "/api/v1/auth/github/callback",
    scope: ['user:email']
  },
  async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      const email = profile.emails?.[0].value;
      if (!email) return done(new Error('No email found'));

      let user = await AuthService.findUserByEmail(email);

      if (!user) {
        const username = profile.username || email.split('@')[0] + Math.floor(Math.random() * 1000);
        user = await AuthService.createUser({
          email,
          username,
          fullName: profile.displayName || profile.username || 'GitHub User',
          passwordHash: '',
        });

        await pool.query('UPDATE users SET auth_provider = $1, avatar_url = $2 WHERE id = $3', 
          ['github', profile.photos?.[0].value, user.id]);

        user.auth_provider = 'github';
        user.avatar_url = profile.photos?.[0].value;
      }

      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    done(null, result.rows[0]);
  } catch (error) {
    done(error);
  }
});

export default passport;
