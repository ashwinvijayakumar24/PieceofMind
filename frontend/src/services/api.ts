// API service for connecting to the Express backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  conditions: string[];
  medications: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Drug {
  id: string;
  name: string;
  common_uses: string;
  side_effects: string[];
  warnings: string[];
}

export interface Interaction {
  drugA: string;
  drugB: string;
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
  recommendation: string;
  sources: string[];
  method: string;
  confidence?: number;
}

export interface InteractionSummary {
  total_pairs: number;
  severe_interactions: number;
  moderate_interactions: number;
  mild_interactions: number;
}

export interface InteractionResult {
  interactions: Interaction[];
  summary: InteractionSummary;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Health check
  async healthCheck(): Promise<{ status: string; services: Record<string, boolean> }> {
    return this.request('/api/health');
  }

  // Patient endpoints
  async getPatients(): Promise<{ patients: Patient[] }> {
    return this.request('/api/patients');
  }

  async getPatient(id: string): Promise<{ patient: Patient }> {
    return this.request(`/api/patients/${id}`);
  }

  async getPatientInteractionHistory(id: string): Promise<{ history: any[] }> {
    return this.request(`/api/patients/${id}/interactions`);
  }

  // Drug endpoints
  async getDrugs(): Promise<{ drugs: Drug[] }> {
    return this.request('/api/drugs');
  }

  async getDrug(name: string): Promise<{ drug: Drug }> {
    return this.request(`/api/drugs/${encodeURIComponent(name)}`);
  }

  // Main interaction checking
  async checkInteractions(
    medications: string[],
    patientId?: string
  ): Promise<InteractionResult> {
    return this.request('/api/check-interactions', {
      method: 'POST',
      body: JSON.stringify({
        medications,
        patientId,
      }),
    });
  }
}

export const apiService = new ApiService();
export default apiService;