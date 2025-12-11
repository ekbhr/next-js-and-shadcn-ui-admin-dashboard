/**
 * API Key Management Endpoint
 * 
 * GET    - List user's API keys
 * POST   - Create new API key
 * DELETE - Delete an API key
 * PATCH  - Update API key (name, toggle active)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createApiKey,
  getUserApiKeys,
  deleteApiKey,
  toggleApiKey,
  updateApiKeyName,
  API_SCOPES,
} from "@/lib/api-keys";

// GET - List all API keys for the user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const keys = await getUserApiKeys(session.user.id);

    return NextResponse.json({
      success: true,
      keys,
      availableScopes: API_SCOPES,
    });
  } catch (error) {
    console.error("[API Keys] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

// POST - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, scopes, expiresInDays } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // Calculate expiration date if provided
    let expiresAt: Date | undefined;
    if (expiresInDays && typeof expiresInDays === "number" && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Validate scopes
    const validScopes = scopes?.filter((s: string) => s in API_SCOPES) || ["reports:read"];

    const newKey = await createApiKey(session.user.id, name.trim(), {
      scopes: validScopes,
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      message: "API key created. Copy it now - it won't be shown again!",
      key: newKey,
    });
  } catch (error) {
    console.error("[API Keys] POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an API key
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json(
        { success: false, error: "Key ID is required" },
        { status: 400 }
      );
    }

    const deleted = await deleteApiKey(keyId, session.user.id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "API key not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "API key deleted",
    });
  } catch (error) {
    console.error("[API Keys] DELETE Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}

// PATCH - Update API key (name or toggle active)
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, toggleActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Key ID is required" },
        { status: 400 }
      );
    }

    if (toggleActive) {
      const toggled = await toggleApiKey(id, session.user.id);
      if (!toggled) {
        return NextResponse.json(
          { success: false, error: "API key not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "API key status updated",
      });
    }

    if (name) {
      const updated = await updateApiKeyName(id, session.user.id, name);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: "API key not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "API key name updated",
      });
    }

    return NextResponse.json(
      { success: false, error: "No update action specified" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[API Keys] PATCH Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update API key" },
      { status: 500 }
    );
  }
}

