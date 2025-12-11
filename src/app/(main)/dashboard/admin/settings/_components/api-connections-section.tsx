"use client";

/**
 * API Connections Section
 * 
 * Display status of connected ad networks.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plug, CheckCircle, XCircle, Clock } from "lucide-react";
import { getNetworkColors, getNetworkName } from "@/lib/ad-networks";

interface ApiStatus {
  configured: boolean;
  lastSync: Date | null;
}

interface ApiConnectionsSectionProps {
  apiStatus: {
    sedo: ApiStatus;
    yandex: ApiStatus;
  };
}

function formatTimeAgo(date: Date | null): string {
  if (!date) return "Never";

  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(date).toLocaleDateString();
}

export function ApiConnectionsSection({ apiStatus }: ApiConnectionsSectionProps) {
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ network: string; success: boolean; message: string } | null>(null);

  const testConnection = async (network: "sedo" | "yandex") => {
    setTesting(network);
    setTestResult(null);

    try {
      // Use dedicated test endpoints
      const endpoint = network === "sedo" 
        ? "/api/reports/sedo/test" 
        : "/api/reports/yandex/test";
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({ network, success: true, message: "Connection successful!" });
      } else {
        setTestResult({ network, success: false, message: data.error || "Connection failed" });
      }
    } catch (error) {
      setTestResult({ 
        network, 
        success: false, 
        message: error instanceof Error ? error.message : "Connection failed" 
      });
    } finally {
      setTesting(null);
    }
  };

  const networks = [
    { id: "sedo" as const, status: apiStatus.sedo },
    { id: "yandex" as const, status: apiStatus.yandex },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" />
          API Connections
        </CardTitle>
        <CardDescription>
          Status of connected advertising networks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {networks.map(({ id, status }) => {
            const colors = getNetworkColors(id);
            const isTestingThis = testing === id;
            const result = testResult?.network === id ? testResult : null;

            return (
              <div
                key={id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4">
                  {/* Network Badge */}
                  <Badge className={colors.badge}>
                    {getNetworkName(id, true)}
                  </Badge>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {status.configured ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={status.configured ? "text-green-600" : "text-red-600"}>
                      {status.configured ? "Connected" : "Not configured"}
                    </span>
                  </div>

                  {/* Last Sync */}
                  {status.configured && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Last sync: {formatTimeAgo(status.lastSync)}</span>
                    </div>
                  )}
                </div>

                {/* Test Button */}
                <div className="flex items-center gap-2">
                  {result && (
                    <span className={`text-sm ${result.success ? "text-green-600" : "text-red-600"}`}>
                      {result.message}
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnection(id)}
                    disabled={!status.configured || isTestingThis}
                  >
                    {isTestingThis ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Test API"
                    )}
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Future Networks */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="text-muted-foreground">
                AdSense
              </Badge>
              <span className="text-muted-foreground text-sm">Coming soon</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

