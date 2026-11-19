import { createHmac } from 'crypto';
import { verifySignature } from './webhook-signature';

const SECRET = 'fixture-webhook-secret';

function signatureFor(payload: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

describe('verifySignature', () => {
  it('accepts a signature computed with the configured secret', () => {
    const payload = '{"action":"opened"}';

    expect(verifySignature(payload, signatureFor(payload, SECRET), SECRET)).toBe(true);
  });

  it('rejects a signature computed with a different secret', () => {
    const payload = '{"action":"opened"}';

    expect(verifySignature(payload, signatureFor(payload, 'wrong-secret'), SECRET)).toBe(false);
  });

  it('rejects a tampered payload whose signature no longer matches', () => {
    const payload = '{"action":"opened"}';
    const signature = signatureFor(payload, SECRET);

    expect(verifySignature('{"action":"closed"}', signature, SECRET)).toBe(false);
  });

  it('rejects a missing signature header', () => {
    const payload = '{"action":"opened"}';

    expect(verifySignature(payload, undefined, SECRET)).toBe(false);
  });

  it('rejects a signature header missing the sha256 prefix', () => {
    const payload = '{"action":"opened"}';
    const rawHex = createHmac('sha256', SECRET).update(payload).digest('hex');

    expect(verifySignature(payload, rawHex, SECRET)).toBe(false);
  });
});
