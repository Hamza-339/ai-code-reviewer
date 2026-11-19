import { Controller, Headers, HttpCode, HttpException, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { verifySignature } from './webhook-signature';
import { parseReviewableTarget } from './webhook-event';
import type { ReviewTrigger } from '../ports/review-trigger';

export const REVIEW_TRIGGER = Symbol('REVIEW_TRIGGER');
export const WEBHOOK_SECRET = Symbol('WEBHOOK_SECRET');

export interface WebhookRequest {
  rawBody: string;
  body: unknown;
}

@Controller('webhook')
export class WebhookController {
  constructor(
    @Inject(REVIEW_TRIGGER) private readonly reviewTrigger: ReviewTrigger,
    @Inject(WEBHOOK_SECRET) private readonly secret: string,
  ) {}

  @Post('github')
  @HttpCode(HttpStatus.OK)
  handle(
    @Req() request: WebhookRequest,
    @Headers('x-hub-signature-256') signatureHeader: string | undefined,
    @Headers('x-github-event') eventName: string | undefined,
  ): { received: true } {
    if (!verifySignature(request.rawBody, signatureHeader, this.secret)) {
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }

    const target = eventName ? parseReviewableTarget(eventName, request.body) : null;
    if (target) {
      this.reviewTrigger.trigger(target);
    }

    return { received: true };
  }
}
