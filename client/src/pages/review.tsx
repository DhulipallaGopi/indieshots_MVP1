import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Download, 
  FileText, 
  Camera, 
  Image, 
  Calendar,
  Clock,
  MapPin,
  Play,
  AlertCircle
} from "lucide-react";

interface ReviewProps {
  id: string;
}

export default function Review({ id }: ReviewProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch parse job details
  const { data: parseJob, isLoading: isLoadingJob } = useQuery({
    queryKey: [`/api/jobs/${id}`],
  });
  
  // Fetch associated script
  const { data: script, isLoading: isLoadingScript } = useQuery({
    queryKey: [`/api/scripts/${(parseJob as any)?.scriptId}`],
    enabled: !!(parseJob as any)?.scriptId,
  });

  // Fetch shots data for completed scenes
  const { data: shotsData, isLoading: isLoadingShots } = useQuery({
    queryKey: [`/api/shots/${id}`],
    enabled: !!(parseJob as any)?.scriptId,
  });
  
  if (isLoadingJob || isLoadingScript) {
    return (
      <div className="max-w-6xl mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!parseJob || !script) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Project not found</h3>
              <p className="text-muted-foreground mb-4">
                The requested project could not be found.
              </p>
              <Button onClick={() => setLocation('/projects')}>
                Back to Projects
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const parsedData = (parseJob as any)?.fullParseData?.scenes || [];
  const totalScenes = Array.isArray(parsedData) ? parsedData.length : 0;
  const shotsArray = Array.isArray(shotsData) ? shotsData : [];
  const completedShots = shotsArray.length;
  const progress = totalScenes > 0 ? Math.round((completedShots / totalScenes) * 100) : 0;

  // Calculate project statistics
  const projectStats = {
    totalScenes,
    completedShots,
    storyboards: shotsArray.filter((shot: any) => shot.imageData).length,
    characters: Array.isArray(parsedData) ? Array.from(new Set(parsedData.flatMap((scene: any) => scene.characters || []))).length : 0,
    locations: Array.isArray(parsedData) ? Array.from(new Set(parsedData.map((scene: any) => scene.location).filter(Boolean))).length : 0,
  };

  const downloadStoryboards = () => {
    window.location.href = `/api/storyboards/${id}/download`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Project Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">{(script as any)?.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {(script as any)?.pageCount} pages
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Created {new Date((script as any)?.createdAt).toLocaleDateString()}
              </span>
              <Badge 
                variant={(parseJob as any)?.status === 'completed' ? 'success' : 'secondary'}
                className={(parseJob as any)?.status === 'completed' ? 'shadow-sm' : ''}
              >
                {(parseJob as any)?.status === 'completed' ? 'Parsed ✨' : (parseJob as any)?.status || 'In Progress'}
              </Badge>
            </div>
          </div>
          <div className="flex gap-3">
            {/* Export buttons removed - not providing expected CSV output */}
          </div>
        </div>


      </div>

      {/* Project Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scenes">Scenes & Shots</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Script Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Script Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File Type</span>
                  <span>{(script as any)?.fileType?.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pages</span>
                  <span>{(script as any)?.pageCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File Size</span>
                  <span>{Math.round(((script as any)?.fileSize || 0) / 1024)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uploaded</span>
                  <span>{new Date((script as any)?.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => setLocation(`/scene-selection/${id}`)}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Generate More Shots
                </Button>


              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scenes">
          <div className="space-y-4">
            {Array.isArray(parsedData) && parsedData.length > 0 ? (
              parsedData.map((scene: any, index: number) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Scene {scene.sceneNumber || index + 1}
                        </CardTitle>
                        <CardDescription>
                          {scene.sceneHeading || scene.location}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {scene.timeOfDay && (
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" />
                            {scene.timeOfDay}
                          </Badge>
                        )}
                        {scene.location && (
                          <Badge variant="outline">
                            <MapPin className="mr-1 h-3 w-3" />
                            {scene.location}
                          </Badge>
                        )}
                        <Button 
                          size="sm" 
                          onClick={() => setLocation(`/shots/${id}/${index}`)}
                        >
                          <Camera className="mr-1 h-3 w-3" />
                          Generate Shots
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Characters:</span>
                        <p className="text-muted-foreground">
                          {Array.isArray(scene.characters) 
                            ? scene.characters.join(', ') 
                            : (scene.characters || 'None specified')}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Action:</span>
                        <p className="text-muted-foreground">
                          {scene.action || 'No action described'}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium">Tone:</span>
                        <p className="text-muted-foreground">
                          {scene.tone || 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No scenes have been parsed yet.</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => setLocation(`/scene-selection/${id}`)}
                  >
                    Start Scene Analysis
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>




      </Tabs>

      {/* Navigation */}
      <div className="flex justify-start mt-8">
        <Button variant="outline" onClick={() => setLocation('/projects')}>
          Back to Projects
        </Button>
      </div>
    </div>
  );
}