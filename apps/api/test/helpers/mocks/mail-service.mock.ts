import { MailService } from '../../../src/infrastructure/mail/mail.service';

export type MailServiceMock = jest.Mocked<
  Pick<
    MailService,
    'sendVerificationEmail' | 'sendPasswordResetEmail' | 'sendInviteEmail'
  >
>;

export const createMailServiceMock = (): MailServiceMock => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendInviteEmail: jest.fn().mockResolvedValue(undefined),
}) as MailServiceMock;
