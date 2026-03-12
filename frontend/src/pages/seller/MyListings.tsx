import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ListingStatus } from "@/lib/constants";

// Mock data — will be replaced with TanStack Query hook
const MOCK_LISTINGS = [
  {
    id: "1",
    name: "Grilled Chicken Salad",
    category: "Salads",
    originalPrice: 15.9,
    discountedPrice: 8.9,
    quantity: 5,
    status: ListingStatus.ACTIVE,
    createdAt: "2025-03-01T10:00:00Z",
  },
  {
    id: "2",
    name: "Pasta Carbonara",
    category: "Pasta",
    originalPrice: 18.5,
    discountedPrice: 10.5,
    quantity: 0,
    status: ListingStatus.SOLD_OUT,
    createdAt: "2025-03-01T09:30:00Z",
  },
  {
    id: "3",
    name: "Sushi Platter",
    category: "Japanese",
    originalPrice: 25.0,
    discountedPrice: 14.0,
    quantity: 2,
    status: ListingStatus.ACTIVE,
    createdAt: "2025-02-28T15:00:00Z",
  },
  {
    id: "4",
    name: "AI-Generated Thai Bowl",
    category: "Thai",
    originalPrice: 16.5,
    discountedPrice: 9.0,
    quantity: 3,
    status: ListingStatus.AI_PROCESSING,
    createdAt: "2025-03-02T08:00:00Z",
  },
  {
    id: "5",
    name: "Veggie Wrap Draft",
    category: "Wraps",
    originalPrice: 12.0,
    discountedPrice: 6.5,
    quantity: 10,
    status: ListingStatus.DRAFT,
    createdAt: "2025-03-02T12:00:00Z",
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case ListingStatus.ACTIVE:
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
    case ListingStatus.SOLD_OUT:
      return <Badge variant="secondary" className="text-muted-foreground">Sold Out</Badge>;
    case ListingStatus.AI_PROCESSING:
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">AI Processing</Badge>;
    case ListingStatus.DRAFT:
      return <Badge variant="outline">Draft</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function MyListings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredListings = MOCK_LISTINGS.filter((listing) => {
    const matchesSearch = listing.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || listing.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Listings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your meal listings
          </p>
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
            <SelectItem value={ListingStatus.ACTIVE}>Active</SelectItem>
            <SelectItem value={ListingStatus.SOLD_OUT}>Sold Out</SelectItem>
            <SelectItem value={ListingStatus.AI_PROCESSING}>AI Processing</SelectItem>
            <SelectItem value={ListingStatus.DRAFT}>Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredListings.length} listing{filteredListings.length !== 1 ? "s" : ""}
      </p>

      {/* Listings Table */}
      {filteredListings.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.map((listing) => (
                  <TableRow key={listing.id}>
                    <TableCell className="font-medium">
                      {listing.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {listing.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <span className="font-semibold text-primary">
                          ${listing.discountedPrice.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground line-through ml-1">
                          ${listing.originalPrice.toFixed(2)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {listing.quantity}
                    </TableCell>
                    <TableCell>{getStatusBadge(listing.status)}</TableCell>
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
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Eye className="h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer text-destructive">
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
    </div>
  );
}
