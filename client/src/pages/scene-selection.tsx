import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Film, MapPin, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";


interface SceneSelectionProps {
  id: string;
}

export default function SceneSelection({ id }: SceneSelectionProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  
  // Fetch parse job details
  const { data: parseJob, isLoading: isLoadingJob } = useQuery({
    queryKey: [`/api/jobs/${id}`],
  });
  
  // Fetch associated script
  const { data: script, isLoading: isLoadingScript } = useQuery({
    queryKey: [`/api/scripts/${(parseJob as any)?.scriptId}`],
    enabled: !!(parseJob as any)?.scriptId,
  });
  
  // Get scenes from the parse job data - try both possible locations
  const scenes = (parseJob as any)?.fullParseData?.scenes || (parseJob as any)?.fullParseData || [];
  
  // Debug logging
  console.log('Parse job data:', parseJob);
  console.log('Full parse data:', (parseJob as any)?.fullParseData);
  console.log('Scenes found:', scenes);
  
  const goToShotGeneration = () => {
    if (selectedScene === null) {
      toast({
        title: "No scene selected",
        description: "Please select a scene to generate shots for",
        variant: "destructive",
      });
      return;
    }
    
    // Navigate directly to shots generation page
    setLocation(`/shots/${id}/${selectedScene}`);
  };
  
  const goBack = () => {
    setLocation(`/review/${id}`);
  };
  
  if (isLoadingJob || isLoadingScript) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">Loading scenes...</div>
      </div>
    );
  }
  


  if (!parseJob) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Parse Job Not Found</CardTitle>
            <CardDescription>
              The parse job could not be found. Please go back and try again.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!scenes.length) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Scenes Found</CardTitle>
            <CardDescription>
              No scenes were found in this script. The script may still be processing or failed to parse.
              <br />
              Parse job status: {(parseJob as any)?.status}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1">Select Scene for Shot Generation</h2>
        <p className="text-muted-foreground">
          Choose a scene from "{(script as any)?.title}" to generate detailed shots and storyboards
        </p>
      </div>
      
      {/* Scene Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {scenes.map((scene: any, index: number) => (
          <Card 
            key={index} 
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              selectedScene === index && "ring-2 ring-primary bg-primary/5"
            )}
            onClick={() => setSelectedScene(index)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  Scene {scene.sceneNumber || index + 1}
                </Badge>
                {selectedScene === index && (
                  <Badge variant="success" className="text-xs">Selected ✨</Badge>
                )}
              </div>
              <CardTitle className="text-lg leading-tight">
                {scene.sceneHeading || `Scene ${index + 1}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {scene.location && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {scene.location}
                  </div>
                )}
                
                {scene.time && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    {scene.time}
                  </div>
                )}
                
                {scene.characters && scene.characters.length > 0 && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    {scene.characters.slice(0, 3).join(", ")}
                    {scene.characters.length > 3 && ` +${scene.characters.length - 3} more`}
                  </div>
                )}
                
                {scene.action && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mt-2">
                    {scene.action.substring(0, 150)}
                    {scene.action.length > 150 && "..."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Review
        </Button>
        
        <Button 
          onClick={goToShotGeneration}
          disabled={selectedScene === null}
        >
          Generate Shots
          <Film className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}