import { Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PointsBadgeProps {
  points: number;
  className?: string;
}

export default function PointsBadge({ points, className = "" }: PointsBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={`gap-1.5 bg-primary/10 text-primary font-semibold ${className}`}
    >
      <Coins className="h-3.5 w-3.5" />
      {points.toLocaleString()} pts
    </Badge>
  );
}
