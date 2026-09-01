import { z, CreateVolunteerInputSchema, CreatedVolunteerSchema } from "@kabarin/types";
import { eq, and, volunteers, user } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";
import { assertRole, assertCommunity } from "../../lib/auth-guard";
import { triggerBotWebhook } from "../../lib/bot-webhook";
import crypto from "crypto";

export class CreateVolunteerEndpoint extends ApiRoute {
  schema = {
    tags: ["Volunteer Management"],
    summary: "Register and provision new volunteer",
    description:
      "Registers a new volunteer in the cadre's RT. " +
      "Automatically provisions an authenticated user account with a temporary password for dashboard access.",
    request: {
      body: {
        content: { "application/json": { schema: CreateVolunteerInputSchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "Volunteer registered and user account provisioned successfully",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: CreatedVolunteerSchema,
            }),
          },
        },
      },
      "403": {
        description: "User is not associated with an RT",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "409": {
        description: "Volunteer with this phone or email already registered",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "422": {
        description: "Validation error or account creation failed",
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
    const communityUnitId = assertCommunity(session);
    const db = c.get("db");
    const auth = c.get("auth");

    const body = await c.req.json<typeof CreateVolunteerInputSchema._type>();

    // 1. Check if volunteer already exists in RT by phone
    const existingVolunteer = await db.query.volunteers.findFirst({
      where: and(
        eq(volunteers.communityUnitId, communityUnitId),
        eq(volunteers.phone, body.phone)
      ),
    });

    if (existingVolunteer) {
      return c.json(
        { success: false, error: `Relawan dengan nomor WhatsApp ${body.phone} sudah terdaftar di RT ini` },
        409
      );
    }

    // 2. Check if user email already exists
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, body.email),
    });

    if (existingUser) {
      return c.json(
        { success: false, error: `Email ${body.email} sudah terdaftar untuk pengguna lain` },
        409
      );
    }

    // 3. Provision Better Auth user account with temporary password
    const temporaryPassword = body.temporaryPassword || "Kabarin2026!";
    const signUpResponse = await auth.api.signUpEmail({
      body: { name: body.name, email: body.email, password: temporaryPassword },
      asResponse: true,
    });

    if (!signUpResponse.ok) {
      const errorBody = (await signUpResponse.json()) as { message?: string };
      return c.json(
        { success: false, error: errorBody.message ?? "Gagal membuat akun relawan" },
        422
      );
    }

    const signUpData = (await signUpResponse.json()) as { user: { id: string } };
    const userId = signUpData.user.id;

    // 4. Update user role and bind to community RT
    await db
      .update(user)
      .set({
        communityUnitId,
        phone: body.phone,
        role: "volunteer",
      })
      .where(eq(user.id, userId));

    // 5. Insert into volunteers table
    const volunteerId = crypto.randomUUID();
    const [newVolunteer] = await db
      .insert(volunteers)
      .values({
        id: volunteerId,
        communityUnitId,
        userId,
        name: body.name,
        phone: body.phone,
        address: body.address,
        rt: body.rt,
        rw: body.rw,
        latitude: body.latitude ?? null,
        longitude: body.longitude ?? null,
        maxCapacity: body.maxCapacity ?? 5,
        isActive: true,
      })
      .returning();

    triggerBotWebhook(c, {
      event: "volunteer-created",
      payload: {
        name: newVolunteer.name,
        phone: newVolunteer.phone,
        email: body.email,
        temporaryPassword,
      },
    });

    return c.json({
      success: true,
      data: {
        ...newVolunteer,
        email: body.email,
        temporaryPassword,
        assignedElderlyCount: 0,
        createdAt: newVolunteer.createdAt.toISOString(),
        updatedAt: newVolunteer.updatedAt.toISOString(),
      },
    });
  }
}

