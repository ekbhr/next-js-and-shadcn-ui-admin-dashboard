import { NextRequest, NextResponse } from "next/server";
import { sedoClient } from "@/lib/sedo";
import type { SedoReportParams } from "@/lib/sedo";
import { processSedoReport, validateBatch } from "@/lib/sedo-processor";
// import { prisma } from "@/lib/prisma"; // Will be used when saving to database

/**
 * GET /api/reports/sedo/revenue
 * 
 * Fetch revenue data from Sedo, process it, and optionally save to database
 * 
 * Workflow:
 * 1. Pull data from Sedo API
 * 2. Process/transform data
 * 3. Validate data
 * 4. (Future) Save to database
 * 
 * Query parameters:
 * - startDate: YYYY-MM-DD (optional, defaults to 30 days ago)
 * - endDate: YYYY-MM-DD (optional, defaults to today)
 * - domain: Filter by specific domain (optional)
 * - revshare: Revshare percentage 0-100 (optional, for calculating net revenue)
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

    // Optional: Get revshare percentage for processing
    const revshareParam = searchParams.get("revshare");
    const revshare = revshareParam ? parseFloat(revshareParam) : undefined;
    
    // Optional: Save to database flag
    const shouldSave = searchParams.get("save") === "true";

    // Step 1: Pull data from Sedo API
    const rawResult = await sedoClient.getRevenueData(params);

    if (!rawResult.success) {
      return NextResponse.json(
        { error: rawResult.error || "Failed to fetch Sedo revenue data" },
        { status: 500 },
      );
    }

    // Step 2: Process/transform data
    const processedResult = processSedoReport(rawResult, {
      revshare,
      source: "api",
      // userId will be added from session/auth when saving to database
    });

    if (!processedResult.success || !processedResult.processed) {
      return NextResponse.json(
        { error: processedResult.error || "Failed to process Sedo data" },
        { status: 500 },
      );
    }

    // Step 3: Validate data
    const validation = validateBatch(processedResult.processed);
    
    if (!validation.valid && validation.invalidItems.length > 0) {
      console.warn("Some data items failed validation:", validation.invalidItems);
    }

    // Step 4: (Future) Save to database
    // TODO: Implement database saving once Prisma models are defined
    // if (shouldSave && validation.validItems.length > 0) {
    //   try {
    //     // Example structure (will be implemented later):
    //     // await prisma.sedoReport.createMany({
    //     //   data: validation.validItems.map(item => ({
    //     //     date: item.date,
    //     //     domain: item.domain,
    //     //     network: item.network,
    //     //     grossRevenue: item.grossRevenue,
    //     //     netRevenue: item.netRevenue,
    //     //     // ... other fields
    //     //   })),
    //     //   skipDuplicates: true,
    //     // });
    //   } catch (dbError) {
    //     console.error("Failed to save to database:", dbError);
    //     // Continue to return data even if save fails
    //   }
    // }

    return NextResponse.json({
      success: true,
      raw: rawResult, // Original API response
      processed: processedResult.processed, // Processed data ready for database
      metadata: processedResult.metadata,
      validation: {
        total: processedResult.processed.length,
        valid: validation.validItems.length,
        invalid: validation.invalidItems.length,
        errors: validation.invalidItems,
      },
      saved: false, // Will be true once database saving is implemented
    }, { status: 200 });
  } catch (error) {
    console.error("Sedo revenue API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

