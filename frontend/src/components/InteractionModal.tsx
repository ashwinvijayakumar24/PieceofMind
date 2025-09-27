import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, AlertCircle, ExternalLink, Clipboard } from "lucide-react";
import { Interaction } from "@/types";

interface InteractionModalProps {
  interaction: Interaction | null;
  isOpen: boolean;
  onClose: () => void;
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
      return <CheckCircle className="h-5 w-5" />;
    case 2:
      return <AlertCircle className="h-5 w-5" />;
    case 3:
      return <AlertTriangle className="h-5 w-5" />;
    default:
      return <AlertCircle className="h-5 w-5" />;
  }
};

export const InteractionModal = ({ interaction, isOpen, onClose }: InteractionModalProps) => {
  if (!interaction) return null;

  const handleAddToChart = () => {
    // Placeholder for adding to patient chart
    console.log("Adding interaction to patient chart:", interaction);
    // In real app, this would make API call to save to patient's record
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            {getSeverityIcon(interaction.severity)}
            <div>
              <DialogTitle className="text-xl">
                {interaction.drug_a_name} + {interaction.drug_b_name}
              </DialogTitle>
              <DialogDescription className="flex items-center space-x-2 mt-1">
                <span>Drug-Drug Interaction</span>
                <Badge 
                  variant="secondary" 
                  className={`text-${getSeverityColor(interaction.severity)} border-${getSeverityColor(interaction.severity)}`}
                >
                  {getSeverityLabel(interaction.severity)}
                </Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Clinical Significance</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {interaction.description}
            </p>
          </div>

          <Separator />

          {/* Mechanism */}
          {interaction.mechanism && (
            <>
              <div>
                <h3 className="font-semibold mb-2">Mechanism of Interaction</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {interaction.mechanism}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Recommended Action */}
          {interaction.recommended_action && (
            <>
              <div>
                <h3 className="font-semibold mb-2 text-primary">Clinical Recommendation</h3>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm leading-relaxed">
                    {interaction.recommended_action}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Source Reference */}
          {interaction.source_ref && (
            <div>
              <h3 className="font-semibold mb-2">Reference</h3>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  {interaction.source_ref}
                </span>
                <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                  <ExternalLink className="h-4 w-4" />
                  <span>View Source</span>
                </Button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddToChart}
                className="flex items-center space-x-2"
              >
                <Clipboard className="h-4 w-4" />
                <span>Add to Chart</span>
              </Button>
            </div>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};