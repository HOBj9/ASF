/**
 * Survey Service
 * CRUD for surveys and submissions; submit creates org-level point.
 */

import connectDB from '@/lib/mongodb';
import Survey, { ISurveyQuestion } from '@/models/Survey';
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
  /** null/undefined = org-wide; set = branch-specific */
  branchId?: string | null;
}

export interface UpdateSurveyData {
  title?: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  questions?: ISurveyQuestion[];
  isActive?: boolean;
  branchId?: string | null;
}

export interface SubmitSurveyData {
  mapLat: number;
  mapLng: number;
  deviceLat?: number | null;
  deviceLng?: number | null;
  answers: Record<string, unknown>;
}

export interface MobileSurveyAnswerData {
  questionId?: string;
  answerKey?: string;
  value: unknown;
}

export interface SubmitMobileSurveyData {
  point: {
    name: string;
    primaryClassificationId: string;
    secondaryClassificationId: string;
    otherIdentifier: string;
    mapLat: number;
    mapLng: number;
    deviceLat?: number | null;
    deviceLng?: number | null;
  };
  answers: MobileSurveyAnswerData[];
}

export class SurveyService {
  private buildQuestionAnswerKey(index: number) {
    return `question_${index}`;
  }

  private resolveSurveyQuestionKey(
    question: any,
    index: number,
    answers: Record<string, unknown>
  ) {
    const questionId = question?._id ? String(question._id) : null;
    const answerKey = this.buildQuestionAnswerKey(index);

    if (questionId && Object.prototype.hasOwnProperty.call(answers, questionId)) {
      return questionId;
    }

    if (Object.prototype.hasOwnProperty.call(answers, answerKey)) {
      return answerKey;
    }

    return answerKey;
  }

  private ensureSurveyVisibleToBranch(survey: any, branchId?: string | null) {
    const currentBranchId = String(branchId || '').trim();
    const surveyBranchId = survey?.branchId ? String(survey.branchId) : null;

    if (!currentBranchId || !surveyBranchId) {
      return;
    }

    if (surveyBranchId !== currentBranchId) {
      const error: any = new Error('الاستبيان غير متاح لهذا الفرع');
      error.status = 403;
      throw error;
    }
  }

  private parseLocationAnswer(
    value: unknown,
    fallbackLat?: number | null,
    fallbackLng?: number | null
  ): { lat: number; lng: number; serialized: string } | null {
    if (
      typeof fallbackLat === 'number' &&
      Number.isFinite(fallbackLat) &&
      typeof fallbackLng === 'number' &&
      Number.isFinite(fallbackLng)
    ) {
      return {
        lat: fallbackLat,
        lng: fallbackLng,
        serialized: `${fallbackLat},${fallbackLng}`,
      };
    }

    if (typeof value === 'string') {
      const [latPart, lngPart] = value.split(',').map((item) => item.trim());
      const lat = Number(latPart);
      const lng = Number(lngPart);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return {
          lat,
          lng,
          serialized: `${lat},${lng}`,
        };
      }
    }

