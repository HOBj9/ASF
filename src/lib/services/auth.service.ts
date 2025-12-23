/**
 * Authentication Service
 * Business logic for authentication
 */

import { UserService } from './user.service';
import { messages } from '@/constants/messages';

export class AuthService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  /**
   * Validate user credentials
   */
  async validateCredentials(email: string, password: string) {
    const user = await this.userService.validateCredentials(email, password);
    
    if (!user) {
      throw new Error(messages.auth.login.error);
    }

    return user;
  }

  /**
   * Register a new user
   */
  async register(data: {
    name: string;
    email: string;
    password: string;
  }) {
    // Get default user role
    const { RoleService } = await import('./role.service');
    const roleService = new RoleService();
    const defaultRole = await roleService.getByName('user');

    if (!defaultRole) {
      throw new Error('Default user role not found. Please run seed script first.');
    }

    const user = await this.userService.create({
      ...data,
      role: defaultRole._id.toString(),
      isActive: true,
    });

    return user;
  }
}

