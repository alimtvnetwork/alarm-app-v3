/**
 * StatCard — Small metric card showing a label and value.
 */

import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
}

const StatCard = ({ label, value }: StatCardProps) => (
  <Card>
    <CardContent className="flex flex-col items-center p-4">
      <span className="text-2xl font-heading font-bold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground font-body">{label}</span>
    </CardContent>
  </Card>
);

export default StatCard;
