import { z, FamilyMonitoredElderlySchema } from "@kabarin/types";
import { eq, or, elderlyFamily, elderlyMedications } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole } from "../../lib/auth-guard";

export class ListMeElderlyEndpoint extends ApiRoute {
  schema = {
    tags: ["Family Portal"],
    summary: "List monitored elderly parents for authenticated family user",
    description:
      "Returns all elderly individuals monitored by the currently authenticated family user. " +
      "Includes both elderly registered via `POST /api/family/me/elderly` (by `userId`) " +
      "and elderly where the family member is listed as an emergency contact (by matching phone number).\n\n" +
      "### Returned Data per Elderly:\n" +
      "- Traffic-light welfare status (`green`, `yellow`, `red`, `grey`)\n" +
      "- Verification progress (`verified`, `pending_verification`, `rejected`)\n" +
      "- Personal zero-login status page access token for WhatsApp link `/status/:token`\n" +
      "- Count of currently active medication schedules",
    responses: {
      "200": {
        description: "List of monitored elderly parents",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(FamilyMonitoredElderlySchema),
            }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "family", "admin");
    const db = c.get("db");

    // Find all elderlyFamily records linked to this user by userId OR phone
    const familyLinks = await db.query.elderlyFamily.findMany({
      where: session.user.phone
        ? or(
            eq(elderlyFamily.userId, session.user.id),
            eq(elderlyFamily.phone, session.user.phone)
          )
        : eq(elderlyFamily.userId, session.user.id),
      with: {
        elderly: {
          with: {
            communityUnit: true,
          },
        },
      },
    });

    const data = await Promise.all(
      familyLinks
        .filter((link) => link.elderly !== null)
        .map(async (link) => {
          const e = link.elderly!;

          const allMeds = await db.query.elderlyMedications.findMany({
            where: eq(elderlyMedications.elderlyId, e.id),
          });
          const activeMedicationsCount = allMeds.filter((m) => m.isActive).length;

          return {
            id: e.id,
            name: e.name,
            age: e.age,
            gender: e.gender,
            currentStatus: e.currentStatus,
            verificationStatus: e.verificationStatus,
            address: e.address,
            rt: e.rt,
            rw: e.rw,
            communityUnitId: e.communityUnitId,
            communityName: e.communityUnit?.name ?? `RT ${e.rt} / RW ${e.rw}`,
            relationship: link.relationship,
            isPrimaryContact: link.isPrimaryContact,
            accessToken: link.accessToken,
            activeMedicationsCount,
            preferredCheckinTime: e.preferredCheckinTime,
            updatedAt: e.updatedAt.toISOString(),
          };
        })
    );

    return c.json({ success: true, data });
  }
}
