import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, Info, Loader2 } from "lucide-react";
import { Patient, Interaction, InteractionSummary } from "@/types";
import { apiService } from "@/services/api";
import { Header } from "@/components/Header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const Dashboard = () => {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false);
  const [interactionResults, setInteractionResults] = useState<{
    interactions: Interaction[];
    summary: InteractionSummary;
  } | null>(null);

  // Fetch patients
  const {
    data: patientsData,
    isLoading: patientsLoading,
    error: patientsError
  } = useQuery({
    queryKey: ['patients'],
    queryFn: apiService.getPatients,
    retry: 2
  });

  // Health check
  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: apiService.healthCheck,
    refetchInterval: 30000 // Check every 30 seconds
  });

  // Check interactions mutation
  const checkInteractionsMutation = useMutation({
    mutationFn: ({ medications, patientId }: { medications: string[]; patientId?: string }) =>
      apiService.checkInteractions(medications, patientId),
    onSuccess: (data) => {
      setInteractionResults(data);
      setIsCheckingInteractions(false);
      toast.success("Interaction check completed");
    },
    onError: (error) => {
      console.error('Error checking interactions:', error);
      setIsCheckingInteractions(false);
      toast.error("Failed to check interactions");
    }
  });

  const handlePatientSelect = (patientId: string) => {
    const patient = patientsData?.patients.find(p => p.id === patientId);
    setSelectedPatient(patient || null);
    setInteractionResults(null); // Clear previous results
  };

  const handleCheckInteractions = async () => {
    if (!selectedPatient || selectedPatient.medications.length < 2) {
      toast.error("Please select a patient with at least 2 medications");
      return;
    }

    setIsCheckingInteractions(true);
    checkInteractionsMutation.mutate({
      medications: selectedPatient.medications,
      patientId: selectedPatient.id
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'mild':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'severe':
        return <AlertCircle className="h-4 w-4" />;
      case 'moderate':
        return <Info className="h-4 w-4" />;
      case 'mild':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  if (patientsError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to connect to the backend service. Please ensure the API server is running.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Service Status */}
        {healthData && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              System Status: {healthData.status} |
              ML Service: {healthData.services.sentence_transformers ? '✅' : '❌'} |
              OpenAI: {healthData.services.openai ? '✅' : '❌'}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Selection */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Select Patient</CardTitle>
                <CardDescription>
                  Choose a patient to analyze their medications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {patientsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <Select onValueChange={handlePatientSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patientsData?.patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.name} ({patient.age}y, {patient.gender})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {selectedPatient && (
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium">Patient Information</h4>
                      <p className="text-sm text-gray-600">
                        {selectedPatient.name}, {selectedPatient.age} years old
                      </p>
                      {selectedPatient.conditions && selectedPatient.conditions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700">Conditions:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedPatient.conditions.map((condition, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {condition}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium">Current Medications</h4>
                      <div className="space-y-2 mt-2">
                        {selectedPatient.medications.map((medication, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Badge variant="secondary">{medication}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleCheckInteractions}
                      disabled={isCheckingInteractions || selectedPatient.medications.length < 2}
                      className="w-full"
                    >
                      {isCheckingInteractions ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking Interactions...
                        </>
                      ) : (
                        'Check Drug Interactions'
                      )}
                    </Button>

                    {selectedPatient.medications.length < 2 && (
                      <p className="text-xs text-gray-500">
                        At least 2 medications required for interaction checking
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {interactionResults ? (
              <div className="space-y-6">
                {/* Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Interaction Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {interactionResults.summary.total_pairs}
                        </div>
                        <div className="text-sm text-gray-600">Total Pairs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {interactionResults.summary.severe_interactions}
                        </div>
                        <div className="text-sm text-gray-600">Severe</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {interactionResults.summary.moderate_interactions}
                        </div>
                        <div className="text-sm text-gray-600">Moderate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {interactionResults.summary.mild_interactions}
                        </div>
                        <div className="text-sm text-gray-600">Mild</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Results */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Interactions</CardTitle>
                    <CardDescription>
                      {interactionResults.interactions.length} drug pair(s) analyzed
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {interactionResults.interactions.map((interaction, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${getSeverityColor(interaction.severity)}`}
                        >
                          <div className="flex items-start gap-3">
                            {getSeverityIcon(interaction.severity)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">
                                  {interaction.drugA} + {interaction.drugB}
                                </h4>
                                <Badge
                                  variant="outline"
                                  className={getSeverityColor(interaction.severity)}
                                >
                                  {interaction.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {interaction.method}
                                </Badge>
                              </div>

                              <p className="text-sm mb-2">{interaction.description}</p>

                              <div className="text-sm">
                                <strong>Recommendation:</strong> {interaction.recommendation}
                              </div>

                              {interaction.sources.length > 0 && (
                                <div className="text-xs text-gray-600 mt-2">
                                  <strong>Sources:</strong> {interaction.sources.join(', ')}
                                </div>
                              )}

                              {interaction.confidence && (
                                <div className="text-xs text-gray-600 mt-1">
                                  <strong>Confidence:</strong> {(interaction.confidence * 100).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Analysis Yet
                    </h3>
                    <p className="text-gray-600">
                      Select a patient and click "Check Drug Interactions" to see results
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;