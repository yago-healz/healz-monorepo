import { relations } from 'drizzle-orm';
import { user, session, account } from './auth';
import { organization, member, invitation } from './organization';
import { clinic, clinicUser } from './clinic';

// ============ RELATIONS ============

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  members: many(member),
  clinicUsers: many(clinicUser),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(member),
  clinics: many(clinic),
  invitations: many(invitation),
}));

export const memberRelations = relations(member, ({ one }) => ({
  organization: one(organization, {
    fields: [member.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [member.userId],
    references: [user.id],
  }),
}));

export const invitationRelations = relations(invitation, ({ one }) => ({
  organization: one(organization, {
    fields: [invitation.organizationId],
    references: [organization.id],
  }),
  inviter: one(user, {
    fields: [invitation.inviterId],
    references: [user.id],
  }),
}));

export const clinicRelations = relations(clinic, ({ one, many }) => ({
  organization: one(organization, {
    fields: [clinic.organizationId],
    references: [organization.id],
  }),
  clinicUsers: many(clinicUser),
}));

export const clinicUserRelations = relations(clinicUser, ({ one }) => ({
  clinic: one(clinic, {
    fields: [clinicUser.clinicId],
    references: [clinic.id],
  }),
  user: one(user, {
    fields: [clinicUser.userId],
    references: [user.id],
  }),
}));
