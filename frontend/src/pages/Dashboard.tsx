import { useState } from "react";
import { PatientSelector } from "@/components/PatientSelector";
import { MedicationInput } from "@/components/MedicationInput";
import { InteractionResults } from "@/components/InteractionResults";
import { InteractionModal } from "@/components/InteractionModal";
import { Header } from "@/components/Header";
import { Patient, Medication, Interaction } from "@/types";

// Mock data - in real app this would come from Supabase
const mockPatients: Patient[] = [
  {
    id: "1",
    name: "John Smith",
    age: 65,
    gender: "male",
    medications: [
      { id: "med1", name: "Warfarin", dose_form: "5mg tablet" },
      { id: "med2", name: "Amiodarone", dose_form: "200mg tablet" },
      { id: "med3", name: "Metformin", dose_form: "500mg tablet" },
    ]
  },
  {
    id: "2",
    name: "Sarah Johnson",
    age: 45,
    gender: "female",
    medications: [
      { id: "med4", name: "Simvastatin", dose_form: "20mg tablet" },
      { id: "med5", name: "Clarithromycin", dose_form: "500mg tablet" },
      { id: "med6", name: "Amlodipine", dose_form: "5mg tablet" },
    ]
  },
  {
    id: "3",
    name: "Robert Davis",
    age: 72,
    gender: "male",
    medications: [
      { id: "med7", name: "Digoxin", dose_form: "0.25mg tablet" },
      { id: "med8", name: "Furosemide", dose_form: "40mg tablet" },
    ]
  }
];

const mockInteractions: Interaction[] = [
  {
    id: "int1",
    drug_a_id: "med1",
    drug_b_id: "med2",
    drug_a_name: "Warfarin",
    drug_b_name: "Amiodarone",
    severity: 3,
    description: "High risk of bleeding due to enhanced anticoagulant effect",
    mechanism: "Amiodarone inhibits CYP2C9 and CYP3A4 enzymes, reducing warfarin metabolism",
    recommended_action: "Monitor INR closely, consider dose reduction of warfarin by 25-50%",
    source_ref: "Clinical Pharmacology & Therapeutics"
  },
  {
    id: "int2",
    drug_a_id: "med4",
    drug_b_id: "med5",
    drug_a_name: "Simvastatin",
    drug_b_name: "Clarithromycin",
    severity: 3,
    description: "Increased risk of myopathy and rhabdomyolysis",
    mechanism: "Clarithromycin inhibits CYP3A4, significantly increasing simvastatin plasma levels",
    recommended_action: "Temporarily discontinue simvastatin during clarithromycin therapy",
    source_ref: "FDA Drug Safety Communication"
  }
];

const Dashboard = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setMedications(patient.medications);
    
    // Check for interactions in this patient's medications
    const patientInteractions = mockInteractions.filter(interaction => 
      patient.medications.some(med => med.id === interaction.drug_a_id || med.id === interaction.drug_b_id)
    );
    setInteractions(patientInteractions);
  };

  const handleAddMedication = (medication: Medication) => {
    const updatedMedications = [...medications, medication];
    setMedications(updatedMedications);
    
    // Recheck interactions with new medication
    // In real app, this would trigger API call to check interactions
    const allInteractions = mockInteractions.filter(interaction =>
      updatedMedications.some(med => med.id === interaction.drug_a_id || med.id === interaction.drug_b_id)
    );
    setInteractions(allInteractions);
  };

  const handleRemoveMedication = (medicationId: string) => {
    const updatedMedications = medications.filter(med => med.id !== medicationId);
    setMedications(updatedMedications);
    
    // Recheck interactions after removing medication
    const remainingInteractions = interactions.filter(interaction =>
      updatedMedications.some(med => med.id === interaction.drug_a_id || med.id === interaction.drug_b_id)
    );
    setInteractions(remainingInteractions);
  };

  return (
    <div className="min-h-screen bg-secondary/20">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <PatientSelector
              patients={mockPatients}
              selectedPatient={selectedPatient}
              onPatientSelect={handlePatientSelect}
            />
            
            <MedicationInput
              medications={medications}
              onAddMedication={handleAddMedication}
              onRemoveMedication={handleRemoveMedication}
            />
          </div>
          
          <div>
            <InteractionResults
              interactions={interactions}
              onInteractionClick={setSelectedInteraction}
            />
          </div>
        </div>
      </main>

      <InteractionModal
        interaction={selectedInteraction}
        isOpen={!!selectedInteraction}
        onClose={() => setSelectedInteraction(null)}
      />
    </div>
  );
};

export default Dashboard;