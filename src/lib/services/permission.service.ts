/**
 * Permission Service
 * Business logic for permission management
 */

import connectDB from '@/lib/mongodb';
import Permission, { IPermission } from '@/models/Permission';
import Role from '@/models/Role';
import { messages } from '@/constants/messages';

export interface CreatePermissionData {
  name: string;
  nameAr: string;
  resource: string;
  action: string;
}

export interface UpdatePermissionData {
  name?: string;
  nameAr?: string;
  resource?: string;
  action?: string;
}

export class PermissionService {
  /**
   * Create a new permission
   */
  async create(data: CreatePermissionData): Promise<any> {
    await connectDB();

    // Check if permission already exists
    const existingPermission = await Permission.findOne({ name: data.name });
    if (existingPermission) {
      throw new Error(messages.permissions.exists);
    }

    // Check resource + action uniqueness
    const existingByResource = await Permission.findOne({
      resource: data.resource,
      action: data.action,
    });
    if (existingByResource) {
      throw new Error(messages.permissions.exists);
    }

    const permission = await Permission.create(data);
    return permission;
  }

  /**
   * Get permission by ID
   */
  async getById(id: string): Promise<any | null> {
    await connectDB();
    return Permission.findById(id).lean().exec();
  }

  /**
   * Get permission by name
   */
  async getByName(name: string): Promise<any | null> {
    await connectDB();
    return Permission.findOne({ name }).lean().exec();
  }

  /**
   * Get all permissions
   */
  async getAll(): Promise<any[]> {
    await connectDB();
    return Permission.find({}).lean().exec();
  }

  /**
   * Get permissions by resource
   */
  async getByResource(resource: string): Promise<any[]> {
    await connectDB();
    return Permission.find({ resource }).lean().exec();
  }

  /**
   * Update permission
   */
  async update(id: string, data: UpdatePermissionData): Promise<any | null> {
    await connectDB();

    const permission = await Permission.findById(id);
    if (!permission) {
      throw new Error(messages.permissions.notFound);
    }

    // Check name uniqueness if name is being updated
    if (data.name && data.name !== permission.name) {
      const existingPermission = await Permission.findOne({ name: data.name });
      if (existingPermission) {
        throw new Error(messages.permissions.exists);
      }
    }

    // Check resource + action uniqueness if being updated
    if (data.resource || data.action) {
      const resource = data.resource || permission.resource;
      const action = data.action || permission.action;
      const existingByResource = await Permission.findOne({
        resource,
        action,
        _id: { $ne: id },
      });
      if (existingByResource) {
        throw new Error(messages.permissions.exists);
      }
    }

    const updatedPermission = await Permission.findByIdAndUpdate(
      id,
      data,
      { new: true }
    );

    return updatedPermission;
  }

  /**
   * Delete permission
   */
  async delete(id: string): Promise<boolean> {
    await connectDB();

    // Check if permission is being used by any role
    const rolesWithPermission = await Role.countDocuments({
      permissions: id,
    });
    if (rolesWithPermission > 0) {
      throw new Error(
        messages.permissions.inUse.replace('{count}', rolesWithPermission.toString())
      );
    }

    const permission = await Permission.findByIdAndDelete(id);
    return !!permission;
  }
}

