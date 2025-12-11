"use client";

/**
 * Domain Assignment Table
 * 
 * Displays all domain assignments with user assignment and revShare editing.
 * One domain = One user
 */

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Check, X, Loader2, User } from "lucide-react";
import { useRouter } from "next/navigation";

interface DomainAssignment {
  id: string;
  domain: string;
  network: string;
  revShare: number;
  isActive: boolean;
  notes: string | null;
  userId: string;
  userName: string | null;
  userEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface DomainTableProps {
  assignments: DomainAssignment[];
  users: UserOption[];
}

export function DomainTable({ assignments, users }: DomainTableProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRevShare, setEditRevShare] = useState<string>("");
  const [editUserId, setEditUserId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleEdit = (assignment: DomainAssignment) => {
    setEditingId(assignment.id);
    setEditRevShare(assignment.revShare.toString());
    setEditUserId(assignment.userId);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditRevShare("");
    setEditUserId("");
  };

  const handleSave = async (assignment: DomainAssignment) => {
    const newRevShare = parseFloat(editRevShare);
    if (isNaN(newRevShare) || newRevShare < 0 || newRevShare > 100) {
      alert("RevShare must be between 0 and 100");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/domains/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assignment.id,
          revShare: newRevShare,
          userId: editUserId,
          domain: assignment.domain,
          network: assignment.network,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }

      setEditingId(null);
      router.refresh();
    } catch (error) {
      console.error("Error updating assignment:", error);
      alert(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const getNetworkColor = (network: string | null) => {
    switch (network?.toLowerCase()) {
      case "sedo":
        return "bg-blue-500";
      case "yandex":
        return "bg-red-500";
      case "google":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Domains</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No domains found. Click &quot;Sync Domains&quot; to fetch domains from all networks.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domains ({assignments.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-center">RevShare %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell className="font-medium">
                  {assignment.domain}
                </TableCell>
                <TableCell>
                  <Badge className={getNetworkColor(assignment.network)}>
                    {assignment.network.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  {editingId === assignment.id ? (
                    <Select
                      value={editUserId}
                      onValueChange={setEditUserId}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <span className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {user.name || user.email}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{assignment.userName || assignment.userEmail}</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {editingId === assignment.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={editRevShare}
                        onChange={(e) => setEditRevShare(e.target.value)}
                        className="w-20 text-center"
                      />
                      <span>%</span>
                    </div>
                  ) : (
                    <span className="font-semibold text-green-600">
                      {assignment.revShare}%
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={assignment.isActive ? "default" : "secondary"}>
                    {assignment.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {editingId === assignment.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSave(assignment)}
                        disabled={saving}
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancel}
                        disabled={saving}
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(assignment)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
