import { Model } from "../../../types/cemi";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { RunTable } from "../shared/RunTable";
import { KeyValueViewer } from "../shared/KeyValueViewer";

interface ModelDetailPageProps {
  model: Model;
  onRunClick?: (run: any) => void;
}

export function ModelDetailPage({ model, onRunClick }: ModelDetailPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-semibold text-[#0F3455]">{model.name}</h1>
          <div className="flex gap-2">
            {model.ptq_ready && (
              <Badge variant="secondary">PTQ Ready</Badge>
            )}
            {model.qat_ready && (
              <Badge variant="default">QAT Ready</Badge>
            )}
          </div>
        </div>
        {model.family && (
          <p className="text-[#0F3455]/70">Family: {model.family}</p>
        )}
        {model.description && (
          <p className="text-[#0F3455]/70 mt-2">{model.description}</p>
        )}
      </div>

      {model.runs && model.runs.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Runs Producing This Model</CardTitle>
            </CardHeader>
            <CardContent>
              <RunTable runs={model.runs} onRunClick={onRunClick} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-[#0F3455]/70">
            No runs have produced variants of this model yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}





