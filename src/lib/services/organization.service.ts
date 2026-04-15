/**
 * Organization Service
 * Business logic for organization management
 */

import connectDB from '@/lib/mongodb';
import Organization, { IOrganization } from '@/models/Organization';

export interface CreateOrganizationData {
  name: string;
  slug: string;
  type?: string;
  labels?: {
    branchLabel?: string;
    pointLabel?: string;
    vehicleLabel?: string;
    driverLabel?: string;
    routeLabel?: string;
    lineSupervisorLabel?: string;
    surveyLabel?: string;
    eventsReportLabel?: string;
    latestEventsLabel?: string;
  };
  isActive?: boolean;
}

export interface UpdateOrganizationData {
  name?: string;
  slug?: string;
  type?: string | null;
  labels?: {
    branchLabel?: string;
    pointLabel?: string;
    vehicleLabel?: string;
    driverLabel?: string;
    routeLabel?: string;
    lineSupervisorLabel?: string;
    surveyLabel?: string;
    eventsReportLabel?: string;
    latestEventsLabel?: string;
  };
  isActive?: boolean;
}

export class OrganizationService {
  async create(data: CreateOrganizationData): Promise<any> {
    await connectDB();
    const organization = await Organization.create({
      name: data.name,
      slug: data.slug,
      type: data.type || null,
      labels: {
        branchLabel: data.labels?.branchLabel || 'فرع',
        pointLabel: data.labels?.pointLabel || 'نقاط',
        vehicleLabel: data.labels?.vehicleLabel || 'مركبات',
        driverLabel: data.labels?.driverLabel || 'سائقين',
        routeLabel: data.labels?.routeLabel || 'مسارات',
      },
      isActive: data.isActive ?? true,
    });

    return organization;
  }

  async getAll(): Promise<any[]> {
    await connectDB();
    return Organization.find({}).lean().exec();
  }

  async getById(id: string): Promise<any | null> {
    await connectDB();
    return Organization.findById(id).lean().exec();
  }

  async update(id: string, data: UpdateOrganizationData): Promise<any | null> {
    await connectDB();
    const updateData: any = { ...data };

    if (data.slug !== undefined) updateData.slug = data.slug.toLowerCase();
    if (data.labels) {
      updateData.labels = {
        branchLabel: data.labels.branchLabel || undefined,
        pointLabel: data.labels.pointLabel || undefined,
        vehicleLabel: data.labels.vehicleLabel || undefined,
        driverLabel: data.labels.driverLabel || undefined,
        routeLabel: data.labels.routeLabel || undefined,
        lineSupervisorLabel: data.labels.lineSupervisorLabel || undefined,
        surveyLabel: data.labels.surveyLabel || undefined,
        eventsReportLabel: data.labels.eventsReportLabel || undefined,
        latestEventsLabel: data.labels.latestEventsLabel || undefined,
      };
    }

    return Organization.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    await connectDB();
    const doc = await Organization.findByIdAndDelete(id);
    return !!doc;
  }
}

