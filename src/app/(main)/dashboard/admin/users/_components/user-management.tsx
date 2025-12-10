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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Globe, User, Shield } from "lucide-react";

interface DomainAssignment {
  id: string;
  domain: string | null;
  network: string | null;
  revShare: number;
}

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  createdAt: Date;
  domainAssignments: DomainAssignment[];
}

interface AvailableDomain {
  domain: string;
  network: string;
}

interface UserManagementProps {
  users: UserData[];
  availableDomains: AvailableDomain[];
}

export function UserManagement({ users, availableDomains }: UserManagementProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState("");
  const [revShare, setRevShare] = useState("80");

  const handleAssignDomain = async () => {
    if (!selectedUser || !selectedDomain) return;

    setLoading("assign");
    try {
      const response = await fetch("/api/admin/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          domain: selectedDomain,
          network: "sedo",
          revShare: parseInt(revShare),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign domain");
      }

      setIsAssignOpen(false);
      setSelectedDomain("");
      setRevShare("80");
      router.refresh();
    } catch (error) {
      console.error("Failed to assign domain:", error);
      alert(error instanceof Error ? error.message : "Failed to assign domain");
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to remove this domain assignment?")) return;

    setLoading(assignmentId);
    try {
      const response = await fetch("/api/admin/domains", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove assignment");
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to remove assignment:", error);
      alert(error instanceof Error ? error.message : "Failed to remove assignment");
    } finally {
      setLoading(null);
    }
  };

  // Get domains that are not yet assigned to the selected user
  const getUnassignedDomains = () => {
    if (!selectedUser) return availableDomains;
    const assignedDomains = selectedUser.domainAssignments.map((a) => a.domain);
    return availableDomains.filter((d) => !assignedDomains.includes(d.domain));
  };

  return (
    <div className="space-y-6">
      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Users ({users.length})
          </CardTitle>
          <CardDescription>
            Click on a user to manage their domain assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Domains</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className={selectedUser?.id === user.id ? "bg-muted/50" : ""}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name || "No name"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                      className="gap-1"
                    >
                      {user.role === "admin" && <Shield className="h-3 w-3" />}
                      {user.role || "user"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {user.domainAssignments.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          No domains
                        </span>
                      ) : (
                        <>
                          {user.domainAssignments.slice(0, 3).map((a) => (
                            <Badge key={a.id} variant="outline" className="text-xs">
                              {a.domain}
                            </Badge>
                          ))}
                          {user.domainAssignments.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.domainAssignments.length - 3} more
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog
                      open={isAssignOpen && selectedUser?.id === user.id}
                      onOpenChange={(open) => {
                        setIsAssignOpen(open);
                        if (open) setSelectedUser(user);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Assign Domain
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Domain to {user.name || user.email}</DialogTitle>
                          <DialogDescription>
                            Select a domain to assign to this user. They will be able to see
                            revenue data for this domain.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="domain">Domain</Label>
                            <Select
                              value={selectedDomain}
                              onValueChange={setSelectedDomain}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a domain" />
                              </SelectTrigger>
                              <SelectContent>
                                {getUnassignedDomains().length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    No available domains
                                  </SelectItem>
                                ) : (
                                  getUnassignedDomains().map((d) => (
                                    <SelectItem key={d.domain} value={d.domain}>
                                      {d.domain}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="revShare">Revenue Share (%)</Label>
                            <Input
                              id="revShare"
                              type="number"
                              min="0"
                              max="100"
                              value={revShare}
                              onChange={(e) => setRevShare(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Percentage of gross revenue the user receives
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setIsAssignOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleAssignDomain}
                            disabled={!selectedDomain || loading === "assign"}
                          >
                            {loading === "assign" && (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            )}
                            Assign Domain
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Domain Assignments by User */}
      {users.filter((u) => u.domainAssignments.length > 0).map((user) => (
        <Card key={user.id}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-4 w-4" />
              {user.name || user.email}&apos;s Domains
              <Badge variant="secondary" className="ml-2">
                {user.domainAssignments.length} domain{user.domainAssignments.length !== 1 ? "s" : ""}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Rev Share</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.domainAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.domain}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {assignment.network?.toUpperCase() || "SEDO"}
                      </Badge>
                    </TableCell>
                    <TableCell>{assignment.revShare}%</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                        disabled={loading === assignment.id}
                      >
                        {loading === assignment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Empty state if no assignments */}
      {users.every((u) => u.domainAssignments.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Domain Assignments</h3>
            <p className="text-muted-foreground text-center max-w-md">
              No domains have been assigned to users yet. Click &quot;Assign Domain&quot; on a
              user to give them access to specific domain data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

