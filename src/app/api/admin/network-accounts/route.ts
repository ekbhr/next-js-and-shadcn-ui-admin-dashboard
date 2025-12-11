/**
 * Network Accounts API
 * 
 * Manage multiple ad network accounts (Sedo, Yandex, etc.)
 * 
 * GET    - List all accounts (without credentials)
 * POST   - Create new account
 * PATCH  - Update account
 * DELETE - Delete account
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createNetworkAccount,
  updateNetworkAccount,
  deleteNetworkAccount,
  getNetworkAccounts,
  migrateEnvCredentialsToDatabase,
} from "@/lib/network-accounts";
import type { SedoCredentials, YandexCredentials } from "@/lib/encryption";

// ============================================
// GET - List all accounts
// ============================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const network = searchParams.get("network") as "sedo" | "yandex" | null;

    const accounts = await getNetworkAccounts(network || undefined);

    return NextResponse.json({
      success: true,
      accounts,
    });
  } catch (error) {
    console.error("Error fetching network accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create new account
// ============================================

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
    const { network, name, credentials, isDefault } = body;

    // Validate required fields
    if (!network || !name || !credentials) {
      return NextResponse.json(
        { error: "Missing required fields: network, name, credentials" },
        { status: 400 }
      );
    }

    // Validate network type
    if (!["sedo", "yandex"].includes(network)) {
      return NextResponse.json(
        { error: "Invalid network type. Must be 'sedo' or 'yandex'" },
        { status: 400 }
      );
    }

    // Validate credentials based on network
    if (network === "sedo") {
      const sedoCreds = credentials as SedoCredentials;
      if (!sedoCreds.partnerId || !sedoCreds.signKey || !sedoCreds.username || !sedoCreds.password) {
        return NextResponse.json(
          { error: "Sedo requires: partnerId, signKey, username, password" },
          { status: 400 }
        );
      }
    } else if (network === "yandex") {
      const yandexCreds = credentials as YandexCredentials;
      if (!yandexCreds.oauthToken) {
        return NextResponse.json(
          { error: "Yandex requires: oauthToken" },
          { status: 400 }
        );
      }
    }

    const account = await createNetworkAccount(
      network,
      name,
      credentials,
      isDefault || false
    );

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
      accountId: account.id,
    });
  } catch (error) {
    console.error("Error creating network account:", error);
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "An account with this name already exists for this network" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH - Update account
// ============================================

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, credentials, isActive, isDefault } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    await updateNetworkAccount(id, {
      name,
      credentials,
      isActive,
      isDefault,
    });

    return NextResponse.json({
      success: true,
      message: "Account updated successfully",
    });
  } catch (error) {
    console.error("Error updating network account:", error);
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete account
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Account ID is required" },
        { status: 400 }
      );
    }

    await deleteNetworkAccount(id);

    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting network account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

