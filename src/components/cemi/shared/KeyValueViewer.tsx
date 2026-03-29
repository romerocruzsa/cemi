import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";
import { Parameter } from "../../../types/cemi";

interface KeyValueViewerProps {
  title?: string;
  data: Parameter[] | Record<string, string | number | boolean>;
  className?: string;
}

export function KeyValueViewer({ title, data, className }: KeyValueViewerProps) {
  // Convert Record to Parameter[] if needed
  const params: Parameter[] = Array.isArray(data)
    ? data
    : Object.entries(data).map(([key, value]) => ({
        key,
        value: String(value),
      }));

  return (
    <Card className={className}>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {params.map((param) => (
              <TableRow key={param.key}>
                <TableCell className="font-medium">{param.key}</TableCell>
                <TableCell className="font-mono text-sm">
                  {String(param.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}



