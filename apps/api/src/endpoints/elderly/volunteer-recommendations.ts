import { z, VolunteerRecommendationSchema } from "@kabarin/types";
import { eq, and, volunteers, elderlyVolunteers, elderly } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";
import { assertElderlyAccess } from "../../lib/policies/elderly.policy";

// Haversine formula — returns straight-line distance in meters
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class GetVolunteerRecommendationsEndpoint extends ApiRoute {
  schema = {
    tags: ["Elderly Management"],
    summary: "Get proximity & workload-sorted volunteer recommendations for an elderly",
    description:
      "### Proximity & Workload Matching\n\n" +
      "Returns an ordered list of active volunteers in the RT, ranked by:\n" +
      "1. **Haversine straight-line distance** from the elderly's home coordinates (ascending)\n" +
      "2. **Active care load** — current number of assigned elderly (ascending)\n\n" +
      "### Filtering Rules:\n" +
      "- Only includes `isActive = true` volunteers in the same RT territory\n" +
      "- `isRecommended = true` when distance < 100m **AND** `activeBinaan < maxCapacity`\n" +
      "- Volunteers without GPS coordinates are included but sorted last\n\n" +
      "**No AI calls** — pure mathematical calculation. Safe to call on every form render.",
    responses: {
      "200": {
        description: "Sorted volunteer recommendations",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.array(VolunteerRecommendationSchema),
            }),
          },
        },
      },
      "404": {
        description: "Elderly not found or not in cadre's RT",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const session = assertRole(c, "cadre", "admin");
    assertCommunity(session);
    const db = c.get("db");
    const elderlyId = c.req.param("id")!;

    // Verify elderly exists and is in cadre's RT
    const elderlyRecord = await assertElderlyAccess(db, session, elderlyId);

    // Fetch all active volunteers in the same RT + their current assignment count
    const allVolunteers = await db.query.volunteers.findMany({
      where: and(
        eq(volunteers.communityUnitId, elderlyRecord.communityUnitId),
        eq(volunteers.isActive, true)
      ),
      with: {
        assignedElderly: true,
      },
    });

    const elderlyLat = elderlyRecord.latitude;
    const elderlyLon = elderlyRecord.longitude;

    // Build recommendation list with Haversine distances
    const recommendations = allVolunteers.map((vol) => {
      const activeBinaan = vol.assignedElderly?.length ?? 0;
      const availableSlots = vol.maxCapacity - activeBinaan;

      let distanceMeters = Infinity;
      if (
        elderlyLat != null &&
        elderlyLon != null &&
        vol.latitude != null &&
        vol.longitude != null
      ) {
        distanceMeters = haversineMeters(
          elderlyLat,
          elderlyLon,
          vol.latitude,
          vol.longitude
        );
      }

      const isRecommended =
        distanceMeters < 100 && activeBinaan < vol.maxCapacity;

      return {
        volunteerId: vol.id,
        name: vol.name,
        phone: vol.phone,
        address: vol.address,
        distanceMeters: distanceMeters === Infinity ? -1 : Math.round(distanceMeters * 10) / 10,
        activeBinaan,
        maxCapacity: vol.maxCapacity,
        availableSlots,
        isRecommended,
        latitude: vol.latitude ?? null,
        longitude: vol.longitude ?? null,
      };
    });

    // Sort: recommended first (distance ASC), then non-recommended (load ASC)
    recommendations.sort((a, b) => {
      const aHasGps = a.distanceMeters >= 0;
      const bHasGps = b.distanceMeters >= 0;

      // No-GPS volunteers always go last
      if (aHasGps && !bHasGps) return -1;
      if (!aHasGps && bHasGps) return 1;
      if (!aHasGps && !bHasGps) return a.activeBinaan - b.activeBinaan;

      // Recommended vs non-recommended
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;

      // Both same recommendation status: sort by distance, then by load
      if (a.distanceMeters !== b.distanceMeters) {
        return a.distanceMeters - b.distanceMeters;
      }
      return a.activeBinaan - b.activeBinaan;
    });

    return c.json({ success: true, data: recommendations });
  }
}
