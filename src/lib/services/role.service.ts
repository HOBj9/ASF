/**
 * Role Service
 * Business logic for role management
 */

import connectDB from '@/lib/mongodb';
import Role, { IRole } from '@/models/Role';
import Permission from '@/models/Permission';
import User from '@/models/User';
import { messages } from '@/constants/messages';

export interface CreateRoleData {
  name: string;
  nameAr: string;
  permissions?: string[];
}

export interface UpdateRoleData {
  name?: string;
  nameAr?: string;
  permissions?: string[];
}

export class RoleService {
  /**
   * Create a new role
   */
  async create(data: CreateRoleData): Promise<IRole> {
    await connectDB();

    // Check if role already exists
    const existingRole = await Role.findOne({ name: data.name });
    if (existingRole) {
      throw new Error(messages.roles.exists);
    }

    // Validate permissions if provided
    if (data.permissions && data.permissions.length > 0) {
      const validPermissions = await Permission.find({
        _id: { $in: data.permissions },
      });
      if (validPermissions.length !== data.permissions.length) {
        throw new Error(messages.permissions.notFound);
      }
    }

    const role = await Role.create({
      name: data.name,
      nameAr: data.nameAr,
      permissions: data.permissions || [],
    });

    return role;
  }

  /**
   * Get role by ID
   */
  async getById(id: string): Promise<IRole | null> {
    await connectDB();
    return Role.findById(id).populate('permissions').lean().exec();
  }

  /**
   * Get role by name
   */
  async getByName(name: string): Promise<IRole | null> {
    await connectDB();
    return Role.findOne({ name }).populate('permissions').lean().exec();
  }

  /**
   * Get all roles
   */
  async getAll(): Promise<IRole[]> {
    await connectDB();
    return Role.find({}).populate('permissions').lean().exec();
  }

  /**
   * Update role
   */
  async update(id: string, data: UpdateRoleData): Promise<IRole | null> {
    await connectDB();

    const role = await Role.findById(id);
    if (!role) {
      throw new Error(messages.roles.notFound);
    }

    // Check name uniqueness if name is being updated
    if (data.name && data.name !== role.name) {
      const existingRole = await Role.findOne({ name: data.name });
      if (existingRole) {
        throw new Error(messages.roles.exists);
      }
    }

    // Validate permissions if provided
    if (data.permissions !== undefined) {
      if (data.permissions.length > 0) {
        const validPermissions = await Permission.find({
          _id: { $in: data.permissions },
        });
        if (validPermissions.length !== data.permissions.length) {
          throw new Error(messages.permissions.notFound);
        }
      }
    }

    const updatedRole = await Role.findByIdAndUpdate(
      id,
      data,
      { new: true }
    ).populate('permissions');

    return updatedRole;
  }

  /**
   * Delete role
   */
  async delete(id: string): Promise<boolean> {
    await connectDB();

    // Check if role is being used by any user
    const usersWithRole = await User.countDocuments({ role: id });
    if (usersWithRole > 0) {
      throw new Error(
        messages.roles.inUse.replace('{count}', usersWithRole.toString())
      );
    }

    const role = await Role.findByIdAndDelete(id);
    return !!role;
  }
}

