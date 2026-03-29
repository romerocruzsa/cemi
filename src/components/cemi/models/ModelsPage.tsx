import { Model } from "../../../types/cemi";
import { Card, CardContent } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { EmptyState } from "../shared/EmptyState";
import { Button } from "../../ui/button";
import { Page } from "../layout/Page";
import { CardHeader } from "../layout/CardHeader";

interface ModelsPageProps {
  models: Model[];
  onModelClick?: (model: Model) => void;
}

export function ModelsPage({ models, onModelClick }: ModelsPageProps) {
  return (
    <Page 
      title="Models" 
      subtitle="Registry of model families with PTQ and QAT readiness status"
    >
      {models.length === 0 ? (
        <EmptyState
          title="No models registered"
          description="Models will appear here once runs are created that produce model variants."
        />
      ) : (
        <Card>
          <CardHeader title="Model Registry" />
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map((model) => (
                <Card
                  key={model.id}
                  className="cursor-pointer hover:border-[#D82A2D]/50 transition-colors"
                  onClick={() => onModelClick?.(model)}
                >
                  <CardHeader
                    title={model.name}
                    chip={
                      model.ptq_ready && model.qat_ready
                        ? { label: "PTQ + QAT", variant: "default" }
                        : model.ptq_ready
                        ? { label: "PTQ", variant: "secondary" }
                        : model.qat_ready
                        ? { label: "QAT", variant: "default" }
                        : undefined
                    }
                  />
                  <CardContent>
                    {model.family && (
                      <p className="text-sm text-[#0F3455]/70 mb-4">Family: {model.family}</p>
                    )}
                    {model.description && (
                      <p className="text-sm text-[#0F3455]/70 mb-4">{model.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#0F3455]/70">
                        {model.runs?.length || 0} run{model.runs?.length !== 1 ? "s" : ""}
                      </span>
                      {onModelClick && (
                        <Button variant="ghost" size="sm">
                          View Details →
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </Page>
  );
}
