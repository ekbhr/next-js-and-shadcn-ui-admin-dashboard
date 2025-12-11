/**
 * Migrate Environment Credentials to Database
 * 
 * One-time migration helper to convert existing env var credentials
 * to database-stored accounts.
 * 
 * POST /api/admin/network-accounts/migrate
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { migrateEnvCredentialsToDatabase } from "@/lib/network-accounts";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { network } = body;

    if (!network || !["sedo", "yandex"].includes(network)) {
      return NextResponse.json(
        { error: "Invalid network. Must be 'sedo' or 'yandex'" },
        { status: 400 }
      );
    }

    const result = await migrateEnvCredentialsToDatabase(network);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error migrating credentials:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Migration failed" 
      },
      { status: 500 }
    );
  }
}

