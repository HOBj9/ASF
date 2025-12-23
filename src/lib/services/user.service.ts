/**
 * User Service
 * Business logic for user management
 */

import connectDB from '@/lib/mongodb';
import User, { IUser } from '@/models/User';
import Role from '@/models/Role';
import bcrypt from 'bcryptjs';
import { appConfig } from '@/lib/config/app.config';
import { messages } from '@/constants/messages';

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
}

export class UserService {
  /**
   * Create a new user
   */
  async create(data: CreateUserData): Promise<IUser> {
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new Error(messages.users.emailExists);
    }

    // Verify role exists
    const role = await Role.findById(data.role);
    if (!role) {
      throw new Error(messages.roles.notFound);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashedPassword,
      phone: data.phone || null,
      role: data.role,
      isActive: data.isActive ?? true,
    });

    return user;
  }

  /**
   * Get user by ID
   */
  async getById(id: string): Promise<IUser | null> {
    await connectDB();
    return User.findById(id).populate('role').lean().exec();
  }

  /**
   * Get user by email
   */
  async getByEmail(email: string): Promise<IUser | null> {
    await connectDB();
    return await User.findOne({ email: email.toLowerCase() })
      .populate({
        path: 'role',
        populate: { path: 'permissions' },
      })
      .lean();
  }

  /**
   * Get all users
   */
  async getAll(): Promise<IUser[]> {
    await connectDB();
    return User.find({}).populate('role').lean().exec();
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserData): Promise<IUser | null> {
    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      throw new Error(messages.users.notFound);
    }

    // Check email uniqueness if email is being updated
    if (data.email && data.email !== user.email) {
      const existingUser = await User.findOne({ email: data.email.toLowerCase() });
      if (existingUser) {
        throw new Error(messages.users.emailExists);
      }
    }

    // Hash password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // Verify role exists if role is being updated
    if (data.role) {
      const role = await Role.findById(data.role);
      if (!role) {
        throw new Error(messages.roles.notFound);
      }
    }

    const updateData: any = { ...data };
    if (data.email) {
      updateData.email = data.email.toLowerCase();
    }
    
    // Ensure isActive is a boolean if provided
    if (data.isActive !== undefined) {
      updateData.isActive = Boolean(data.isActive);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('role').lean();

    return updatedUser;
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    await connectDB();

    const user = await User.findByIdAndDelete(id);
    return !!user;
  }

  /**
   * Toggle user active status
   */
  async toggleActiveStatus(id: string): Promise<IUser | null> {
    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      throw new Error(messages.users.notFound);
    }

    user.isActive = !user.isActive;
    await user.save();

    return await User.findById(id).populate('role').lean();
  }

  /**
   * Validate user credentials
   * Returns user if valid, throws error if user is disabled, returns null if credentials are invalid
   */
  async validateCredentials(email: string, password: string): Promise<IUser | null> {
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() })
      .populate({
        path: 'role',
        populate: { path: 'permissions' },
      })
      .lean();

    if (!user) {
      return null;
    }

    // Check if user is active before checking password
    if (!user.isActive) {
      throw new Error('تم تعطيل حسابك. يرجى الاتصال بالمسؤول');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }
}

