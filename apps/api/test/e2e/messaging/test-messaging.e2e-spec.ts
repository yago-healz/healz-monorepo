import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MessagingModule } from '../../../src/messaging/messaging.module';

describe('Test Messaging API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MessagingModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpa histórico antes de cada teste
    await request(app.getHttpServer())
      .delete('/test/messaging/history')
      .expect(200);
  });

  describe('POST /test/messaging/simulate-message', () => {
    it('should simulate incoming message successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/messaging/simulate-message')
        .send({
          from: '+5511999999999',
          content: 'Ola, quero agendar consulta',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Message simulated successfully');
      expect(response.body.data.messageId).toBeDefined();
      expect(response.body.data.from).toBe('+5511999999999');
      expect(response.body.data.content).toBe('Ola, quero agendar consulta');
      expect(response.body.data.type).toBe('text');
    });

    it('should accept message with type', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/messaging/simulate-message')
        .send({
          from: '+5511999999999',
          content: 'Image attachment',
          type: 'image',
        })
        .expect(201);

      expect(response.body.data.type).toBe('image');
    });

    it('should accept message with metadata', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/messaging/simulate-message')
        .send({
          from: '+5511999999999',
          content: 'Test message',
          metadata: { customField: 'customValue' },
        })
        .expect(201);

      expect(response.body.data.metadata).toEqual({
        customField: 'customValue',
      });
    });

    it('should reject invalid phone number', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/messaging/simulate-message')
        .send({
          from: 'invalid-phone',
          content: 'Test',
        })
        .expect(400);

      const errorMessage = JSON.stringify(response.body.message).toLowerCase();
      expect(errorMessage).toContain('regular expression');
    });

    it('should reject empty content', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/messaging/simulate-message')
        .send({
          from: '+5511999999999',
          content: '',
        })
        .expect(400);

      const errorMessage = JSON.stringify(response.body.message).toLowerCase();
      expect(errorMessage).toContain('longer than');
    });

    it('should reject invalid message type', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/messaging/simulate-message')
        .send({
          from: '+5511999999999',
          content: 'Test',
          type: 'invalid-type',
        })
        .expect(400);

      const errorMessage = JSON.stringify(response.body.message).toLowerCase();
      expect(errorMessage).toContain('one of the following values');
    });
  });

  describe('POST /test/messaging/send-test-message', () => {
    it('should send test message successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/messaging/send-test-message')
        .send({
          to: '+5511999999999',
          content: 'Consulta agendada!',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.delivery_status).toBeDefined();
      expect(response.body.delivery_status.messageId).toBeDefined();
      expect(['sent', 'failed']).toContain(
        response.body.delivery_status.status,
      );
    });

    it('should send message with specific type', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/messaging/send-test-message')
        .send({
          to: '+5511999999999',
          content: 'Document sent',
          type: 'document',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid phone number', async () => {
      await request(app.getHttpServer())
        .post('/test/messaging/send-test-message')
        .send({
          to: 'invalid',
          content: 'Test',
        })
        .expect(400);
    });

    it('should reject empty content', async () => {
      await request(app.getHttpServer())
        .post('/test/messaging/send-test-message')
        .send({
          to: '+5511999999999',
          content: '',
        })
        .expect(400);
    });
  });

  describe('GET /test/messaging/history', () => {
    it('should return empty history initially', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/messaging/history')
        .expect(200);

      expect(response.body.messages).toEqual([]);
    });

    it('should return sent messages in history', async () => {
      // Envia algumas mensagens
      await request(app.getHttpServer())
        .post('/test/messaging/send-test-message')
        .send({ to: '+5511999999999', content: 'Message 1' });

      await request(app.getHttpServer())
        .post('/test/messaging/send-test-message')
        .send({ to: '+5511888888888', content: 'Message 2' });

      const response = await request(app.getHttpServer())
        .get('/test/messaging/history')
        .expect(200);

      expect(response.body.messages.length).toBeGreaterThanOrEqual(2);
      expect(response.body.messages[0].messageId).toBeDefined();
      expect(response.body.messages[0].status).toBeDefined();
    });
  });

  describe('DELETE /test/messaging/history', () => {
    it('should clear message history', async () => {
      // Envia uma mensagem
      await request(app.getHttpServer())
        .post('/test/messaging/send-test-message')
        .send({ to: '+5511999999999', content: 'Test' });

      // Verifica que há mensagens
      let response = await request(app.getHttpServer())
        .get('/test/messaging/history')
        .expect(200);

      expect(response.body.messages.length).toBeGreaterThan(0);

      // Limpa histórico
      response = await request(app.getHttpServer())
        .delete('/test/messaging/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('History cleared');

      // Verifica que está vazio
      response = await request(app.getHttpServer())
        .get('/test/messaging/history')
        .expect(200);

      expect(response.body.messages).toEqual([]);
    });
  });

  describe('Integration flow', () => {
    it('should handle complete message flow', async () => {
      // 1. Simula mensagem recebida
      const incomingResponse = await request(app.getHttpServer())
        .post('/test/messaging/simulate-message')
        .send({
          from: '+5511999999999',
          content: 'Ola, preciso de ajuda',
        })
        .expect(201);

      expect(incomingResponse.body.success).toBe(true);

      // 2. Envia resposta
      const outgoingResponse = await request(app.getHttpServer())
        .post('/test/messaging/send-test-message')
        .send({
          to: '+5511999999999',
          content: 'Como posso ajudar?',
        })
        .expect(201);

      expect(outgoingResponse.body.delivery_status.status).toBeDefined();

      // 3. Verifica histórico de mensagens enviadas
      const historyResponse = await request(app.getHttpServer())
        .get('/test/messaging/history')
        .expect(200);

      expect(historyResponse.body.messages.length).toBeGreaterThan(0);
    });
  });
});
