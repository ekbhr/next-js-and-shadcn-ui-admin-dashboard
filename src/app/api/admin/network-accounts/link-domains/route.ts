/**
 * Link Existing Domains to Network Account
 * 
 * POST /api/admin/network-accounts/link-domains
 * 
 * Links all domains of a specific network that don't have an accountId
 * to the specified account.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const { accountId, network } = body;

    if (!accountId || !network) {
      return NextResponse.json(
        { error: "accountId and network are required" },
        { status: 400 }
      );
    }

    // Verify the account exists
    const account = await prisma.networkAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    if (account.network !== network) {
      return NextResponse.json(
        { error: `Account is for ${account.network}, not ${network}` },
        { status: 400 }
      );
    }

    // Update all domains of this network that don't have an accountId
    const result = await prisma.domain_Assignment.updateMany({
      where: {
        network: network,
        accountId: null,
      },
      data: {
        accountId: accountId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Linked ${result.count} domains to ${account.name}`,
      domainsLinked: result.count,
    });
  } catch (error) {
    console.error("Error linking domains:", error);
    return NextResponse.json(
      { error: "Failed to link domains" },
      { status: 500 }
    );
  }
}

// GET - Check how many domains are unlinked
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
    const network = searchParams.get("network");

    const unlinkedCount = await prisma.domain_Assignment.count({
      where: {
        network: network || undefined,
        accountId: null,
      },
    });

    const linkedCount = await prisma.domain_Assignment.count({
      where: {
        network: network || undefined,
        accountId: { not: null },
      },
    });

    return NextResponse.json({
      success: true,
      unlinked: unlinkedCount,
      linked: linkedCount,
    });
  } catch (error) {
    console.error("Error checking domains:", error);
    return NextResponse.json(
      { error: "Failed to check domains" },
      { status: 500 }
    );
  }
}

