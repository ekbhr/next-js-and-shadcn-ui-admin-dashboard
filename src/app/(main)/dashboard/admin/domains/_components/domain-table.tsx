"use client";

/**
 * Domain Assignment Table
 * 
 * Displays all domain assignments with user assignment and revShare editing.
 * Supports bulk operations: assign multiple domains to one user at once.
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Check, X, Loader2, User, Users, CheckSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { getNetworkColors, getNetworkName } from "@/lib/ad-networks";

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
  
  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUserId, setBulkUserId] = useState<string>("");
  const [bulkRevShare, setBulkRevShare] = useState<string>("80");
  const [bulkSaving, setBulkSaving] = useState(false);

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

  // Toggle single selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Toggle all selection
  const toggleSelectAll = () => {
    if (selectedIds.size === assignments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assignments.map(a => a.id)));
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
    setBulkUserId("");
    setBulkRevShare("80");
  };

  // Bulk assign
  const handleBulkAssign = async () => {
    if (!bulkUserId) {
      alert("Please select a user to assign domains to");
      return;
    }

    const revShare = parseFloat(bulkRevShare);
    if (isNaN(revShare) || revShare < 0 || revShare > 100) {
      alert("RevShare must be between 0 and 100");
      return;
    }

    setBulkSaving(true);
    try {
      const response = await fetch("/api/domains/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          userId: bulkUserId,
          revShare: revShare,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update");
      }

      clearSelection();
      router.refresh();
      alert(`Successfully updated ${data.updated} domains`);
    } catch (error) {
      console.error("Error bulk updating:", error);
      alert(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setBulkSaving(false);
    }
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

  // Network colors now come from centralized ad-networks.ts

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

  const isAllSelected = assignments.length > 0 && selectedIds.size === assignments.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < assignments.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Domains ({assignments.length})</CardTitle>
            {selectedIds.size > 0 && (
              <CardDescription className="mt-1">
                {selectedIds.size} domain{selectedIds.size > 1 ? 's' : ''} selected
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="mx-6 mb-4 p-4 bg-muted rounded-lg border">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="font-medium">{selectedIds.size} selected</span>
            </div>
            
            <div className="flex-1" />
            
            <div className="flex flex-wrap items-center gap-3">
              <Select value={bulkUserId} onValueChange={setBulkUserId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Assign to user..." />
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
              
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={bulkRevShare}
                  onChange={(e) => setBulkRevShare(e.target.value)}
                  className="w-20 text-center"
                  placeholder="80"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              
              <Button 
                onClick={handleBulkAssign} 
                disabled={bulkSaving || !bulkUserId}
                className="gap-2"
              >
                {bulkSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                Assign Selected
              </Button>
              
              <Button variant="outline" onClick={clearSelection}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = isSomeSelected;
                  }}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
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
              <TableRow 
                key={assignment.id}
                className={selectedIds.has(assignment.id) ? "bg-muted/50" : ""}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(assignment.id)}
                    onCheckedChange={() => toggleSelection(assignment.id)}
                    aria-label={`Select ${assignment.domain}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {assignment.domain}
                </TableCell>
                <TableCell>
                  <Badge className={getNetworkColors(assignment.network).badge}>
                    {getNetworkName(assignment.network, true)}
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
