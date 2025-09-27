import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, Plus, X } from "lucide-react";
import { Medication } from "@/types";

interface MedicationInputProps {
  medications: Medication[];
  onAddMedication: (medication: Medication) => void;
  onRemoveMedication: (medicationId: string) => void;
}

export const MedicationInput = ({ medications, onAddMedication, onRemoveMedication }: MedicationInputProps) => {
  const [newMedName, setNewMedName] = useState("");
  const [newMedDose, setNewMedDose] = useState("");

  const handleAddMedication = () => {
    if (newMedName.trim() && newMedDose.trim()) {
      const newMedication: Medication = {
        id: `med_${Date.now()}`,
        name: newMedName.trim(),
        dose_form: newMedDose.trim(),
      };
      onAddMedication(newMedication);
      setNewMedName("");
      setNewMedDose("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddMedication();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Pill className="h-5 w-5 text-primary" />
          <CardTitle>Medication Management</CardTitle>
        </div>
        <CardDescription>
          Add or remove medications to check for interactions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            placeholder="Medication name (e.g., Aspirin)"
            value={newMedName}
            onChange={(e) => setNewMedName(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Input
            placeholder="Dose (e.g., 81mg tablet)"
            value={newMedDose}
            onChange={(e) => setNewMedDose(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleAddMedication} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {medications.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 text-sm text-muted-foreground">
              Current Medications ({medications.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {medications.map((medication) => (
                <div
                  key={medication.id}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">{medication.name}</div>
                    <div className="text-xs text-muted-foreground">{medication.dose_form}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveMedication(medication.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};