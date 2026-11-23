import type { Fixture } from './types';

function diffFor(path: string, startLine: number, lines: string[]): string {
  return [
    `diff --git a/${path} b/${path}`,
    'index 0000000..1111111 100644',
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -${startLine},${lines.length} +${startLine},${lines.length} @@`,
    ...lines,
    '',
  ].join('\n');
}

export const fixtures: Fixture[] = [
  {
    name: 'bug-off-by-one-loop-bound',
    diff: diffFor('src/utils/array-utils.ts', 1, [
      ' export function lastIndex(items: unknown[]): number {',
      '-  return items.length - 1;',
      '+  for (let i = 0; i <= items.length; i++) {',
      '+    if (items[i] === undefined) {',
      '+      return i - 1;',
      '+    }',
      '+  }',
      '+  return -1;',
      ' }',
    ]),
    seededBugs: [{ path: 'src/utils/array-utils.ts', line: 2, category: 'bug' }],
  },
  {
    name: 'bug-null-deref-on-optional-profile',
    diff: diffFor('src/user/profile.ts', 1, [
      " export function getDisplayName(user: { profile?: { name: string } }): string {",
      "-  return user.profile ? user.profile.name : 'Unknown';",
      '+  const profile = user.profile;',
      '+  return profile.name;',
      ' }',
    ]),
    seededBugs: [{ path: 'src/user/profile.ts', line: 3, category: 'bug' }],
  },
  {
    name: 'bug-assignment-instead-of-comparison',
    diff: diffFor('src/auth/session.ts', 1, [
      ' export function isExpired(session: { expiresAt: number }, now: number): boolean {',
      '-  return now >= session.expiresAt;',
      '+  let expired = false;',
      '+  if (session.expiresAt = now) {',
      '+    expired = true;',
      '+  }',
      '+  return expired;',
      ' }',
    ]),
    seededBugs: [{ path: 'src/auth/session.ts', line: 3, category: 'bug' }],
  },
  {
    // Diff spans two files so a model that can't tell which path a hunk belongs
    // to (regression test for the "File: <path>" prompt prefix) would attribute
    // the finding to the wrong file, or to the line's own text, and get dropped
    // by the line validator — see ADR for the path-in-prompt fix.
    name: 'security-sql-injection-via-string-interpolation',
    diff: [
      diffFor('src/db/users-repo.ts', 1, [
        ' export function findUserByEmail(db: Database, email: string) {',
        "-  return db.query('SELECT * FROM users WHERE email = ?', [email]);",
        "+  const query = `SELECT * FROM users WHERE email = '${email}'`;",
        '+  return db.query(query);',
        ' }',
      ]),
      diffFor('src/notifications/email-template.ts', 1, [
        ' export function renderWelcomeEmail(name: string): string {',
        "-  return `Hello ${name}`;",
        "+  return `Hello, ${name}!`;",
        ' }',
      ]),
    ].join('\n'),
    seededBugs: [{ path: 'src/db/users-repo.ts', line: 2, category: 'security' }],
  },
  {
    name: 'security-hardcoded-api-key',
    diff: diffFor('src/config/stripe-client.ts', 1, [
      " import Stripe from 'stripe';",
      ' ',
      '-export function createStripeClient(apiKey: string): Stripe {',
      '-  return new Stripe(apiKey);',
      '+export function createStripeClient(): Stripe {',
      "+  return new Stripe('sk_live_FIXTURE_DO_NOT_USE_REPLACE_ME');",
      ' }',
    ]),
    seededBugs: [{ path: 'src/config/stripe-client.ts', line: 4, category: 'security' }],
  },
  {
    name: 'security-path-traversal-in-file-load',
    diff: diffFor('src/files/avatar-loader.ts', 1, [
      " import fs from 'fs/promises';",
      ' ',
      '-export function loadAvatar(userId: string) {',
      '-  return fs.readFile(`avatars/${userId}.png`);',
      '+export function loadAvatar(fileName: string) {',
      '+  return fs.readFile(`avatars/${fileName}`);',
      ' }',
    ]),
    seededBugs: [{ path: 'src/files/avatar-loader.ts', line: 4, category: 'security' }],
  },
  {
    name: 'missing-test-new-exported-discount-fn',
    diff: diffFor('src/pricing/discount.ts', 1, [
      ' export function applyTax(amount: number, rate: number): number {',
      '   return amount * (1 + rate);',
      ' }',
      '+',
      '+export function applyDiscount(amount: number, percentOff: number): number {',
      '+  return amount * (1 - percentOff / 100);',
      '+}',
    ]),
    seededBugs: [{ path: 'src/pricing/discount.ts', line: 5, category: 'missing-test' }],
  },
  {
    name: 'missing-test-new-shipping-branch',
    diff: diffFor('src/orders/shipping.ts', 1, [
      ' export function shippingCost(weightKg: number, express: boolean): number {',
      '-  return express ? weightKg * 3 : weightKg * 1.5;',
      '+  if (express) {',
      '+    return weightKg * 3;',
      '+  }',
      '+  if (weightKg > 20) {',
      '+    return weightKg * 1.2;',
      '+  }',
      '+  return weightKg * 1.5;',
      ' }',
    ]),
    seededBugs: [{ path: 'src/orders/shipping.ts', line: 5, category: 'missing-test' }],
  },
  {
    name: 'missing-test-new-disposable-email-validator',
    diff: diffFor('src/validation/email.ts', 1, [
      ' export function isValidEmail(value: string): boolean {',
      "-  return value.includes('@');",
      '+  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value);',
      ' }',
      '+',
      '+export function isDisposableEmail(value: string): boolean {',
      "+  return value.endsWith('@mailinator.com');",
      '+}',
    ]),
    seededBugs: [{ path: 'src/validation/email.ts', line: 5, category: 'missing-test' }],
  },
  {
    name: 'decoy-slugify-refactor',
    diff: diffFor('src/strings/slugify.ts', 1, [
      '-export function slugify(input: string): string {',
      "-  return input.trim().toLowerCase().replace(/\\s+/g, '-');",
      '-}',
      '+export function slugify(input: string): string {',
      '+  const trimmed = input.trim().toLowerCase();',
      "+  return trimmed.replace(/\\s+/g, '-');",
      '+}',
    ]),
    seededBugs: [],
  },
  {
    name: 'decoy-order-status-type-narrowing',
    diff: diffFor('src/domain/order-status.ts', 1, [
      '-export function isTerminal(status: string): boolean {',
      "-  return status === 'delivered' || status === 'cancelled';",
      '-}',
      '+/** Whether an order status is terminal and will not transition further. */',
      "+export function isTerminal(status: 'pending' | 'shipped' | 'delivered' | 'cancelled'): boolean {",
      "+  return status === 'delivered' || status === 'cancelled';",
      '+}',
    ]),
    seededBugs: [],
  },
  {
    name: 'decoy-bounded-latency-histogram',
    diff: diffFor('src/metrics/counter.ts', 1, [
      ' export function recordLatency(histogram: number[], ms: number): void {',
      '   histogram.push(ms);',
      '+  if (histogram.length > 1000) {',
      '+    histogram.shift();',
      '+  }',
      ' }',
    ]),
    seededBugs: [],
  },
];
