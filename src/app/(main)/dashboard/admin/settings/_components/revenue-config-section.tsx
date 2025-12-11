"use client";

/**
 * Revenue Configuration Section
 * 
 * Manage default RevShare percentage for new domains.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Percent } from "lucide-react";

interface RevenueConfigSectionProps {
  defaultRevShare: number;
}

export function RevenueConfigSection({ defaultRevShare }: RevenueConfigSectionProps) {
  const router = useRouter();
  const [revShare, setRevShare] = useState(defaultRevShare.toString());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    const value = parseFloat(revShare);
    
    if (isNaN(value) || value < 0 || value > 100) {
      setMessage({ type: "error", text: "RevShare must be between 0 and 100" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultRevShare: value }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save");
      }

      setMessage({ type: "success", text: "Default RevShare updated!" });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = parseFloat(revShare) !== defaultRevShare;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Revenue Configuration
        </CardTitle>
        <CardDescription>
          Configure default revenue share for new domain assignments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-4">
          <div className="space-y-2 flex-1 max-w-xs">
            <Label htmlFor="revShare">Default RevShare (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="revShare"
                type="number"
                min="0"
                max="100"
                step="1"
                value={revShare}
                onChange={(e) => setRevShare(e.target.value)}
                className="w-24"
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Applied to newly synced domains. Existing assignments are not affected.
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>

        {message && (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

