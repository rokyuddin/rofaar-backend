import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SmsService } from './sms.js';

vi.mock('@/config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test_secret_key_that_is_at_least_32_chars_long',
    JWT_EXPIRES_IN: '7d',
    ENABLE_SWAGGER: 'true',
    API_HOST: 'localhost:3000',
    SMS_CLIENT_ID: 'client_01KTC',
    SMS_API_KEY: 'mY3sRbC5XTEuL1veXo0N',
    SMS_SENDER_ID: 'MyBrand',
  },
}));

const mockFetch = vi.fn();
vi.mock('node-fetch', () => ({
  default: (...args: unknown[]) => mockFetch(...args),
}));

describe('SmsService', () => {
  let smsService: SmsService;

  beforeEach(() => {
    vi.clearAllMocks();
    smsService = new SmsService();
  });

  describe('sendSms', () => {
    it('sends SMS successfully when configured', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response_code: 200, message: 'SMS sent successfully' }),
      });

      const result = await smsService.sendSms('+1234567890', 'Hello, world!');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0] as [string, { body: string }];
      expect(url).toBe('https://api.smsgateway.com.bd/api/send-message');
      const body = JSON.parse(opts.body);
      expect(body).toEqual({
        client_id: 'client_01KTC',
        key: 'mY3sRbC5XTEuL1veXo0N',
        recipient: '+1234567890',
        message: 'Hello, world!',
        sender_id: 'MyBrand',
      });
      expect(result).toEqual({ response_code: 200, message: 'SMS sent successfully' });
    });

    it('sends SMS with custom sender ID', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response_code: 200, message: 'SMS sent successfully' }),
      });

      await smsService.sendSms('+1234567890', 'Hello', 'BrandX');

      const [, opts] = mockFetch.mock.calls[0] as [string, { body: string }];
      const body = JSON.parse(opts.body);
      expect(body.sender_id).toBe('BrandX');
    });

    it('uses smart resend endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response_code: 200, message: 'Resent' }),
      });

      await smsService.sendSms('+1234567890', 'Hello', undefined, true);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.smsgateway.com.bd/api/resend-message',
        expect.any(Object)
      );
    });

    it('throws error on HTTP failure', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await expect(smsService.sendSms('+1234567890', 'Hello')).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('getBalance', () => {
    it('gets balance successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ response_code: 200, balance: 100.0, status: 'Active' }),
      });

      const result = await smsService.getBalance();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.smsgateway.com.bd/api/get-balance',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: 'client_01KTC' }),
        }
      );
      expect(result).toEqual({ response_code: 200, balance: 100.0, status: 'Active' });
    });

    it('throws error on HTTP failure', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await expect(smsService.getBalance()).rejects.toThrow('HTTP error! status: 500');
    });
  });

  describe('isConfigured', () => {
    it('returns true when configured', () => {
      expect(smsService.isConfigured()).toBe(true);
    });
  });
});
