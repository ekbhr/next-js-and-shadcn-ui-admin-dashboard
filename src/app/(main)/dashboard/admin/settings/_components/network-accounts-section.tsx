"use client";

/**
 * Network Accounts Section
 * 
 * Manage multiple ad network accounts (Sedo, Yandex, etc.)
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, Plus, Key, Trash2, Star, Edit, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { getNetworkColors, getNetworkName } from "@/lib/ad-networks";

interface NetworkAccount {
  id: string;
  network: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  domainCount: number;
}

export function NetworkAccountsSection() {
  const [accounts, setAccounts] = useState<NetworkAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<NetworkAccount | null>(null);
  const [showPasswords, setShowPasswords] = useState(false);

  // Form state
  const [formNetwork, setFormNetwork] = useState<"sedo" | "yandex">("sedo");
  const [formName, setFormName] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Sedo credentials
  const [sedoPartnerId, setSedoPartnerId] = useState("");
  const [sedoSignKey, setSedoSignKey] = useState("");
  const [sedoUsername, setSedoUsername] = useState("");
  const [sedoPassword, setSedoPassword] = useState("");

  // Yandex credentials
  const [yandexToken, setYandexToken] = useState("");

  // Load accounts
  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await fetch("/api/admin/network-accounts");
      const data = await response.json();
      if (data.success) {
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormNetwork("sedo");
    setFormName("");
    setFormIsDefault(false);
    setSedoPartnerId("");
    setSedoSignKey("");
    setSedoUsername("");
    setSedoPassword("");
    setYandexToken("");
    setEditingAccount(null);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("Account name is required");
      return;
    }

    // Validate credentials
    if (formNetwork === "sedo") {
      if (!sedoPartnerId || !sedoSignKey || !sedoUsername || !sedoPassword) {
        toast.error("All Sedo credentials are required");
        return;
      }
    } else {
      if (!yandexToken) {
        toast.error("Yandex OAuth token is required");
        return;
      }
    }

    setFormSubmitting(true);

    try {
      const credentials = formNetwork === "sedo"
        ? { partnerId: sedoPartnerId, signKey: sedoSignKey, username: sedoUsername, password: sedoPassword }
        : { oauthToken: yandexToken };

      const response = await fetch("/api/admin/network-accounts", {
        method: editingAccount ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAccount?.id,
          network: formNetwork,
          name: formName,
          credentials,
          isDefault: formIsDefault,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingAccount ? "Account updated" : "Account created");
        setDialogOpen(false);
        resetForm();
        loadAccounts();
      } else {
        toast.error(data.error || "Failed to save account");
      }
    } catch (error) {
      console.error("Error saving account:", error);
      toast.error("Failed to save account");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/network-accounts?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Account deleted");
        loadAccounts();
      } else {
        toast.error(data.error || "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    }
  };

  const handleToggleActive = async (account: NetworkAccount) => {
    try {
      const response = await fetch("/api/admin/network-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: account.id,
          isActive: !account.isActive,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Account ${account.isActive ? "deactivated" : "activated"}`);
        loadAccounts();
      } else {
        toast.error(data.error || "Failed to update account");
      }
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error("Failed to update account");
    }
  };

  const handleSetDefault = async (account: NetworkAccount) => {
    try {
      const response = await fetch("/api/admin/network-accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: account.id,
          isDefault: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${account.name} set as default`);
        loadAccounts();
      } else {
        toast.error(data.error || "Failed to update account");
      }
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error("Failed to update account");
    }
  };

  // Group accounts by network
  const sedoAccounts = accounts.filter(a => a.network === "sedo");
  const yandexAccounts = accounts.filter(a => a.network === "yandex");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Network Accounts
            </CardTitle>
            <CardDescription>
              Manage multiple accounts for each ad network.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? "Edit Account" : "Add Network Account"}
                </DialogTitle>
                <DialogDescription>
                  Enter the credentials for your ad network account. Credentials are encrypted at rest.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Network Selection */}
                <div className="space-y-2">
                  <Label>Network</Label>
                  <Select
                    value={formNetwork}
                    onValueChange={(v) => setFormNetwork(v as "sedo" | "yandex")}
                    disabled={!!editingAccount}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedo">Sedo</SelectItem>
                      <SelectItem value="yandex">Yandex (YAN)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Account Name */}
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    placeholder="e.g., Primary Sedo Account"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>

                {/* Sedo Credentials */}
                {formNetwork === "sedo" && (
                  <>
                    <div className="space-y-2">
                      <Label>Partner ID</Label>
                      <Input
                        placeholder="Enter Partner ID"
                        value={sedoPartnerId}
                        onChange={(e) => setSedoPartnerId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sign Key</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords ? "text" : "password"}
                          placeholder="Enter Sign Key"
                          value={sedoSignKey}
                          onChange={(e) => setSedoSignKey(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowPasswords(!showPasswords)}
                        >
                          {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <Input
                        placeholder="Enter Username"
                        value={sedoUsername}
                        onChange={(e) => setSedoUsername(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <Input
                        type={showPasswords ? "text" : "password"}
                        placeholder="Enter Password"
                        value={sedoPassword}
                        onChange={(e) => setSedoPassword(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Yandex Credentials */}
                {formNetwork === "yandex" && (
                  <div className="space-y-2">
                    <Label>OAuth Token</Label>
                    <div className="relative">
                      <Input
                        type={showPasswords ? "text" : "password"}
                        placeholder="Enter OAuth Token"
                        value={yandexToken}
                        onChange={(e) => setYandexToken(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPasswords(!showPasswords)}
                      >
                        {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Default Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Set as Default</Label>
                    <p className="text-sm text-muted-foreground">
                      Use this account for new domain assignments
                    </p>
                  </div>
                  <Switch
                    checked={formIsDefault}
                    onCheckedChange={setFormIsDefault}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={formSubmitting}>
                  {formSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingAccount ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No network accounts configured.</p>
            <p className="text-sm mt-1">Add an account to enable multi-account sync.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sedo Accounts */}
            {sedoAccounts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Badge className={getNetworkColors("sedo").badge}>
                    {getNetworkName("sedo", true)}
                  </Badge>
                  <span className="text-muted-foreground">({sedoAccounts.length})</span>
                </h4>
                <div className="space-y-2">
                  {sedoAccounts.map((account) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      onToggleActive={() => handleToggleActive(account)}
                      onSetDefault={() => handleSetDefault(account)}
                      onDelete={() => handleDelete(account.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Yandex Accounts */}
            {yandexAccounts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Badge className={getNetworkColors("yandex").badge}>
                    {getNetworkName("yandex", true)}
                  </Badge>
                  <span className="text-muted-foreground">({yandexAccounts.length})</span>
                </h4>
                <div className="space-y-2">
                  {yandexAccounts.map((account) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      onToggleActive={() => handleToggleActive(account)}
                      onSetDefault={() => handleSetDefault(account)}
                      onDelete={() => handleDelete(account.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Account row component
function AccountRow({
  account,
  onToggleActive,
  onSetDefault,
  onDelete,
}: {
  account: NetworkAccount;
  onToggleActive: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{account.name}</span>
            {account.isDefault && (
              <Badge variant="secondary" className="text-xs">
                <Star className="h-3 w-3 mr-1" />
                Default
              </Badge>
            )}
            {!account.isActive && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {account.domainCount} domains assigned
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={account.isActive}
          onCheckedChange={onToggleActive}
          aria-label="Toggle active"
        />
        
        {!account.isDefault && account.isActive && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSetDefault}
            title="Set as default"
          >
            <Star className="h-4 w-4" />
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the account &quot;{account.name}&quot;. Domains assigned to this account will be unassigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

