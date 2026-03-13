import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import UserApiKey from '@/models/UserApiKey';
import User from '@/models/User';

function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function buildApiKey(): string {
  return `athar_${crypto.randomBytes(24).toString('hex')}`;
}

export class ApiKeyService {
  async getByUserId(userId: string) {
    await connectDB();
    return UserApiKey.findOne({ userId }).lean();
  }

  async getMetadata(userId: string) {
    const existing = await this.getByUserId(userId);
    if (!existing) {
      return {
        exists: false,
        createdAt: null,
        lastUsedAt: null,
        prefix: null,
      };
    }

    return {
      exists: existing.isActive !== false,
      createdAt: existing.createdAt ?? null,
      lastUsedAt: existing.lastUsedAt ?? null,
      prefix: existing.prefix ?? null,
    };
  }

  async createOrRotate(userId: string) {
    await connectDB();
    const rawKey = buildApiKey();
    const keyHash = hashKey(rawKey);
    const prefix = rawKey.slice(0, 12);

    await UserApiKey.findOneAndUpdate(
      { userId },
      {
        $set: {
          keyHash,
          prefix,
          isActive: true,
          lastUsedAt: null,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    return { apiKey: rawKey, prefix };
  }

  async deleteByUserId(userId: string) {
    await connectDB();
    await UserApiKey.deleteOne({ userId });
  }

  async updateLastUsed(userId: string) {
    await connectDB();
    await UserApiKey.updateOne({ userId }, { $set: { lastUsedAt: new Date() } });
  }

  async getUserFromApiKey(rawKey: string) {
    await connectDB();
    const keyHash = hashKey(rawKey);
    const userApiKey = await UserApiKey.findOne({ keyHash, isActive: true }).lean();
    if (!userApiKey) return null;

    const user = await User.findById(userApiKey.userId).select('-password').lean();
    if (!user || (user as any).isActive === false) {
      return null;
    }

    return {
      user,
      userApiKey,
    };
  }
}
