import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { columnTypes } from "@shared/schema";

// Helper function to get column information
const getColumnInfo = (column: string) => {
  const columnInfoMap: Record<string, { label: string; description: string; icon: string }> = {
    sceneNumber: { label: "Scene Number", description: "Sequential numbering of scenes", icon: "#" },
    sceneHeading: { label: "Scene Heading", description: "INT/EXT and location descriptions", icon: "H" },
    location: { label: "Location", description: "Where the scene takes place", icon: "L" },
    timeOfDay: { label: "Time of Day", description: "DAY, NIGHT, etc.", icon: "T" },
    characters: { label: "Characters", description: "Characters present in the scene", icon: "C" },
    props: { label: "Props", description: "Key items needed in the scene", icon: "P" },
    tone: { label: "Tone", description: "Emotional tone of the scene", icon: "E" },
    movement: { label: "Camera Movement", description: "Suggested camera directions", icon: "M" },
    action: { label: "Action", description: "Brief description of action", icon: "A" },
    dialogue: { label: "Dialogue", description: "Important lines of dialogue", icon: "D" },
    shotDescription: { label: "Shot Description", description: "Detailed description of the shot", icon: "S" },
    shotType: { label: "Shot Type", description: "Wide, Medium, Close-up, etc.", icon: "T" },
    lens: { label: "Lens", description: "Recommended lens focal length", icon: "L" },
    lighting: { label: "Lighting", description: "Lighting setup and mood", icon: "I" },
    moodAndAmbience: { label: "Mood & Ambience", description: "Overall feeling and atmosphere", icon: "M" },
    notes: { label: "Notes", description: "Additional production notes", icon: "N" },
    soundDesign: { label: "Sound Design", description: "Audio elements and effects", icon: "S" },
    colourTemp: { label: "Color Temperature", description: "Warm, cool, neutral color grading", icon: "C" },
    shotNumber: { label: "Shot Number", description: "Sequential shot numbering", icon: "#" }
  };
  
  return columnInfoMap[column] || { 
    label: column.charAt(0).toUpperCase() + column.slice(1), 
    description: "",
    icon: column.charAt(0).toUpperCase()
  };
};

interface ColumnsProps {
  id: string;
}

export default function Columns({ id }: ColumnsProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Always use all available columns
  const allColumns = [...columnTypes];
  
  // Get scene index from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sceneIndex = urlParams.get('scene');
  
  // If we have a scene parameter, treat this as a job ID (scene-specific workflow)
  // Otherwise treat it as a script ID (original workflow)
  const isSceneWorkflow = sceneIndex !== null;
  
  console.log('Columns page - isSceneWorkflow:', isSceneWorkflow, 'sceneIndex:', sceneIndex, 'id:', id);
  
  // Fetch job data directly if scene workflow
  const { data: parseJob, isLoading: isLoadingJob } = useQuery<any>({
    queryKey: [`/api/jobs/${id}`],
    enabled: isSceneWorkflow,
  });
  
  // Fetch script data - either directly or through job
  const scriptId = isSceneWorkflow ? parseJob?.scriptId : id;
  console.log('Script fetch - parseJob:', parseJob, 'scriptId:', scriptId);
  
  const { data: script, isLoading: isLoadingScript } = useQuery<any>({
    queryKey: [`/api/scripts/${scriptId}`],
    enabled: !!scriptId && (!isSceneWorkflow || !!parseJob),
  });
  
  // For original workflow, fetch all jobs to find existing parse job
  const { data: allJobs = [] } = useQuery({
    queryKey: ['/api/jobs'],
    enabled: !isSceneWorkflow,
  });
  
  // Find existing parse job for this script (original workflow only)
  const originalParseJob = !isSceneWorkflow && Array.isArray(allJobs) ? allJobs.find((job: any) => job.scriptId === parseInt(id)) : null;
  
  // Use the appropriate parse job based on workflow
  const currentParseJob = isSceneWorkflow ? parseJob : originalParseJob;
  
  // No need for column selection logic anymore - using all columns
  
  // Create or update parse job mutation
  const createJobMutation = useMutation({
    mutationFn: async () => {
      if (currentParseJob) {
        // Update existing job with all columns
        return await apiRequest("PATCH", `/api/jobs/${currentParseJob.id}/columns`, {
          columns: allColumns
        });
      } else {
        // Create new job (original workflow only)
        return await apiRequest("POST", "/api/jobs", {
          scriptId: parseInt(id),
          selectedColumns: allColumns
        });
      }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
      toast({
        title: currentParseJob ? "Columns updated" : "Parse job created",
        description: currentParseJob ? "Your column selection has been saved." : "Your parse job has been created."
      });
      
      // Navigate based on workflow type
      const jobId = currentParseJob?.id || data?.id;
      if (isSceneWorkflow && sceneIndex !== null) {
        // Scene-specific workflow: go to shots for selected scene
        setLocation(`/shots/${jobId}/${sceneIndex}`);
      } else if (jobId) {
        // If no scene selected, go back to scene selection
        setLocation(`/scene-selection/${jobId}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to process request",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });
  
  // No column selection needed - using all columns
  
  // Navigate to next step
  const goToNextStep = () => {
    createJobMutation.mutate();
  };
  
  // Navigate back - different destinations based on workflow
  const goBack = () => {
    if (isSceneWorkflow) {
      setLocation(`/scene-selection/${id}`);
    } else {
      setLocation('/upload');
    }
  };
  
  // Show loading state
  if (isLoadingScript || (isSceneWorkflow && isLoadingJob)) {
    return (
      <div className="max-w-3xl mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Show error if script not found
  if (!script && !isLoadingScript) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Script not found</h3>
              <p className="text-muted-foreground mb-4">
                The requested script could not be found.
              </p>
              <Button onClick={() => setLocation('/upload')}>
                Go to Upload
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1">
          {isSceneWorkflow ? `Shot List Settings - Scene ${sceneIndex ? parseInt(sceneIndex) + 1 : ''}` : 'Configure Shot Generation'}
        </h2>
        <p className="text-muted-foreground">
          {isSceneWorkflow 
            ? `Configure your export options for the selected scene from "${script?.title}"`
            : 'Choose which data to extract for shot generation'
          }
        </p>
      </div>
      
      {/* Script Details */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{script?.title || "Script details"}</CardTitle>
          <CardDescription>
            {script?.pageCount} pages • {script?.fileType?.toUpperCase() || "Script"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your shot list will include all available fields for comprehensive production planning.
          </p>
        </CardContent>
      </Card>
      
      {/* CSV Export Fields */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>CSV Export Fields</CardTitle>
          <CardDescription>
            All fields that will be included in your shot list export
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {columnTypes.map((column) => {
              const columnInfo = getColumnInfo(column);
              return (
                <div 
                  key={column}
                  className="flex items-center p-3 rounded-lg border bg-primary/5 border-primary/20"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-xs font-mono bg-primary/10 text-primary rounded-md h-6 w-6 flex items-center justify-center">
                      {columnInfo.icon}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{columnInfo.label}</div>
                      <div className="text-xs text-muted-foreground">{columnInfo.description}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Upload
        </Button>
        
        <Button 
          onClick={goToNextStep} 
          disabled={createJobMutation.isPending}
        >
          {createJobMutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
              {parseJob ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>
              Generate Shots for Scene
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
