/**
 * Top Domains Card
 * 
 * Shows top performing domains by revenue.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe } from "lucide-react";

interface TopDomainsProps {
  domains: Array<{
    domain: string;
    grossRevenue: number;
    netRevenue: number;
  }>;
}

export function TopDomains({ domains }: TopDomainsProps) {
  if (domains.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Top Domains
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <p className="text-muted-foreground">No domain data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Top Domains
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {domains.map((domain, index) => (
            <div key={domain.domain} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium text-sm truncate max-w-[150px]">
                    {domain.domain}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Net: €{domain.netRevenue.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">
                  €{domain.grossRevenue.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

