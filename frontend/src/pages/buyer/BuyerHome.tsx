import { Link } from "react-router-dom";
import { ShoppingBag, Camera, Coins, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PointsBadge from "@/components/common/PointsBadge";
import { usePointsStore } from "@/store/pointsStore";
import { useAuthStore } from "@/store/authStore";

export default function BuyerHome() {
  const balance = usePointsStore((s) => s.balance);
  const userName = useAuthStore((s) => s.userName);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back{userName ? `, ${userName}` : ""}!
          </h1>
          <p className="text-muted-foreground mt-1">
            What would you like to do today?
          </p>
        </div>
        <PointsBadge points={balance} className="text-base px-4 py-2" />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Browse Meals */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-2">
              <ShoppingBag className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Browse Meals</CardTitle>
            <CardDescription>
              Discover discounted meals from local sellers and save while reducing food waste.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/buyer/marketplace">
              <Button className="w-full gap-2">
                Go to Marketplace
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Earn Points */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-2">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Earn Points</CardTitle>
            <CardDescription>
              Take photos of your meals before and after eating to earn points you can redeem for discounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/buyer/earn-points">
              <Button variant="outline" className="w-full gap-2">
                Start Earning
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Points Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Points</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-primary">{balance.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Available points</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">${(balance / 100).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Discount value</p>
            </div>
            <Link to="/buyer/points">
              <Button variant="outline" size="sm" className="gap-1">
                View History
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
