import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { db } from "../db/connection";
import { clinicUser, member, session } from "../db/schema";
import { auth } from "./auth";

@Injectable()
export class AuthService {
  async getSession(headers: Headers) {
    return auth.api.getSession({ headers });
  }

  async getUserOrganizations(userId: string) {
    return db.query.member.findMany({
      where: eq(member.userId, userId),
      with: { organization: true },
    });
  }

  async getUserClinics(userId: string, organizationId: string) {
    const results = await db.query.clinicUser.findMany({
      where: eq(clinicUser.userId, userId),
      with: {
        clinic: true,
      },
    });

    // Filtrar clinics pela organizationId
    return results.filter((cu) => cu.clinic.organizationId === organizationId);
  }

  async setActiveContext(
    sessionId: string,
    organizationId: string,
    clinicId?: string
  ) {
    await db
      .update(session)
      .set({
        activeOrganizationId: organizationId,
        activeClinicId: clinicId,
      })
      .where(eq(session.id, sessionId));
  }
}
