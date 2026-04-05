import connectDB from '@/lib/mongodb';
import Branch from '@/models/Branch';
import TrackingProviderConfig from '@/models/TrackingProviderConfig';

type AtharProviderResolvedConfig = {
  isEnabled: boolean;
  apiKey: string;
  baseUrl: string;
  api: string;
  version: string;
  legacyFallback: boolean;
};

export async function getTrackingProviderConfig(branchId: string, provider: string) {
  await connectDB();
  return TrackingProviderConfig.findOne({ branchId, provider }).lean();
}

export async function resolveAtharProviderConfig(
  branchId: string
): Promise<AtharProviderResolvedConfig | null> {
  await connectDB();

  const [branch, providerConfig] = await Promise.all([
    Branch.findById(branchId).select('atharKey').lean(),
    TrackingProviderConfig.findOne({ branchId, provider: 'athar' }).lean(),
  ]);

  const config = (providerConfig?.config || {}) as Record<string, any>;
  const legacyFallback = providerConfig?.legacyFallback !== false;
  const apiKey =
    (typeof config.apiKey === 'string' && config.apiKey.trim()) ||
    (legacyFallback ? branch?.atharKey?.trim() : '') ||
    process.env.ATHAR_API_KEY ||
    process.env.ATHAR_API_KEY1 ||
    '';

  const isEnabled = providerConfig
    ? providerConfig.isEnabled !== false && Boolean(apiKey)
    : Boolean(apiKey);

  if (!isEnabled || !apiKey) {
    return null;
  }

  return {
    isEnabled,
    apiKey,
    baseUrl:
      (typeof config.baseUrl === 'string' && config.baseUrl.trim()) ||
      process.env.ATHAR_BASE_URL ||
      'https://admin.alather.net/api/api.php',
    api:
      (typeof config.api === 'string' && config.api.trim()) ||
      process.env.ATHAR_API ||
      process.env.ATHAR_API_TYPE ||
      'user',
    version:
      (typeof config.version === 'string' && config.version.trim()) ||
      process.env.ATHAR_VERSION ||
      '1.0',
    legacyFallback,
  };
}

export async function isAtharProviderEnabledForBranch(branchId: string): Promise<boolean> {
  const config = await resolveAtharProviderConfig(branchId);
  return Boolean(config?.isEnabled);
}
