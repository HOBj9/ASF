/**
 * Survey Service
 * CRUD for surveys and submissions; submit creates org-level point.
 */

import connectDB from '@/lib/mongodb';
import Survey, { ISurvey, ISurveyQuestion } from '@/models/Survey';
import SurveySubmission from '@/models/SurveySubmission';
import Organization from '@/models/Organization';
import { PointService } from '@/lib/services/point.service';

const pointService = new PointService();

export interface CreateSurveyData {
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  questions?: ISurveyQuestion[];
  isActive?: boolean;
}

export interface UpdateSurveyData {
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  questions?: ISurveyQuestion[];
  isActive?: boolean;
}

export interface SubmitSurveyData {
  mapLat: number;
  mapLng: number;
  deviceLat?: number | null;
  deviceLng?: number | null;
  answers: Record<string, unknown>;
}

export class SurveyService {
  async create(organizationId: string, data: CreateSurveyData): Promise<ISurvey> {
    await connectDB();

    const org = await Organization.findById(organizationId).lean();
    if (!org) {
      throw new Error('المؤسسة غير موجودة');
    }

    const survey = await Survey.create({
      organizationId,
      title: data.title.trim(),
      titleAr: data.titleAr?.trim() || null,
      description: data.description?.trim() || null,
      descriptionAr: data.descriptionAr?.trim() || null,
      questions: data.questions ?? [],
      isActive: data.isActive ?? true,
    });

    return survey;
  }

  async getById(id: string, organizationId: string): Promise<ISurvey | null> {
    await connectDB();
    return Survey.findOne({ _id: id, organizationId }).lean().exec();
  }

  async listByOrganization(organizationId: string, activeOnly = false): Promise<ISurvey[]> {
    await connectDB();
    const query: Record<string, unknown> = { organizationId };
    if (activeOnly) query.isActive = true;
    return Survey.find(query).sort({ updatedAt: -1 }).lean().exec();
  }

  async update(id: string, organizationId: string, data: UpdateSurveyData): Promise<ISurvey | null> {
    await connectDB();

    const survey = await Survey.findOne({ _id: id, organizationId });
    if (!survey) return null;

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.titleAr !== undefined) updateData.titleAr = data.titleAr?.trim() || null;
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.descriptionAr !== undefined) updateData.descriptionAr = data.descriptionAr?.trim() || null;
    if (data.questions !== undefined) updateData.questions = data.questions;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await Survey.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .lean()
      .exec();

    return updated;
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    await connectDB();
    const deleted = await Survey.findOneAndDelete({ _id: id, organizationId }).exec();
    return !!deleted;
  }

  /**
   * Submit survey response: create submission record and one org-level point.
   */
  async submit(
    surveyId: string,
    userId: string,
    organizationId: string,
    data: SubmitSurveyData
  ): Promise<{ submission: any; point: any }> {
    await connectDB();

    const survey = await Survey.findOne({ _id: surveyId, organizationId }).lean();
    if (!survey) {
      throw new Error('الاستبيان غير موجود');
    }
    if (!survey.isActive) {
      throw new Error('الاستبيان غير نشط');
    }

    const org = await Organization.findById(organizationId).lean();
    if (!org) {
      throw new Error('المؤسسة غير موجودة');
    }

    const nameFromAnswers =
      (data.answers && typeof data.answers === 'object' && String((data.answers as any).name ?? (data.answers as any).question_0 ?? '').trim()) ||
      '';
    const pointName =
      nameFromAnswers ||
      `نقطة من مسح – ${new Date().toLocaleDateString('ar-SY')}`;

    const point = await pointService.createAtOrganization(organizationId, {
      name: pointName,
      lat: data.mapLat,
      lng: data.mapLng,
      type: 'container',
      radiusMeters: 500,
      isActive: true,
      createdByUserId: userId,
    });

    const submission = await SurveySubmission.create({
      surveyId,
      userId,
      organizationId,
      mapLat: data.mapLat,
      mapLng: data.mapLng,
      deviceLat: data.deviceLat ?? null,
      deviceLng: data.deviceLng ?? null,
      answers: data.answers ?? {},
      pointId: point._id,
    });

    return {
      submission: submission.toObject ? submission.toObject() : submission,
      point: point.toObject ? point.toObject() : point,
    };
  }

  async listSubmissions(surveyId: string, organizationId: string): Promise<any[]> {
    await connectDB();
    return SurveySubmission.find({ surveyId, organizationId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .lean()
      .exec();
  }
}
