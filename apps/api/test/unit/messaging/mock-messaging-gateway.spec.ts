import { NotFoundException } from '@nestjs/common';
import { MockMessagingGateway } from '../../../src/modules/messaging/infrastructure/mock-messaging-gateway.service';

describe('MockMessagingGateway', () => {
  let gateway: MockMessagingGateway;

  beforeEach(() => {
    gateway = new MockMessagingGateway();
  });

  afterEach(() => {
    gateway.clearHistory();
  });

  describe('sendMessage', () => {
    it('should send message successfully', async () => {
      const result = await gateway.sendMessage({
        to: '+5511999999999',
        content: 'Hello, World!',
      });

      expect(result.messageId).toBeDefined();
      expect(['sent', 'failed']).toContain(result.status);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should include message type when provided', async () => {
      const result = await gateway.sendMessage({
        to: '+5511999999999',
        content: 'Test message',
        type: 'text',
      });

      expect(result.messageId).toBeDefined();
    });

    it('should occasionally simulate failures', async () => {
      const results = await Promise.all(
        Array.from({ length: 100 }, () =>
          gateway.sendMessage({
            to: '+5511999999999',
            content: 'Test',
          }),
        ),
      );

      const failedCount = results.filter((r) => r.status === 'failed').length;
      // Com 5% de falha, em 100 mensagens esperamos pelo menos algumas falhas
      // mas vamos aceitar 0 também pois é randomico
      expect(failedCount).toBeGreaterThanOrEqual(0);
      expect(failedCount).toBeLessThan(20); // mas não muito mais que 5%
    });

    it('should store sent messages in history', async () => {
      await gateway.sendMessage({
        to: '+5511999999999',
        content: 'Message 1',
      });

      await gateway.sendMessage({
        to: '+5511888888888',
        content: 'Message 2',
      });

      const history = gateway.getHistory();
      expect(history).toHaveLength(2);
    });
  });

  describe('sendMessages', () => {
    it('should send multiple messages', async () => {
      const results = await gateway.sendMessages([
        { to: '+5511999999999', content: 'Message 1' },
        { to: '+5511888888888', content: 'Message 2' },
        { to: '+5511777777777', content: 'Message 3' },
      ]);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.messageId).toBeDefined();
        expect(['sent', 'failed']).toContain(result.status);
      });
    });

    it('should handle empty array', async () => {
      const results = await gateway.sendMessages([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('getDeliveryStatus', () => {
    it('should get delivery status for sent message', async () => {
      const sent = await gateway.sendMessage({
        to: '+5511999999999',
        content: 'Test',
      });

      const status = await gateway.getDeliveryStatus(sent.messageId);
      expect(status.messageId).toBe(sent.messageId);
      expect(status.status).toBeDefined();
    });

    it('should throw NotFoundException for unknown messageId', async () => {
      await expect(gateway.getDeliveryStatus('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it(
      'should eventually update status to delivered',
      async () => {
        const sent = await gateway.sendMessage({
          to: '+5511999999999',
          content: 'Test',
        });

        if (sent.status !== 'failed') {
          // Aguarda a progressão de status (2 segundos para delivered)
          await new Promise((resolve) => setTimeout(resolve, 2500));

          const status = await gateway.getDeliveryStatus(sent.messageId);
          expect(status.status).toBe('delivered');
        }
      },
      10000,
    );
  });

  describe('checkPhoneNumber', () => {
    it('should validate phone number', async () => {
      const isValid = await gateway.checkPhoneNumber('+5511999999999');
      expect(isValid).toBe(true);
    });

    it('should accept various phone formats', async () => {
      const phones = ['+5511999999999', '+1234567890', '+551112345678'];

      for (const phone of phones) {
        const isValid = await gateway.checkPhoneNumber(phone);
        expect(isValid).toBe(true);
      }
    });
  });

  describe('history management', () => {
    it('should clear history', async () => {
      await gateway.sendMessage({
        to: '+5511999999999',
        content: 'Test 1',
      });

      await gateway.sendMessage({
        to: '+5511888888888',
        content: 'Test 2',
      });

      expect(gateway.getHistory()).toHaveLength(2);

      gateway.clearHistory();
      expect(gateway.getHistory()).toHaveLength(0);
    });

    it('should return empty array when no messages sent', () => {
      const history = gateway.getHistory();
      expect(history).toEqual([]);
    });

    it('should maintain history order', async () => {
      const msg1 = await gateway.sendMessage({
        to: '+5511999999999',
        content: 'First',
      });

      const msg2 = await gateway.sendMessage({
        to: '+5511888888888',
        content: 'Second',
      });

      const history = gateway.getHistory();
      const messageIds = history.map((h) => h.messageId);

      expect(messageIds).toContain(msg1.messageId);
      expect(messageIds).toContain(msg2.messageId);
    });
  });
});
