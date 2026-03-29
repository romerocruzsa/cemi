import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { ReactNode } from "react";
import { cn } from "../../ui/utils";

interface ChartCardProps {
  title: string;
  description: string;
  chart: ReactNode;
  className?: string;
}

export function ChartCard({ title, description, chart, className }: ChartCardProps) {
  return (
    <Card className={cn("rounded-lg overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{chart}</CardContent>
    </Card>
  );
}





