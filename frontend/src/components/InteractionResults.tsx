import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, AlertCircle, FileDown } from "lucide-react";
import { Interaction } from "@/types";

interface InteractionResultsProps {
  interactions: Interaction[];
  onInteractionClick: (interaction: Interaction) => void;
}

const getSeverityColor = (severity: number) => {
  switch (severity) {
    case 1:
      return "success";
    case 2:
      return "warning";
    case 3:
      return "danger";
    default:
      return "secondary";
  }
};

const getSeverityLabel = (severity: number) => {
  switch (severity) {
    case 1:
      return "Low Risk";
    case 2:
      return "Moderate Risk";
    case 3:
      return "High Risk";
    default:
      return "Unknown";
  }
};

const getSeverityIcon = (severity: number) => {
  switch (severity) {
    case 1:
      return <CheckCircle className="h-4 w-4" />;
    case 2:
      return <AlertCircle className="h-4 w-4" />;
    case 3:
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

export const InteractionResults = ({ interactions, onInteractionClick }: InteractionResultsProps) => {
  const highRiskCount = interactions.filter(i => i.severity === 3).length;
  const moderateRiskCount = interactions.filter(i => i.severity === 2).length;
  const lowRiskCount = interactions.filter(i => i.severity === 1).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <span>Drug Interactions</span>
            </CardTitle>
            <CardDescription>
              Detected interactions and clinical recommendations
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <FileDown className="h-4 w-4" />
            <span>Export Report</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-danger">{highRiskCount}</div>
            <div className="text-xs text-muted-foreground">High Risk</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{moderateRiskCount}</div>
            <div className="text-xs text-muted-foreground">Moderate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">{lowRiskCount}</div>
            <div className="text-xs text-muted-foreground">Low Risk</div>
          </div>
        </div>

        {/* Interactions List */}
        {interactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
            <p>No drug interactions detected</p>
            <p className="text-sm">Add medications to check for potential interactions</p>
          </div>
        ) : (
          <div className="space-y-3">
            {interactions.map((interaction) => (
              <div
                key={interaction.id}
                className="p-4 border rounded-lg hover:bg-secondary/20 cursor-pointer transition-colors"
                onClick={() => onInteractionClick(interaction)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getSeverityIcon(interaction.severity)}
                    <h4 className="font-medium">
                      {interaction.drug_a_name} + {interaction.drug_b_name}
                    </h4>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className={`text-${getSeverityColor(interaction.severity)} border-${getSeverityColor(interaction.severity)}`}
                  >
                    {getSeverityLabel(interaction.severity)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {interaction.description}
                </p>
                <div className="text-xs text-primary">
                  Click for detailed information →
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};