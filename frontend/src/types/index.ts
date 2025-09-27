export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  medications: Medication[];
}

export interface Medication {
  id: string;
  name: string;
  dose_form: string;
}

export interface Interaction {
  id: string;
  drug_a_id: string;
  drug_b_id: string;
  drug_a_name: string;
  drug_b_name: string;
  severity: number; // 1=low, 2=moderate, 3=high
  description: string;
  mechanism?: string;
  recommended_action?: string;
  source_ref?: string;
}