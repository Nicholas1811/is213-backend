import { useEffect, useMemo, useState } from "react";
import { Coins, Camera, ShoppingBag, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { usePointsStore } from "@/store/pointsStore";
import { POINTS_TO_DOLLAR_RATIO } from "@/lib/constants";
import { getPointsHistory } from "@/api/pointsEndpoints";
import type { PointTransaction } from "@/api/types/point";

const typeConfig: Record<
  PointTransaction["type"],
  { label: string; icon: typeof Camera; color: string }
> = {
  earned_meal_photo: { label: "Meal Photo", icon: Camera, color: "text-primary" },
  earned_order_complete: { label: "Order Bonus", icon: ShoppingBag, color: "text-primary" },
  redeemed: { label: "Redeemed", icon: TrendingUp, color: "text-destructive" },
};

export default function PointsHistory() {
  const balance = usePointsStore((s) => s.balance);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadTransactions() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getPointsHistory("temp-user-id");
        if (mounted) {
          const sorted = [...data].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setTransactions(sorted);
        }
      } catch (loadError) {
        console.error("Failed to load points history", loadError);
        if (mounted) {
          setError("Failed to load point transactions.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTransactions();

    return () => {
      mounted = false;
    };
  }, []);

  const totalEarned = useMemo(
    () => transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );
  const totalRedeemed = useMemo(
    () => transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
    [transactions]
  );
  const fallbackBalance = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const displayedBalance = balance !== 0 ? balance : fallbackBalance;
  const redemptionTiers = useMemo(
    () =>
      Object.entries(POINTS_TO_DOLLAR_RATIO)
        .map(([points, dollars]) => ({ points: Number(points), dollars }))
        .sort((a, b) => a.points - b.points),
    []
  );
  const baseTier = redemptionTiers[0] ?? { points: 100, dollars: 1 };
  const estimatedDiscount = (displayedBalance / baseTier.points) * baseTier.dollars;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Points</h1>
        <p className="text-muted-foreground mt-1">Track your earnings and redemptions</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{displayedBalance.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Available Points</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalEarned}</p>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <ShoppingBag className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRedeemed}</p>
                <p className="text-xs text-muted-foreground">Total Redeemed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <p className="text-sm">
            <span className="font-medium">
              {baseTier.points} points = ${baseTier.dollars.toFixed(2)} discount
            </span>
            {" "}
            - You can apply up to <span className="font-medium text-primary">${estimatedDiscount.toFixed(2)}</span> off your next order.
          </p>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Loading transactions...
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && error && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading && !error && transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                !error &&
                transactions.map((txn) => {
                  const config = typeConfig[txn.type];
                  const TxnIcon = config.icon;

                  return (
                    <TableRow key={txn.id}>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <TxnIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{txn.description}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${txn.amount > 0 ? "text-primary" : "text-destructive"}`}>
                          {txn.amount > 0 ? "+" : ""}
                          {txn.amount}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(txn.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
