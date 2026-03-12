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

// Mock data
const MOCK_TRANSACTIONS = [
  {
    id: "txn-1",
    amount: 10,
    type: "earned_meal_photo" as const,
    description: "Meal photo submission",
    createdAt: "2025-03-05T10:30:00Z",
  },
  {
    id: "txn-2",
    amount: 5,
    type: "earned_order_complete" as const,
    description: "Order #order-1 completed",
    createdAt: "2025-03-04T15:00:00Z",
  },
  {
    id: "txn-3",
    amount: -50,
    type: "redeemed" as const,
    description: "Redeemed for order #order-2",
    createdAt: "2025-03-03T12:00:00Z",
  },
  {
    id: "txn-4",
    amount: 10,
    type: "earned_meal_photo" as const,
    description: "Meal photo submission",
    createdAt: "2025-03-02T09:00:00Z",
  },
  {
    id: "txn-5",
    amount: 5,
    type: "earned_order_complete" as const,
    description: "Order #order-3 completed",
    createdAt: "2025-03-01T18:00:00Z",
  },
];

const typeConfig = {
  earned_meal_photo: { label: "Meal Photo", icon: Camera, color: "text-primary" },
  earned_order_complete: { label: "Order Bonus", icon: ShoppingBag, color: "text-primary" },
  redeemed: { label: "Redeemed", icon: TrendingUp, color: "text-destructive" },
};

export default function PointsHistory() {
  const balance = usePointsStore((s) => s.balance);

  const totalEarned = MOCK_TRANSACTIONS.filter((t) => t.amount > 0).reduce(
    (sum, t) => sum + t.amount,
    0
  );
  const totalRedeemed = MOCK_TRANSACTIONS.filter((t) => t.amount < 0).reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Points</h1>
        <p className="text-muted-foreground mt-1">
          Track your earnings and redemptions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Coins className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {balance.toLocaleString()}
                </p>
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

      {/* Redemption Info */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-4">
          <p className="text-sm">
            <span className="font-medium">{POINTS_TO_DOLLAR_RATIO} points = $1.00 discount</span>
            {" "}— You can apply up to{" "}
            <span className="font-medium text-primary">
              ${(balance / POINTS_TO_DOLLAR_RATIO).toFixed(2)}
            </span>{" "}
            off your next order.
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Transaction History */}
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
              {MOCK_TRANSACTIONS.map((txn) => {
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
                    <TableCell className="text-muted-foreground">
                      {txn.description}
                    </TableCell>
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
