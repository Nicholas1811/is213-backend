import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Package,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import apiClient from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";

interface ApiListing {
  id: number;
  imageUrl: string | null;
  name: string | null;
  description: string | null;
  qty: number;
  unitPriceCents: number | null;
  status: "created" | "processed" | "active" | "sold_out" | "cancelled";
  bestBefore: string | null;
  createdAt: string;
  updatedAt: string;
}

function getStatusBadge(status: ApiListing["status"]) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
    case "sold_out":
      return <Badge variant="secondary" className="text-muted-foreground">Sold Out</Badge>;
    case "created":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Processing</Badge>;
    case "processed":
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Processed</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

async function fetchListings(status?: string): Promise<ApiListing[]> {
  const params = status && status !== "all" ? { status } : {};
  const res = await apiClient.get<ApiListing[]>(ENDPOINTS.LISTINGS, { params });
  return res.data;
}

// ── View Modal ────────────────────────────────────────────────────────────────

function ViewModal({
  listing,
  imageUrl,
  onClose,
}: {
  listing: ApiListing;
  imageUrl: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{listing.name ?? "Untitled Listing"}</DialogTitle>
        </DialogHeader>

        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.name ?? "Listing"}
            className="w-full rounded-lg object-cover max-h-56"
          />
        ) : (
          <div className="w-full h-40 rounded-lg bg-muted flex items-center justify-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}

        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {listing.description ?? <span className="italic">No description yet.</span>}
          </p>
          <Separator />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-muted-foreground">Price</p>
              <p className="font-medium">
                {listing.unitPriceCents != null
                  ? `$${(listing.unitPriceCents / 100).toFixed(2)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Quantity</p>
              <p className="font-medium">{listing.qty}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <div className="mt-0.5">{getStatusBadge(listing.status)}</div>
            </div>
            <div>
              <p className="text-muted-foreground">Best Before</p>
              <p className="font-medium">
                {listing.bestBefore
                  ? new Date(listing.bestBefore).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({
  listing,
  onClose,
  onSaved,
}: {
  listing: ApiListing;
  onClose: () => void;
  onSaved: (updated: ApiListing) => void;
}) {
  const [name, setName] = useState(listing.name ?? "");
  const [description, setDescription] = useState(listing.description ?? "");
  const [qty, setQty] = useState(String(listing.qty));
  const [priceDollars, setPriceDollars] = useState(
    listing.unitPriceCents != null ? (listing.unitPriceCents / 100).toFixed(2) : ""
  );
  const [bestBefore, setBestBefore] = useState(
    listing.bestBefore ? listing.bestBefore.slice(0, 16) : ""
  );
  const [status, setStatus] = useState<ApiListing["status"]>(listing.status);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const parsedQty = qty ? parseInt(qty, 10) : undefined;
      const unitPriceCents = priceDollars ? Math.round(parseFloat(priceDollars) * 100) : undefined;
      const bestBeforeIso = bestBefore ? new Date(bestBefore).toISOString() : undefined;
      const isCancelling = listing.status !== "cancelled" && status === "cancelled";
      const hasNonStatusChanges =
        name !== (listing.name ?? "") ||
        description !== (listing.description ?? "") ||
        qty !== String(listing.qty) ||
        priceDollars !==
          (listing.unitPriceCents != null ? (listing.unitPriceCents / 100).toFixed(2) : "") ||
        bestBefore !== (listing.bestBefore ? listing.bestBefore.slice(0, 16) : "");

      if (isCancelling) {
        if (hasNonStatusChanges) {
          await apiClient.patch<ApiListing>(
            `${ENDPOINTS.LISTINGS}/${listing.id}`,
            {
              name: name || undefined,
              description: description || undefined,
              qty: parsedQty,
              unitPriceCents,
              bestBefore: bestBeforeIso,
            }
          );
        }

        const cancelRes = await apiClient.post<ApiListing>(
          ENDPOINTS.CANCEL_LISTING(String(listing.id))
        );
        onSaved(cancelRes.data);
        return;
      }

      const res = await apiClient.patch<ApiListing>(`${ENDPOINTS.LISTINGS}/${listing.id}`, {
        name: name || undefined,
        description: description || undefined,
        qty: parsedQty,
        unitPriceCents,
        bestBefore: bestBeforeIso,
        status,
      });
      onSaved(res.data);
    } catch (err) {
      console.error("Failed to update listing", err);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Listing</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Price ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Best Before</Label>
            <Input
              type="datetime-local"
              value={bestBefore}
              onChange={(e) => setBestBefore(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ApiListing["status"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sold_out">Sold Out</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="created">Processing</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteModal({
  listing,
  onClose,
  onDeleted,
}: {
  listing: ApiListing;
  onClose: () => void;
  onDeleted: (id: number) => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await apiClient.delete(`${ENDPOINTS.LISTINGS}/${listing.id}`);
      onDeleted(listing.id);
    } catch (err) {
      console.error("Failed to delete listing", err);
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete listing?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{listing.name ?? "This listing"}</span> will
          be permanently deleted. This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MyListings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewListing, setViewListing] = useState<ApiListing | null>(null);
  const [editListing, setEditListing] = useState<ApiListing | null>(null);
  const [deleteListing, setDeleteListing] = useState<ApiListing | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetchListings(statusFilter)
      .then((data) => {
        setListings(data);
      })
      .catch((err) => console.error("Failed to load listings", err))
      .finally(() => setIsLoading(false));
  }, [statusFilter]);

  const filteredListings = listings.filter((l) =>
    (l.name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleSaved(updated: ApiListing) {
    setListings((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setEditListing(null);
  }

  function handleDeleted(id: number) {
    setListings((prev) => prev.filter((l) => l.id !== id));
    setDeleteListing(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Listings</h1>
          <p className="text-muted-foreground mt-1">Manage your meal listings</p>
        </div>
        <Link to="/seller/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Listing
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="sold_out">Sold Out</SelectItem>
            <SelectItem value="created">Processing</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {isLoading ? "Loading..." : `${filteredListings.length} listing${filteredListings.length !== 1 ? "s" : ""}`}
      </p>

      {/* Listings Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredListings.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Photo</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Best Before</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell>
                      {listing.imageUrl ? (
                        <img
                          src={listing.imageUrl}
                          alt={listing.name ?? "Listing"}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {listing.name ?? <span className="text-muted-foreground italic">Untitled</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {listing.unitPriceCents != null ? (
                        <span className="font-semibold text-primary">
                          ${(listing.unitPriceCents / 100).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{listing.qty}</TableCell>
                    <TableCell>{getStatusBadge(listing.status)}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {listing.bestBefore
                        ? new Date(listing.bestBefore).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => setViewListing(listing)}
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => setEditListing(listing)}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-destructive"
                            onClick={() => setDeleteListing(listing)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-col items-center justify-center py-8">
              <Package className="h-12 w-12 text-muted-foreground/50" />
              <CardTitle className="mt-4 text-lg">No listings found</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filter"
                  : "Create your first listing to get started"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Link to="/seller/create" className="mt-4">
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Listing
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Modals */}
      {viewListing && (
        <ViewModal
          listing={viewListing}
          imageUrl={viewListing.imageUrl}
          onClose={() => setViewListing(null)}
        />
      )}
      {editListing && (
        <EditModal
          listing={editListing}
          onClose={() => setEditListing(null)}
          onSaved={handleSaved}
        />
      )}
      {deleteListing && (
        <DeleteModal
          listing={deleteListing}
          onClose={() => setDeleteListing(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
