import { NextRequest, NextResponse } from "next/server";
import { sedoClient } from "@/lib/sedo";
import type { SedoReportParams } from "@/lib/sedo";
import { processSedoReport, validateBatch } from "@/lib/sedo-processor";
// import { prisma } from "@/lib/prisma"; // Will be used when saving to database

/**
 * GET /api/reports/sedo/device
 * 
 * Fetch revenue data broken down by device type
 * 
 * Workflow:
 * 1. Pull data from Sedo API
 * 2. Process/transform data
 * 3. Validate data
 * 4. (Future) Save to database
 * 
 * Query parameters:
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 * - domain: Filter by specific domain (optional)
 * - revshare: Revshare percentage 0-100 (optional)
 * - save: "true" to save to database (optional, defaults to false)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const params: SedoReportParams = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      domain: searchParams.get("domain") || undefined,
    };

    const revshareParam = searchParams.get("revshare");
    const revshare = revshareParam ? parseFloat(revshareParam) : undefined;
    const shouldSave = searchParams.get("save") === "true";

    // Step 1: Pull data from Sedo API
    const rawResult = await sedoClient.getRevenueByDevice(params);

    if (!rawResult.success) {
      return NextResponse.json(
        { error: rawResult.error || "Failed to fetch Sedo device data" },
        { status: 500 },
      );
    }

    // Step 2: Process/transform data
    const processedResult = processSedoReport(rawResult, {
      revshare,
      source: "api",
    });

    if (!processedResult.success || !processedResult.processed) {
      return NextResponse.json(
        { error: processedResult.error || "Failed to process Sedo device data" },
        { status: 500 },
      );
    }

    // Step 3: Validate data
    const validation = validateBatch(processedResult.processed);

    // Step 4: (Future) Save to database
    // TODO: Implement database saving once Prisma models are defined

    return NextResponse.json({
      success: true,
      raw: rawResult,
      processed: processedResult.processed,
      metadata: processedResult.metadata,
      validation: {
        total: processedResult.processed.length,
        valid: validation.validItems.length,
        invalid: validation.invalidItems.length,
        errors: validation.invalidItems,
      },
      saved: false,
    }, { status: 200 });
  } catch (error) {
    console.error("Sedo device API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

