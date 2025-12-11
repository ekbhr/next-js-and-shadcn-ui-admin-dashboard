"use client";

/**
 * Data Management Section
 * 
 * Sync and clear data operations.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Database, RefreshCw, Trash2, Globe, AlertTriangle } from "lucide-react";
import { getNetworkColors, getNetworkName } from "@/lib/ad-networks";

interface DataManagementSectionProps {
  recordCounts: {
    sedo: number;
    yandex: number;
    overview: number;
    domains: number;
  };
  lastDomainSync: Date | null;
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

export function DataManagementSection({ recordCounts, lastDomainSync }: DataManagementSectionProps) {
  const router = useRouter();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [clearing, setClearing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Sync Domains
  const syncDomains = async () => {
    setSyncing("domains");
    setMessage(null);
    try {
      const response = await fetch("/api/domains/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to sync domains");
      setMessage({ type: "success", text: `Synced ${data.total || 0} domains` });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed" });
    } finally {
      setSyncing(null);
    }
  };

  // Sync Revenue (Sedo)
  const syncSedo = async () => {
    setSyncing("sedo");
    setMessage(null);
    try {
      const response = await fetch("/api/reports/sedo/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to sync Sedo");
      setMessage({ type: "success", text: `Synced ${data.savedCount || 0} Sedo records` });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed" });
    } finally {
      setSyncing(null);
    }
  };

  // Sync Revenue (Yandex)
  const syncYandex = async () => {
    setSyncing("yandex");
    setMessage(null);
    try {
      const response = await fetch("/api/reports/yandex/sync", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to sync Yandex");
      setMessage({ type: "success", text: `Synced ${data.savedCount || 0} Yandex records` });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed" });
    } finally {
      setSyncing(null);
    }
  };

  // Sync All
  const syncAll = async () => {
    setSyncing("all");
    setMessage(null);
    try {
      // Sync domains first
      await fetch("/api/domains/sync", { method: "POST" });
      
      // Then sync revenue from all networks
      const [sedoRes, yandexRes] = await Promise.all([
        fetch("/api/reports/sedo/sync", { method: "POST" }),
        fetch("/api/reports/yandex/sync", { method: "POST" }),
      ]);

      const sedoData = await sedoRes.json();
      const yandexData = await yandexRes.json();

      const totalRecords = (sedoData.savedCount || 0) + (yandexData.savedCount || 0);
      setMessage({ type: "success", text: `Full sync complete! ${totalRecords} records synced` });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed" });
    } finally {
      setSyncing(null);
    }
  };

  // Clear Data
  const clearData = async (type: "sedo" | "yandex" | "all") => {
    setClearing(type);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/cleanup-data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to clear data");
      setMessage({ type: "success", text: data.message || "Data cleared successfully" });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed" });
    } finally {
      setClearing(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Management
        </CardTitle>
        <CardDescription>
          Sync data from ad networks and manage stored records.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Record Counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Badge className={getNetworkColors("sedo").badge}>Sedo</Badge>
            <p className="text-2xl font-bold mt-2">{recordCounts.sedo.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">records</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Badge className={getNetworkColors("yandex").badge}>Yandex</Badge>
            <p className="text-2xl font-bold mt-2">{recordCounts.yandex.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">records</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Badge variant="secondary">Overview</Badge>
            <p className="text-2xl font-bold mt-2">{recordCounts.overview.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">records</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Badge variant="outline">Domains</Badge>
            <p className="text-2xl font-bold mt-2">{recordCounts.domains.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">assigned</p>
          </div>
        </div>

        {/* Sync Actions */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync Actions
          </h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={syncDomains}
              disabled={syncing !== null}
            >
              {syncing === "domains" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Globe className="mr-2 h-4 w-4" />
              )}
              Sync Domains
            </Button>

            <Button
              variant="outline"
              onClick={syncSedo}
              disabled={syncing !== null}
              className="border-blue-200 hover:bg-blue-50"
            >
              {syncing === "sedo" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync {getNetworkName("sedo")}
            </Button>

            <Button
              variant="outline"
              onClick={syncYandex}
              disabled={syncing !== null}
              className="border-orange-200 hover:bg-orange-50"
            >
              {syncing === "yandex" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync {getNetworkName("yandex")}
            </Button>

            <Button
              onClick={syncAll}
              disabled={syncing !== null}
            >
              {syncing === "all" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync All
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Last domain sync: {formatTimeAgo(lastDomainSync)}
          </p>
        </div>

        {/* Clear Data (Danger Zone) */}
        <div className="space-y-3 pt-4 border-t border-destructive/20">
          <h4 className="font-medium flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </h4>
          <div className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" disabled={clearing !== null}>
                  {clearing === "sedo" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Clear Sedo Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Sedo Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all {recordCounts.sedo.toLocaleString()} Sedo revenue records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearData("sedo")} className="bg-destructive hover:bg-destructive/90">
                    Delete Sedo Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10" disabled={clearing !== null}>
                  {clearing === "yandex" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Clear Yandex Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Yandex Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete all {recordCounts.yandex.toLocaleString()} Yandex revenue records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearData("yandex")} className="bg-destructive hover:bg-destructive/90">
                    Delete Yandex Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={clearing !== null}>
                  {clearing === "all" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                  Clear ALL Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear ALL Revenue Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will delete ALL revenue records from all networks ({(recordCounts.sedo + recordCounts.yandex + recordCounts.overview).toLocaleString()} total records). 
                    Domain assignments will be preserved. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearData("all")} className="bg-destructive hover:bg-destructive/90">
                    Delete ALL Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Message */}
        {message && (
          <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-red-600"}`}>
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

