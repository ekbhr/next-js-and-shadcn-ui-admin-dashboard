"use client";

/**
 * Domain Assignment Table
 * 
 * Displays all domain assignments with inline editing of revShare.
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
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface DomainAssignment {
  id: string;
  domain: string | null;
  network: string | null;
  revShare: number;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DomainTableProps {
  assignments: DomainAssignment[];
}

export function DomainTable({ assignments }: DomainTableProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleEdit = (assignment: DomainAssignment) => {
    setEditingId(assignment.id);
    setEditValue(assignment.revShare.toString());
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleSave = async (id: string) => {
    const newRevShare = parseFloat(editValue);
    if (isNaN(newRevShare) || newRevShare < 0 || newRevShare > 100) {
      alert("RevShare must be between 0 and 100");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/domains/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, revShare: newRevShare }),
      });

      if (!response.ok) {
        throw new Error("Failed to update");
      }

      setEditingId(null);
      router.refresh();
    } catch (error) {
      console.error("Error updating revShare:", error);
      alert("Failed to update revShare");
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
            No domains found. Click &quot;Sync Domains&quot; to fetch domains from Sedo.
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
              <TableHead className="text-center">RevShare %</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell className="font-medium">
                  {assignment.domain || "All Domains"}
                </TableCell>
                <TableCell>
                  <Badge className={getNetworkColor(assignment.network)}>
                    {(assignment.network || "all").toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  {editingId === assignment.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-20 text-center"
                        autoFocus
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
                <TableCell className="text-muted-foreground">
                  {formatDate(assignment.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  {editingId === assignment.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSave(assignment.id)}
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

