import { z, RegisterCommunitySchema, CommunityUnitSchema, UserResponseSchema } from "@kabarin/types";
import { eq, communityUnits, user } from "@kabarin/db";
import type { Context } from "hono";
import { ApiRoute } from "../../lib/api-route";
import type { AppEnv } from "../../types/app-env";

export class RegisterCommunityEndpoint extends ApiRoute {
  schema = {
    tags: ["Community"],
    summary: "Self-register RT + kader account",
    description:
      "Public endpoint. Creates a new community unit (RT) and the first cadre account in one request. " +
      "Fails with 409 if the composite code (subdistrictCode-RWxx-RTxx) is already registered.",
    request: {
      body: {
        content: { "application/json": { schema: RegisterCommunitySchema } },
        required: true,
      },
    },
    responses: {
      "200": {
        description: "RT registered and kader signed in",
        content: {
          "application/json": {
            schema: z.object({
              success: z.literal(true),
              data: z.object({
                community: CommunityUnitSchema,
                user: UserResponseSchema,
              }),
            }),
          },
        },
      },
      "409": {
        description: "RT with this composite code already registered",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
      "422": {
        description: "Email already registered or validation error",
        content: {
          "application/json": {
            schema: z.object({ success: z.literal(false), error: z.string() }),
          },
        },
      },
    },
  };

  async handle(c: Context<AppEnv>) {
    const db = c.get("db");
    const auth = c.get("auth");
    const body = await c.req.json<typeof RegisterCommunitySchema._type>();

    // 1. Generate composite code and check uniqueness
    const rw = body.rw.padStart(2, "0");
    const rt = body.rt.padStart(2, "0");
    const compositeCode = `${body.subdistrictCode}-RW${rw}-RT${rt}`;

    const existing = await db.query.communityUnits.findFirst({
      where: eq(communityUnits.code, compositeCode),
    });
    if (existing) {
      return c.json(
        { success: false, error: `RT ini sudah terdaftar (${compositeCode})` },
        409
      );
    }

    // 2. Insert community_units
    const communityId = crypto.randomUUID();
    const communityName = `RT ${body.rt} / RW ${body.rw}, Kel. ${body.subdistrict}`;

    const [newCommunity] = await db
      .insert(communityUnits)
      .values({
        id: communityId,
        code: compositeCode,
        name: communityName,
        province: body.province,
        city: body.city,
        district: body.district,
        subdistrict: body.subdistrict,
        subdistrictCode: body.subdistrictCode,
        rw: body.rw,
        rt: body.rt,
        healthFacilityName: body.healthFacilityName ?? null,
        healthFacilityPhone: body.healthFacilityPhone ?? null,
        communityHealthWorkerPhone: body.communityHealthWorkerPhone ?? null,
        ambulancePhone: body.ambulancePhone ?? null,
      })
      .returning();

    // 3. Create kader account via Better Auth (handles password hashing + session)
    const signUpResponse = await auth.api.signUpEmail({
      body: { name: body.name, email: body.email, password: body.password },
      asResponse: true,
    });

    if (!signUpResponse.ok) {
      // Rollback community insert (compensating transaction)
      await db.delete(communityUnits).where(eq(communityUnits.id, communityId));
      const errorBody = await signUpResponse.json() as { message?: string };
      return c.json(
        { success: false, error: errorBody.message ?? "Registrasi akun gagal" },
        422
      );
    }

    const signUpData = await signUpResponse.json() as { user: { id: string } };
    const userId = signUpData.user.id;

    // 4. Patch user: set communityUnitId, phone, and ensure role is cadre
    await db
      .update(user)
      .set({
        communityUnitId: communityId,
        phone: body.phone ?? null,
        role: "cadre",
      })
      .where(eq(user.id, userId));

    // 5. Fetch final user state for response
    const finalUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    // 6. Forward Set-Cookie from Better Auth to client (session auto sign-in)
    const setCookies = signUpResponse.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
      c.header("Set-Cookie", cookie, { append: true });
    }
    // Fallback for environments without getSetCookie
    if (setCookies.length === 0) {
      const raw = signUpResponse.headers.get("set-cookie");
      if (raw) c.header("Set-Cookie", raw);
    }

    return c.json({
      success: true,
      data: {
        community: {
          ...newCommunity,
          createdAt: newCommunity.createdAt.toISOString(),
          updatedAt: newCommunity.updatedAt.toISOString(),
        },
        user: {
          id: finalUser!.id,
          name: finalUser!.name,
          email: finalUser!.email,
          role: finalUser!.role as "cadre",
          communityUnitId: finalUser!.communityUnitId,
          phone: finalUser!.phone,
          emailVerified: finalUser!.emailVerified,
          image: finalUser!.image ?? null,
          createdAt: finalUser!.createdAt.toISOString(),
        },
      },
    });
  }
}
