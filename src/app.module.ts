import { Module } from '@nestjs/common';
import { WebhookController, REVIEW_TRIGGER, WEBHOOK_SECRET } from './webhook/webhook.controller';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { createVercelReviewTrigger } from './webhook/vercel-review-trigger';

function readWebhookSecret(): string {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('GITHUB_WEBHOOK_SECRET environment variable is required');
  }
  return secret;
}

@Module({
  controllers: [WebhookController, HealthController],
  providers: [
    HealthService,
    { provide: REVIEW_TRIGGER, useFactory: createVercelReviewTrigger },
    { provide: WEBHOOK_SECRET, useFactory: readWebhookSecret },
  ],
})
export class AppModule {}
