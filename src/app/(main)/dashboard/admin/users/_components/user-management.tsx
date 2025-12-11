"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, User, Shield, Globe, LogIn, CreditCard, Wallet, Building2, CheckCircle, XCircle } from "lucide-react";

interface PaymentDetails {
  preferredMethod: string;
  paypalEmail: string | null;
  bankAccountName: string | null;
  bankName: string | null;
  iban: string | null;
  swiftBic: string | null;
  bankCurrency: string | null;
  wiseEmail: string | null;
}

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  isActive: boolean;
  createdAt: Date;
  domainCount: number;
  paymentDetails: PaymentDetails | null;
}

interface UserManagementProps {
  users: UserData[];
  currentUserId: string;
}

export function UserManagement({ users, currentUserId }: UserManagementProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setLoading(`role-${userId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update role");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update role");
    } finally {
      setLoading(null);
    }
  };

  const handleActiveToggle = async (userId: string, isActive: boolean) => {
    setLoading(`active-${userId}`);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setLoading(null);
    }
  };

  const handleImpersonate = async (userId: string) => {
    setLoading(`impersonate-${userId}`);
    try {
      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to impersonate user");
      }

      // Redirect to dashboard to see the user's view
      window.location.href = "/dashboard";
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to impersonate user");
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Users ({users.length})
        </CardTitle>
        <CardDescription>
          Manage user roles and account status. Assign domains in the Domain Assignment page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Domains</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-center">Active</TableHead>
              <TableHead className="text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isCurrentUser = user.id === currentUserId;
              const isRoleLoading = loading === `role-${user.id}`;
              const isActiveLoading = loading === `active-${user.id}`;

              return (
                <TableRow
                  key={user.id}
                  className={!user.isActive ? "opacity-50" : ""}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {user.name || "No name"}
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {isRoleLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Select
                          value={user.role || "user"}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">
                              <span className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                User
                              </span>
                            </SelectItem>
                            <SelectItem value="admin">
                              <span className="flex items-center gap-2">
                                <Shield className="h-3 w-3" />
                                Admin
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>{user.domainCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <PaymentInfoDialog user={user} />
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-center">
                    {isActiveLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    ) : (
                      <Switch
                        checked={user.isActive}
                        onCheckedChange={(checked) => handleActiveToggle(user.id, checked)}
                        disabled={isCurrentUser}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {!isCurrentUser && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImpersonate(user.id)}
                        disabled={loading === `impersonate-${user.id}` || !user.isActive}
                        title={!user.isActive ? "Cannot impersonate inactive user" : `Login as ${user.email}`}
                      >
                        {loading === `impersonate-${user.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <LogIn className="h-4 w-4 mr-1" />
                            Login as
                          </>
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Users</h3>
            <p className="text-muted-foreground">No users have registered yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Payment Info Dialog Component
function PaymentInfoDialog({ user }: { user: UserData }) {
  const payment = user.paymentDetails;
  
  const getMethodIcon = (method: string) => {
    switch (method) {
      case "paypal": return <Wallet className="h-4 w-4" />;
      case "bank": return <Building2 className="h-4 w-4" />;
      case "wise": return <CreditCard className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "paypal": return "PayPal";
      case "bank": return "Bank Transfer";
      case "wise": return "Wise";
      default: return method;
    }
  };

  if (!payment) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <XCircle className="h-3 w-3 mr-1" />
        Not set
      </Badge>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1">
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
            {getMethodIcon(payment.preferredMethod)}
            <span className="ml-1">{getMethodLabel(payment.preferredMethod)}</span>
          </Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Details
          </DialogTitle>
          <DialogDescription>
            Payment information for {user.name || user.email}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Preferred Method */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-32">Preferred:</span>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              {getMethodLabel(payment.preferredMethod)}
            </Badge>
          </div>

          {/* PayPal */}
          {payment.paypalEmail && (
            <div className="space-y-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-medium">
                <Wallet className="h-4 w-4" />
                PayPal
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-mono">{payment.paypalEmail}</span>
              </div>
            </div>
          )}

          {/* Bank Transfer */}
          {(payment.iban || payment.bankName) && (
            <div className="space-y-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
                <Building2 className="h-4 w-4" />
                Bank Transfer
              </div>
              <div className="text-sm space-y-1">
                {payment.bankAccountName && (
                  <div>
                    <span className="text-muted-foreground">Account Name:</span>{" "}
                    {payment.bankAccountName}
                  </div>
                )}
                {payment.bankName && (
                  <div>
                    <span className="text-muted-foreground">Bank:</span>{" "}
                    {payment.bankName}
                  </div>
                )}
                {payment.iban && (
                  <div>
                    <span className="text-muted-foreground">IBAN:</span>{" "}
                    <span className="font-mono text-xs">{payment.iban}</span>
                  </div>
                )}
                {payment.swiftBic && (
                  <div>
                    <span className="text-muted-foreground">SWIFT/BIC:</span>{" "}
                    <span className="font-mono">{payment.swiftBic}</span>
                  </div>
                )}
                {payment.bankCurrency && (
                  <div>
                    <span className="text-muted-foreground">Currency:</span>{" "}
                    {payment.bankCurrency}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Wise */}
          {payment.wiseEmail && (
            <div className="space-y-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
                <CreditCard className="h-4 w-4" />
                Wise
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Email:</span>{" "}
                <span className="font-mono">{payment.wiseEmail}</span>
              </div>
            </div>
          )}

          {/* No details filled */}
          {!payment.paypalEmail && !payment.iban && !payment.bankName && !payment.wiseEmail && (
            <div className="text-center py-4 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No payment details provided yet.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
