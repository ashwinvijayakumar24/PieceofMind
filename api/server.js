// Enhanced Express API for Drug-Drug Interaction Assistant
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Validation schemas
const checkInteractionsSchema = Joi.object({
  medications: Joi.array().items(Joi.string()).min(2).required(),
  patientId: Joi.string().uuid().optional()
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      supabase: !!process.env.SUPABASE_URL,
      ml_service: !!process.env.ML_BASE
    }
  });
});

// Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json({ patients: data });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get specific patient
app.get('/api/patients/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Patient not found' });

    res.json({ patient: data });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Get drug information
app.get('/api/drugs/:name', async (req, res) => {
  try {
    const { name } = req.params;

    const { data, error } = await supabase
      .from('drugs')
      .select('*')
      .ilike('name', name)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Drug not found' });

    res.json({ drug: data });
  } catch (error) {
    console.error('Error fetching drug:', error);
    res.status(500).json({ error: 'Failed to fetch drug information' });
  }
});

// Get all drugs
app.get('/api/drugs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('drugs')
      .select('name, common_uses')
      .order('name');

    if (error) throw error;
    res.json({ drugs: data });
  } catch (error) {
    console.error('Error fetching drugs:', error);
    res.status(500).json({ error: 'Failed to fetch drugs' });
  }
});

// Main interaction checking endpoint
app.post('/api/check-interactions', async (req, res) => {
  try {
    // Validate request
    const { error: validationError, value } = checkInteractionsSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validationError.details
      });
    }

    const { medications, patientId } = value;

    // Log the interaction check if patient ID provided
    if (patientId) {
      await supabase
        .from('interaction_logs')
        .insert({
          patient_id: patientId,
          checked_meds: medications,
          results: null // Will be updated after processing
        });
    }

    // Get all unique pairs of medications
    const pairs = [];
    for (let i = 0; i < medications.length; i++) {
      for (let j = i + 1; j < medications.length; j++) {
        pairs.push([medications[i], medications[j]]);
      }
    }

    const results = [];

    // Check each pair for interactions
    for (const [drugA, drugB] of pairs) {
      try {
        // First, try to call the ML service
        const mlServiceUrl = process.env.ML_BASE || 'http://localhost:8000';
        const mlResponse = await fetch(`${mlServiceUrl}/interactions/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ drugA, drugB }),
          timeout: 5000
        });

        if (mlResponse.ok) {
          const mlResult = await mlResponse.json();
          results.push({
            drugA,
            drugB,
            severity: mlResult.severity || 'mild',
            description: mlResult.description || 'No significant interaction found',
            recommendation: mlResult.recommendation || 'Continue monitoring',
            sources: mlResult.sources || [],
            method: 'ml'
          });
        } else {
          throw new Error('ML service unavailable');
        }
      } catch (mlError) {
        console.log(`ML service error for ${drugA} + ${drugB}, using fallback:`, mlError.message);

        // Fallback: Use static rules or mark as unknown
        const fallbackResult = getFallbackInteraction(drugA, drugB);
        results.push({
          drugA,
          drugB,
          severity: fallbackResult.severity,
          description: fallbackResult.description,
          recommendation: fallbackResult.recommendation,
          sources: ['Internal Database'],
          method: 'fallback'
        });
      }
    }

    // Update interaction log with results if patient ID provided
    if (patientId) {
      await supabase
        .from('interaction_logs')
        .update({ results: results })
        .eq('patient_id', patientId)
        .eq('checked_meds', medications)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    res.json({
      interactions: results,
      summary: {
        total_pairs: pairs.length,
        severe_interactions: results.filter(r => r.severity === 'severe').length,
        moderate_interactions: results.filter(r => r.severity === 'moderate').length,
        mild_interactions: results.filter(r => r.severity === 'mild').length
      }
    });

  } catch (error) {
    console.error('Error checking interactions:', error);
    res.status(500).json({ error: 'Failed to check interactions' });
  }
});

// Get interaction history for a patient
app.get('/api/patients/:id/interactions', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('interaction_logs')
      .select('*')
      .eq('patient_id', id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    res.json({ history: data });
  } catch (error) {
    console.error('Error fetching interaction history:', error);
    res.status(500).json({ error: 'Failed to fetch interaction history' });
  }
});

// Fallback interaction logic for when ML service is unavailable
function getFallbackInteraction(drugA, drugB) {
  const knownInteractions = {
    'warfarin-ibuprofen': {
      severity: 'severe',
      description: 'Increased bleeding risk when combining anticoagulants with NSAIDs',
      recommendation: 'Avoid combination. Consider alternative pain management.'
    },
    'warfarin-atorvastatin': {
      severity: 'moderate',
      description: 'Atorvastatin may enhance anticoagulant effects of warfarin',
      recommendation: 'Monitor INR more frequently when starting or stopping atorvastatin'
    },
    'lisinopril-ibuprofen': {
      severity: 'moderate',
      description: 'NSAIDs may reduce the antihypertensive effect of ACE inhibitors',
      recommendation: 'Monitor blood pressure and kidney function closely'
    },
    'fluoxetine-ibuprofen': {
      severity: 'moderate',
      description: 'Increased risk of bleeding when combining SSRIs with NSAIDs',
      recommendation: 'Consider gastroprotective therapy and monitor for bleeding'
    }
  };

  // Normalize drug names and create lookup key
  const normalizedA = drugA.toLowerCase().trim();
  const normalizedB = drugB.toLowerCase().trim();
  const key1 = `${normalizedA}-${normalizedB}`;
  const key2 = `${normalizedB}-${normalizedA}`;

  const interaction = knownInteractions[key1] || knownInteractions[key2];

  if (interaction) {
    return interaction;
  }

  // Default for unknown combinations
  return {
    severity: 'mild',
    description: 'No significant interaction found in current database',
    recommendation: 'Continue current medications with routine monitoring'
  };
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 DDI Assistant API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔗 ML Service: ${process.env.ML_BASE || 'http://localhost:8000'}`);
});