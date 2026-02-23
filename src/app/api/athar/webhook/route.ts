import { handleAtharWebhookRequest } from '@/lib/services/athar-webhook.service';

export async function GET(request: Request) {
  return handleAtharWebhookRequest(request, 'GET');
}

export async function POST(request: Request) {
  return handleAtharWebhookRequest(request, 'POST');
}
