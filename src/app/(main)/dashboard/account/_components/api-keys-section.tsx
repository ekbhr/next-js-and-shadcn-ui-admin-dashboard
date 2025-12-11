"use client";

/**
 * API Keys Section
 * 
 * Allows users to manage their API keys for programmatic access.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Clock, Activity, AlertTriangle } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: string | null;
  requestCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyVisible, setNewKeyVisible] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch API keys
  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/account/api-keys");
      const data = await res.json();
      if (data.success) {
        setKeys(data.keys);
      }
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    } finally {
      setLoading(false);
    }
  };

  // Create new API key
  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newKeyName,
          scopes: ["reports:read", "reports:export"],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNewKeyVisible(data.key.rawKey);
        setNewKeyName("");
        fetchKeys();
        toast.success("API key created!");
      } else {
        toast.error(data.error || "Failed to create API key");
      }
    } catch (error) {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  // Copy key to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  // Toggle key active status
  const toggleKey = async (keyId: string) => {
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: keyId, toggleActive: true }),
      });

      if (res.ok) {
        fetchKeys();
        toast.success("API key status updated");
      }
    } catch (error) {
      toast.error("Failed to update API key");
    }
  };

  // Delete key
  const deleteKey = async (keyId: string) => {
    try {
      const res = await fetch(`/api/account/api-keys?id=${keyId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchKeys();
        toast.success("API key deleted");
      }
    } catch (error) {
      toast.error("Failed to delete API key");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Generate API keys for programmatic access to your revenue data
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              {newKeyVisible ? (
                // Show the new key
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      Copy Your API Key
                    </DialogTitle>
                    <DialogDescription>
                      This is the only time you'll see this key. Copy it now and store it securely.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-lg font-mono text-sm break-all">
                      {newKeyVisible}
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={() => copyToClipboard(newKeyVisible)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy to Clipboard
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setNewKeyVisible(null);
                        setDialogOpen(false);
                      }}
                    >
                      Done
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                // Create new key form
                <>
                  <DialogHeader>
                    <DialogTitle>Create API Key</DialogTitle>
                    <DialogDescription>
                      Give your API key a descriptive name to identify it later.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="keyName">Key Name</Label>
                      <Input
                        id="keyName"
                        placeholder="e.g., Production, Testing, My App"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      <p className="font-medium mb-2">Permissions:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Read revenue reports</li>
                        <li>Export reports as CSV</li>
                      </ul>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={creating}>
                      {creating ? "Creating..." : "Create Key"}
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8">
            <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No API Keys</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create an API key to access your revenue data programmatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{key.name}</span>
                    <Badge variant={key.isActive ? "default" : "secondary"}>
                      {key.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="font-mono">{key.keyPrefix}</span>
                    <span className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {key.requestCount.toLocaleString()} requests
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last used: {formatDate(key.lastUsedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={key.isActive}
                    onCheckedChange={() => toggleKey(key.id)}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete API Key?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the API key "{key.name}". 
                          Any applications using this key will stop working.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteKey(key.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API Documentation Link */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Quick Start</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Use your API key to fetch revenue data:
          </p>
          <pre className="p-3 bg-background rounded text-xs overflow-x-auto">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  "https://reporting.revengine.media/api/v1/reports?startDate=2025-01-01"`}
          </pre>
          <Button variant="link" className="px-0 mt-2" asChild>
            <a href="/dashboard/api-docs">View Full Documentation →</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

