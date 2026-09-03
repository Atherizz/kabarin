/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session: {
      id: string;
      token: string;
      userId: string;
      expiresAt: string;
      createdAt: string;
      updatedAt: string;
      ipAddress: string | null;
      userAgent: string | null;
    } | undefined;
    user: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
      image: string | null;
      role: "admin" | "cadre" | "volunteer" | "family";
      communityUnitId: string | null;
      phone: string | null;
      createdAt: string;
      updatedAt: string;
    } | undefined;
  }
}