    if (value && typeof value === 'object') {
      const lat = Number((value as Record<string, unknown>).lat);
      const lng = Number((value as Record<string, unknown>).lng);

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return {
          lat,
          lng,
          serialized: `${lat},${lng}`,
        };
      }
    }

    return null;
  }

  private validateSubmissionAnswers(
    survey: any,
    answers: Record<string, unknown>,
    input: { mapLat: number; mapLng: number }
  ) {
    const questions = Array.isArray(survey?.questions) ? survey.questions : [];

    questions.forEach((question: any, index: number) => {
      const answerKey = this.resolveSurveyQuestionKey(question, index, answers);
      const value = answers[answerKey];
      const required = Boolean(question?.required);
      const label = question?.questionTextAr || question?.questionText || `#${index + 1}`;

      if (question?.type === 'current_location') {
        if (!required) return;

        const locationAnswer = this.parseLocationAnswer(value, input.mapLat, input.mapLng);
        if (!locationAnswer) {
          const error: any = new Error(`الإجابة مطلوبة للسؤال: ${label}`);
          error.status = 400;
          throw error;
        }
        return;
      }

      if (!required && (value === undefined || value === null || value === '')) {
        return;
      }

      if (required && (value === undefined || value === null || String(value).trim() === '')) {
        const error: any = new Error(`الإجابة مطلوبة للسؤال: ${label}`);
        error.status = 400;
        throw error;
      }

      if (question?.type === 'choice' && value != null) {
        const normalizedValue = String(value).trim();
        const allowedOptions = Array.isArray(question?.options) ? question.options : [];

        if (!allowedOptions.includes(normalizedValue)) {
          const error: any = new Error(`الإجابة غير صالحة للسؤال: ${label}`);
          error.status = 400;
          throw error;
        }
      }
    });
  }

  async create(organizationId: string, data: CreateSurveyData): Promise<any> {
    await connectDB();

    const org = await Organization.findById(organizationId).lean();
    if (!org) {
      throw new Error('المؤسسة غير موجودة');
    }

    const survey = await Survey.create({
      organizationId,
      branchId: data.branchId && data.branchId.trim() ? data.branchId : null,
      title: data.title.trim(),
      titleAr: data.titleAr?.trim() || null,
      description: data.description?.trim() || null,
      descriptionAr: data.descriptionAr?.trim() || null,
      questions: data.questions ?? [],
      isActive: data.isActive ?? true,
    });

    return survey;
  }

  async getById(id: string, organizationId: string): Promise<any | null> {
    await connectDB();
    return Survey.findOne({ _id: id, organizationId }).lean().exec();
  }

  async getActiveForLineSupervisor(
    surveyId: string,
    organizationId: string,
    branchId?: string | null
  ): Promise<any | null> {
    const survey = await this.getById(surveyId, organizationId);
    if (!survey || survey.isActive === false) {
      return null;
    }

    this.ensureSurveyVisibleToBranch(survey, branchId);
    return survey;
  }

  /**
   * List surveys for an organization. If branchId is provided (line supervisor / branch admin),
   * returns org-wide surveys (branchId null) + surveys for that branch only.
   * If branchId is not provided (org admin), returns all surveys for the org.
   */
  async listByOrganization(
    organizationId: string,
    activeOnly = false,
    branchId?: string | null
  ): Promise<any[]> {
    await connectDB();

    const query: Record<string, unknown> = { organizationId };
    if (activeOnly) query.isActive = true;
    if (branchId != null && String(branchId).trim() !== '') {
      query.$or = [{ branchId: null }, { branchId }];
    }

    return Survey.find(query).sort({ updatedAt: -1 }).lean().exec();
  }

  async update(id: string, organizationId: string, data: UpdateSurveyData): Promise<any | null> {
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
    if (data.branchId !== undefined) {
      updateData.branchId = data.branchId && String(data.branchId).trim() ? data.branchId : null;
    }

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
   * branchId: set when user has branchId (line supervisor / branch admin) for filtering responses by branch.
   */
  async submit(
    surveyId: string,
    userId: string,
    organizationId: string,
    data: SubmitSurveyData,
    branchId?: string | null
  ): Promise<{ submission: any; point: any }> {
    await connectDB();

    const survey = await Survey.findOne({ _id: surveyId, organizationId }).lean();
    if (!survey) {
      throw new Error('الاستبيان غير موجود');
    }
    if (!survey.isActive) {
      throw new Error('الاستبيان غير نشط');
    }

    this.ensureSurveyVisibleToBranch(survey, branchId);

    const org = await Organization.findById(organizationId).lean();
    if (!org) {
      throw new Error('المؤسسة غير موجودة');
    }

    const answers =
      data.answers && typeof data.answers === 'object'
        ? (data.answers as Record<string, unknown>)
        : {};

    this.validateSubmissionAnswers(survey, answers, {
      mapLat: data.mapLat,
      mapLng: data.mapLng,
    });

    const nameFromAnswers =
      String(answers.pointName ?? answers.name ?? answers.question_0 ?? '').trim() || '';
    const pointName =
      nameFromAnswers || `نقطة من مسح - ${new Date().toLocaleDateString('ar-SY')}`;

    const point = await pointService.createAtOrganization(organizationId, {
      name: pointName,
      lat: data.mapLat,
      lng: data.mapLng,
      type: 'container',
      radiusMeters: 500,
      isActive: true,
      createdByUserId: userId,
      primaryClassificationId:
        typeof answers.primaryClassificationId === 'string'
          ? answers.primaryClassificationId
          : null,
      secondaryClassificationId:
        typeof answers.secondaryClassificationId === 'string'
          ? answers.secondaryClassificationId
          : null,
      otherIdentifier:
        typeof answers.otherIdentifier === 'string' ? answers.otherIdentifier : null,
    });

    const submission = await SurveySubmission.create({
      surveyId,
      userId,
      organizationId,
      branchId: branchId && String(branchId).trim() ? branchId : null,
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

  async submitFromMobile(
    surveyId: string,
    userId: string,
    organizationId: string,
    data: SubmitMobileSurveyData,
    branchId?: string | null
  ) {
    const survey = await this.getActiveForLineSupervisor(surveyId, organizationId, branchId);
    if (!survey) {
      const error: any = new Error('الاستبيان غير موجود أو غير نشط');
      error.status = 404;
      throw error;
    }

    const point = data?.point || ({} as SubmitMobileSurveyData['point']);
    const mapLat = Number(point.mapLat);
    const mapLng = Number(point.mapLng);
    const deviceLat =
      point.deviceLat != null && Number.isFinite(Number(point.deviceLat))
        ? Number(point.deviceLat)
        : null;
    const deviceLng =
      point.deviceLng != null && Number.isFinite(Number(point.deviceLng))
        ? Number(point.deviceLng)
        : null;

    if (!Number.isFinite(mapLat) || !Number.isFinite(mapLng)) {
      const error: any = new Error('إحداثيات موقع النقطة مطلوبة');
      error.status = 400;
      throw error;
    }

    const pointName = String(point.name || '').trim();
    const primaryClassificationId = String(point.primaryClassificationId || '').trim();
    const secondaryClassificationId = String(point.secondaryClassificationId || '').trim();
    const otherIdentifier = String(point.otherIdentifier || '').trim();

    if (!pointName || !primaryClassificationId || !secondaryClassificationId || !otherIdentifier) {
      const error: any = new Error(
        'اسم النقطة والتصنيفات والرقم التعريفي الآخر مطلوبة'
      );
      error.status = 400;
      throw error;
    }

    const normalizedAnswers: Record<string, unknown> = {
      pointName,
      primaryClassificationId,
      secondaryClassificationId,
      otherIdentifier,
    };

    const mobileAnswers = Array.isArray(data?.answers) ? data.answers : [];
    const questions = Array.isArray(survey.questions) ? survey.questions : [];

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      const questionId = question?._id ? String(question._id) : null;
      const answerKey = this.buildQuestionAnswerKey(index);
      const answerItem = mobileAnswers.find((item) => {
        if (!item || typeof item !== 'object') return false;
        if (questionId && item.questionId && String(item.questionId) === questionId) return true;
        return item.answerKey === answerKey;
      });

      if (!answerItem) continue;

      if (question?.type === 'current_location') {
        const parsedLocation = this.parseLocationAnswer(answerItem.value, mapLat, mapLng);
        if (parsedLocation) {
          normalizedAnswers[answerKey] = parsedLocation.serialized;
          normalizedAnswers[`${answerKey}_lat`] = parsedLocation.lat;
          normalizedAnswers[`${answerKey}_lng`] = parsedLocation.lng;
        }
        continue;
      }

      normalizedAnswers[answerKey] = answerItem.value;
    }

    return this.submit(
      surveyId,
      userId,
      organizationId,
      {
        mapLat,
        mapLng,
        deviceLat,
        deviceLng,
        answers: normalizedAnswers,
      },
      branchId
    );
  }

  /**
   * Create or get org-level point from a survey submission.
   * If submission already has pointId, returns that point; otherwise creates point from submission data and links it.
   */
  async ensurePointFromSubmission(
    submissionId: string,
    organizationId: string
  ): Promise<{ point: any; created: boolean }> {
    await connectDB();

    const submission = await SurveySubmission.findOne({
      _id: submissionId,
      organizationId,
    })
      .lean()
      .exec();
    if (!submission) {
      throw new Error('الرد غير موجود');
    }

    if (submission.pointId) {
      const point = await pointService.getOrgPointById(
        String(submission.pointId),
        organizationId
      );
      if (point) {
        return { point, created: false };
      }
    }

    const answers =
      submission.answers && typeof submission.answers === 'object'
        ? (submission.answers as Record<string, unknown>)
        : {};
    const nameFromAnswers =
      String(answers.pointName ?? answers.name ?? answers.question_0 ?? '').trim() || '';
    const pointName =
      nameFromAnswers ||
      `نقطة من مسح - ${new Date(submission.createdAt).toLocaleDateString('ar-SY')}`;

    const point = await pointService.createAtOrganization(organizationId, {
      name: pointName,
      lat: submission.mapLat,
      lng: submission.mapLng,
      type: 'container',
      radiusMeters: 500,
      isActive: true,
      createdByUserId: submission.userId ? String(submission.userId) : null,
      primaryClassificationId:
        typeof answers.primaryClassificationId === 'string'
          ? answers.primaryClassificationId
          : null,
      secondaryClassificationId:
        typeof answers.secondaryClassificationId === 'string'
          ? answers.secondaryClassificationId
          : null,
      otherIdentifier:
        typeof answers.otherIdentifier === 'string' ? answers.otherIdentifier : null,
    });

    await SurveySubmission.findByIdAndUpdate(submissionId, {
      pointId: point._id,
    });

    return {
      point: point.toObject ? point.toObject() : point,
      created: true,
    };
  }

  /**
   * List submissions for a survey. If branchId is provided, filter to that branch only.
   */
  async listSubmissions(
    surveyId: string,
    organizationId: string,
    branchId?: string | null
  ): Promise<any[]> {
    await connectDB();

    const query: Record<string, unknown> = { surveyId, organizationId };
    if (branchId != null && String(branchId).trim() !== '') {
      query.branchId = branchId;
    }

    return SurveySubmission.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .lean()
      .exec();
  }

  /**
   * List all submissions for an organization (e.g. survey-submissions page). If branchId provided, filter by branch.
   */
  async listSubmissionsByOrganization(
    organizationId: string,
    branchId?: string | null
  ): Promise<any[]> {
    await connectDB();

    const query: Record<string, unknown> = { organizationId };
    if (branchId != null && String(branchId).trim() !== '') {
      query.branchId = branchId;
    }

    return SurveySubmission.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .populate('surveyId', 'title titleAr')
      .lean()
      .exec();
  }
}
