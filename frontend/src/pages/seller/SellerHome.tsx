import { Link } from "react-router-dom";
import { Plus, Package, TrendingUp, DollarSign, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";

// Mock stats — will be replaced with TanStack Query hook
const MOCK_STATS = {
  activeListings: 8,
  totalSold: 45,
  totalRevenue: 523.5,
  averageSavingsPercent: 42,
};

export default function SellerHome() {
  const userName = useAuthStore((s) => s.userName);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Seller Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome back{userName ? `, ${userName}` : ""}! Here's an overview of your listings.
          </p>
        </div>
        <Link to="/seller/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Listing
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Listings
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{MOCK_STATS.activeListings}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sold
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{MOCK_STATS.totalSold}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${MOCK_STATS.totalRevenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Savings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {MOCK_STATS.averageSavingsPercent}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-2">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Create New Listing</CardTitle>
            <CardDescription>
              List your surplus meals manually or use AI to generate listings from photos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/seller/create">
              <Button className="w-full gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-2">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Manage Listings</CardTitle>
            <CardDescription>
              View, edit, and manage all your active and past listings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/seller/listings">
              <Button variant="outline" className="w-full gap-2">
                View Listings
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
