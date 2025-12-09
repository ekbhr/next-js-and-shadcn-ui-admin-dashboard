"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function TestEmailPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast.success("Test email sent successfully!", {
          description: data.mode === "production" 
            ? `Email ID: ${data.emailId}` 
            : "Check console for email output",
        });
      } else {
        setResult(data);
        toast.error("Failed to send test email", {
          description: data.error || "Unknown error",
        });
      }
    } catch (error) {
      console.error("Test email error:", error);
      toast.error("Failed to send test email", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Test Email Service</CardTitle>
          <CardDescription>
            Test the email sending functionality with Resend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your-email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button onClick={handleTest} disabled={loading} className="w-full">
            {loading ? "Sending..." : "Send Test Email"}
          </Button>

          {result && (
            <div className="mt-4 rounded-lg border p-4">
              <h3 className="mb-2 font-semibold">Result:</h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-4 rounded-lg bg-muted p-4">
            <p className="text-sm font-medium mb-2">Testing Options:</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• Without API key: Email will be logged to console</li>
              <li>• With API key: Real email will be sent via Resend</li>
              <li>• Check your inbox (and spam folder) for the email</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

