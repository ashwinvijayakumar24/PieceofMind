import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { Patient } from "@/types";

interface PatientSelectorProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  onPatientSelect: (patient: Patient) => void;
}

export const PatientSelector = ({ patients, selectedPatient, onPatientSelect }: PatientSelectorProps) => {
  const handlePatientChange = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      onPatientSelect(patient);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>Patient Selection</CardTitle>
        </div>
        <CardDescription>
          Select a patient to load their current medications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select onValueChange={handlePatientChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a patient..." />
          </SelectTrigger>
          <SelectContent>
            {patients.map((patient) => (
              <SelectItem key={patient.id} value={patient.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{patient.name}</span>
                  <div className="flex space-x-1 ml-2">
                    <Badge variant="secondary" className="text-xs">
                      {patient.age}y
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {patient.gender}
                    </Badge>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedPatient && (
          <div className="p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{selectedPatient.name}</h3>
              <div className="flex space-x-2">
                <Badge variant="outline">{selectedPatient.age} years old</Badge>
                <Badge variant="outline" className="capitalize">{selectedPatient.gender}</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">Current Medications:</p>
            <div className="space-y-1">
              {selectedPatient.medications.map((med) => (
                <div key={med.id} className="text-sm">
                  <strong>{med.name}</strong> - {med.dose_form}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};