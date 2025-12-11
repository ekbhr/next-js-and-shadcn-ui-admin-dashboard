"use client";

/**
 * Email Notifications Section
 * 
 * Configure email notification preferences.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail } from "lucide-react";

interface EmailNotificationsSectionProps {
  emailOnSyncFailure: boolean;
  emailWeeklySummary: boolean;
  adminEmail: string | null;
}

export function EmailNotificationsSection({
  emailOnSyncFailure: initialSyncFailure,
  emailWeeklySummary: initialWeeklySummary,
  adminEmail: initialAdminEmail,
}: EmailNotificationsSectionProps) {
  const router = useRouter();
  const [emailOnSyncFailure, setEmailOnSyncFailure] = useState(initialSyncFailure);
  const [emailWeeklySummary, setEmailWeeklySummary] = useState(initialWeeklySummary);
  const [adminEmail, setAdminEmail] = useState(initialAdminEmail || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const hasChanges =
    emailOnSyncFailure !== initialSyncFailure ||
    emailWeeklySummary !== initialWeeklySummary ||
    adminEmail !== (initialAdminEmail || "");

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailOnSyncFailure,
          emailWeeklySummary,
          adminEmail: adminEmail || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save");
      }

      setMessage({ type: "success", text: "Notification settings saved!" });
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Configure when and where to send email notifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="syncFailure">Sync Failure Alerts</Label>
              <p className="text-xs text-muted-foreground">
                Receive email when automated sync fails
              </p>
            </div>
            <Switch
              id="syncFailure"
              checked={emailOnSyncFailure}
              onCheckedChange={setEmailOnSyncFailure}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="weeklySummary">Weekly Summary</Label>
              <p className="text-xs text-muted-foreground">
                Receive weekly revenue summary email (Coming soon)
              </p>
            </div>
            <Switch
              id="weeklySummary"
              checked={emailWeeklySummary}
              onCheckedChange={setEmailWeeklySummary}
              disabled // Not implemented yet
            />
          </div>
        </div>

        {/* Admin Email Override */}
        <div className="space-y-2">
          <Label htmlFor="adminEmail">Admin Email (Override)</Label>
          <Input
            id="adminEmail"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="Leave empty to use your account email"
          />
          <p className="text-xs text-muted-foreground">
            Override the default admin email for notifications. Leave empty to use your account email.
          </p>
        </div>

        {/* Message */}
        {message && (
          <p
            className={`text-sm ${
              message.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {message.text}
          </p>
        )}

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Notification Settings
        </Button>
      </CardContent>
    </Card>
  );
}

