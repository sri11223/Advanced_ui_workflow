import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { db } from '../config/database';
import { User } from '../types';
import { logger } from '../utils/logger';
import { cacheService } from '../utils/cache';

export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async register(email: string, password: string, fullName?: string): Promise<{ user: User; token: string }> {
    try {
      // Check if user already exists
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const userData = {
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        full_name: fullName,
        is_active: true,
        profile_completed: false,
        onboarding_step: 0,
      };

      const user = await db.create<User>('users', userData);
      if (!user) {
        throw new Error('Failed to create user');
      }

      // Generate JWT token
      const token = this.generateToken(user.id);

      // Cache user data
      await cacheService.set(`user:${user.id}`, user, 3600); // 1 hour

      logger.info(`User registered successfully: ${email}`);
      return { user, token };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      // Find user by email
      const user = await db.getUserByEmail(email.toLowerCase());
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!(user as any).is_active) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, (user as any).password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid email or password');
      }

      // Generate JWT token
      const token = this.generateToken((user as any).id);

      // Cache user data
      await cacheService.set(`user:${(user as any).id}`, user, 3600); // 1 hour

      // Remove password hash from response
      const { password_hash, ...userWithoutPassword } = user as any;

      logger.info(`User logged in successfully: ${email}`);
      return { user: userWithoutPassword as User, token };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  async getCurrentUser(userId: string): Promise<User | null> {
    try {
      // Try cache first
      const cachedUser = await cacheService.get<User>(`user:${userId}`);
      if (cachedUser) {
        return cachedUser;
      }

      // Fetch from database
      const user = await db.findById<User>('users', userId);
      if (!user) {
        return null;
      }

      // Cache user data
      await cacheService.set(`user:${userId}`, user, 3600); // 1 hour

      return user;
    } catch (error) {
      logger.error('Get current user error:', error);
      return null;
    }
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<User | null> {
    try {
      const updatedUser = await db.update<User>('users', userId, updateData);
      if (!updatedUser) {
        return null;
      }

      // Update cache
      await cacheService.set(`user:${userId}`, updatedUser, 3600);

      logger.info(`User updated successfully: ${userId}`);
      return updatedUser;
    } catch (error) {
      logger.error('Update user error:', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const user = await db.findById('users', userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, (user as any).password_hash);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await db.update('users', userId, { password_hash: hashedNewPassword });

      // Clear user cache to force refresh
      await cacheService.delete(`user:${userId}`);

      logger.info(`Password changed successfully for user: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Change password error:', error);
      throw error;
    }
  }

  async verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      // Check if user still exists and is active
      const user = await this.getCurrentUser(decoded.userId);
      if (!user || !user.is_active) {
        return null;
      }

      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      logger.error('Token verification error:', error);
      return null;
    }
  }

  private generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      config.jwt.secret as string,
      { expiresIn: '24h' }
    );
  }

  async refreshToken(oldToken: string): Promise<string | null> {
    try {
      const decoded = jwt.verify(oldToken, config.jwt.secret) as any;
      
      // Check if user still exists and is active
      const user = await this.getCurrentUser(decoded.userId);
      if (!user || !user.is_active) {
        return null;
      }

      // Generate new token
      return this.generateToken(decoded.userId);
    } catch (error) {
      logger.error('Token refresh error:', error);
      return null;
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      // Clear user cache
      await cacheService.delete(`user:${userId}`);
      logger.info(`User logged out: ${userId}`);
    } catch (error) {
      logger.error('Logout error:', error);
    }
  }

  async deactivateUser(userId: string): Promise<boolean> {
    try {
      const updatedUser = await db.update('users', userId, { is_active: false });
      if (!updatedUser) {
        return false;
      }

      // Clear user cache
      await cacheService.delete(`user:${userId}`);

      logger.info(`User deactivated: ${userId}`);
      return true;
    } catch (error) {
      logger.error('Deactivate user error:', error);
      throw error;
    }
  }
}

export const authService = AuthService.getInstance();
