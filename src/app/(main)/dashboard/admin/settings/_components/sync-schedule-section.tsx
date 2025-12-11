"use client";

/**
 * Sync Schedule Section
 * 
 * Display cron job schedules (read-only, configured in Vercel).
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getNetworkColors, getNetworkName } from "@/lib/ad-networks";

interface ScheduleItem {
  network: string;
  cron: string;
  utcTime: string;
  localTime: string;
  description: string;
}

const schedules: ScheduleItem[] = [
  {
    network: "sedo",
    cron: "0 5 * * *",
    utcTime: "5:00 AM UTC",
    localTime: "9:00 AM Dubai (GST)",
    description: "Daily revenue sync",
  },
  {
    network: "yandex",
    cron: "0 6 * * *",
    utcTime: "6:00 AM UTC",
    localTime: "10:00 AM Dubai (GST)",
    description: "Daily revenue sync",
  },
];

export function SyncScheduleSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Sync Schedule
        </CardTitle>
        <CardDescription>
          Automated data synchronization schedules.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {schedules.map((schedule) => {
            const colors = getNetworkColors(schedule.network);

            return (
              <div
                key={schedule.network}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-4">
                  <Badge className={colors.badge}>
                    {getNetworkName(schedule.network, true)}
                  </Badge>
                  <div>
                    <p className="font-medium">{schedule.description}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {schedule.utcTime}
                      </span>
                      <span className="text-muted-foreground/60">
                        ({schedule.localTime})
                      </span>
                    </div>
                  </div>
                </div>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                  {schedule.cron}
                </code>
              </div>
            );
          })}
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Cron schedules are configured in <code className="text-xs bg-muted px-1 rounded">vercel.json</code>. 
            To modify schedules, update the cron configuration and redeploy.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

