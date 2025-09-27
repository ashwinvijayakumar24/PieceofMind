-- Supabase Schema for Drug-Drug Interaction Assistant

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT,
    conditions TEXT[],
    medications TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create drugs table
CREATE TABLE IF NOT EXISTS drugs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    common_uses TEXT,
    side_effects TEXT[],
    warnings TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create interaction_logs table
CREATE TABLE IF NOT EXISTS interaction_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    checked_meds TEXT[] NOT NULL,
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert sample drugs
INSERT INTO drugs (name, common_uses, side_effects, warnings) VALUES
('Warfarin', 'Anticoagulant for blood clot prevention', '{"Bleeding", "Bruising", "Hair loss"}', '{"Avoid with NSAIDs", "Monitor INR levels", "Avoid alcohol"}'),
('Atorvastatin', 'Cholesterol management', '{"Muscle pain", "Headache", "Nausea"}', '{"Monitor liver function", "Avoid grapefruit"}'),
('Lisinopril', 'ACE inhibitor for blood pressure', '{"Dry cough", "Dizziness", "Fatigue"}', '{"Monitor kidney function", "Avoid potassium supplements"}'),
('Metformin', 'Type 2 diabetes management', '{"Nausea", "Diarrhea", "Metallic taste"}', '{"Monitor kidney function", "Risk of lactic acidosis"}'),
('Ibuprofen', 'NSAID for pain and inflammation', '{"Stomach upset", "Dizziness", "Headache"}', '{"Avoid with anticoagulants", "Monitor blood pressure"}'),
('Fluoxetine', 'SSRI antidepressant', '{"Nausea", "Insomnia", "Sexual dysfunction"}', '{"Monitor for suicidal thoughts", "Avoid MAOIs"}}');

-- Insert sample patients
INSERT INTO patients (name, age, gender, conditions, medications) VALUES
('John Smith', 65, 'male', '{"Atrial fibrillation", "High cholesterol", "Type 2 diabetes"}', '{"Warfarin", "Atorvastatin", "Metformin"}'),
('Sarah Johnson', 45, 'female', '{"Hypertension", "High cholesterol", "Depression"}', '{"Lisinopril", "Atorvastatin", "Fluoxetine"}'),
('Robert Davis', 72, 'male', '{"Heart failure", "Atrial fibrillation"}', '{"Warfarin", "Lisinopril"}'),
('Maria Garcia', 58, 'female', '{"Arthritis", "Depression", "Hypertension"}', '{"Ibuprofen", "Fluoxetine", "Lisinopril"}');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_drugs_name ON drugs(name);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_patient_id ON interaction_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_interaction_logs_created_at ON interaction_logs(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust for production)
CREATE POLICY "Allow public read access on patients" ON patients FOR SELECT USING (true);
CREATE POLICY "Allow public read access on drugs" ON drugs FOR SELECT USING (true);
CREATE POLICY "Allow public access on interaction_logs" ON interaction_logs FOR ALL USING (true);