/**
 * API Documentation Page
 * 
 * Provides documentation for the Publisher API.
 */

import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Key, Server, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "RevEngine Media - API Documentation",
};

export default async function ApiDocsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Documentation</h1>
        <p className="text-muted-foreground">
          Access your revenue data programmatically using our REST API.
        </p>
      </div>

      {/* Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <Key className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Use API keys from your Account settings to authenticate requests.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Server className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Base URL</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-sm bg-muted px-2 py-1 rounded">
              https://reporting.revengine.media/api/v1
            </code>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Zap className="h-8 w-8 text-primary mb-2" />
            <CardTitle className="text-lg">Rate Limit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              100 requests per hour per API key
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Authentication Section */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>
            All API requests require authentication using a Bearer token.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Include your API key in the <code className="bg-muted px-1 rounded">Authorization</code> header:
          </p>
          <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`Authorization: Bearer rem_your_api_key_here`}
          </pre>
          <p className="text-sm text-muted-foreground">
            Generate API keys from your{" "}
            <a href="/dashboard/account" className="text-primary underline">
              Account Settings
            </a>
            .
          </p>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="reports">
            <TabsList>
              <TabsTrigger value="reports">GET /reports</TabsTrigger>
              <TabsTrigger value="summary">GET /reports/summary</TabsTrigger>
            </TabsList>

            {/* GET /reports */}
            <TabsContent value="reports" className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  GET
                </Badge>
                <code className="text-sm">/api/v1/reports</code>
              </div>
              <p className="text-sm text-muted-foreground">
                Retrieve your revenue data with optional filters and pagination.
              </p>

              <div className="space-y-2">
                <h4 className="font-medium">Query Parameters</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Parameter</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-3"><code>startDate</code></td>
                        <td className="p-3">string</td>
                        <td className="p-3">Start date (YYYY-MM-DD). Default: 30 days ago</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3"><code>endDate</code></td>
                        <td className="p-3">string</td>
                        <td className="p-3">End date (YYYY-MM-DD). Default: today</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3"><code>domain</code></td>
                        <td className="p-3">string</td>
                        <td className="p-3">Filter by domain (optional)</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3"><code>limit</code></td>
                        <td className="p-3">number</td>
                        <td className="p-3">Records per page (1-1000). Default: 100</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3"><code>offset</code></td>
                        <td className="p-3">number</td>
                        <td className="p-3">Pagination offset. Default: 0</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3"><code>format</code></td>
                        <td className="p-3">string</td>
                        <td className="p-3">"json" or "csv". Default: json</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Example Request</h4>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`curl -X GET \\
  "https://reporting.revengine.media/api/v1/reports?startDate=2025-01-01&limit=10" \\
  -H "Authorization: Bearer rem_your_api_key"`}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Example Response</h4>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`{
  "success": true,
  "data": [
    {
      "date": "2025-12-10",
      "network": "sedo",
      "domain": "example.com",
      "revenue": 45.50,
      "impressions": 12500,
      "clicks": 125,
      "ctr": 1.0,
      "rpm": 3.64,
      "currency": "EUR"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  },
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-12-11",
    "domain": null
  }
}`}
                </pre>
              </div>
            </TabsContent>

            {/* GET /reports/summary */}
            <TabsContent value="summary" className="space-y-4 mt-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  GET
                </Badge>
                <code className="text-sm">/api/v1/reports/summary</code>
              </div>
              <p className="text-sm text-muted-foreground">
                Get aggregated revenue totals, optionally grouped by day, domain, or network.
              </p>

              <div className="space-y-2">
                <h4 className="font-medium">Query Parameters</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3">Parameter</th>
                        <th className="text-left p-3">Type</th>
                        <th className="text-left p-3">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="p-3"><code>startDate</code></td>
                        <td className="p-3">string</td>
                        <td className="p-3">Start date (YYYY-MM-DD)</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3"><code>endDate</code></td>
                        <td className="p-3">string</td>
                        <td className="p-3">End date (YYYY-MM-DD)</td>
                      </tr>
                      <tr className="border-t">
                        <td className="p-3"><code>groupBy</code></td>
                        <td className="p-3">string</td>
                        <td className="p-3">"day", "domain", or "network" (optional)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Example: Grand Total</h4>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`curl "https://reporting.revengine.media/api/v1/reports/summary" \\
  -H "Authorization: Bearer rem_your_api_key"

// Response:
{
  "success": true,
  "summary": {
    "revenue": 1250.75,
    "impressions": 450000,
    "clicks": 4500,
    "recordCount": 150
  },
  "period": {
    "startDate": "2025-11-11",
    "endDate": "2025-12-11"
  }
}`}
                </pre>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Example: Group by Domain</h4>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`curl "https://reporting.revengine.media/api/v1/reports/summary?groupBy=domain" \\
  -H "Authorization: Bearer rem_your_api_key"

// Response:
{
  "success": true,
  "data": [
    { "domain": "example.com", "revenue": 750.50, "impressions": 250000, "clicks": 2500 },
    { "domain": "test.com", "revenue": 500.25, "impressions": 200000, "clicks": 2000 }
  ],
  "period": { "startDate": "2025-11-11", "endDate": "2025-12-11" }
}`}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Error Handling */}
      <Card>
        <CardHeader>
          <CardTitle>Error Handling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Status Code</th>
                  <th className="text-left p-3">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-3"><code>200</code></td>
                  <td className="p-3">Success</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3"><code>400</code></td>
                  <td className="p-3">Bad Request - Invalid parameters</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3"><code>401</code></td>
                  <td className="p-3">Unauthorized - Invalid or missing API key</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3"><code>403</code></td>
                  <td className="p-3">Forbidden - API key lacks required permissions</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3"><code>429</code></td>
                  <td className="p-3">Too Many Requests - Rate limit exceeded</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3"><code>500</code></td>
                  <td className="p-3">Internal Server Error</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Error Response Format</h4>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`{
  "success": false,
  "error": "Description of what went wrong"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            API requests are limited to <strong>100 requests per hour</strong> per API key.
            Rate limit information is included in response headers:
          </p>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Header</th>
                  <th className="text-left p-3">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-3"><code>X-RateLimit-Remaining</code></td>
                  <td className="p-3">Requests remaining in current window</td>
                </tr>
                <tr className="border-t">
                  <td className="p-3"><code>X-RateLimit-Reset</code></td>
                  <td className="p-3">When the rate limit resets (ISO 8601)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

