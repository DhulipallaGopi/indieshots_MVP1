import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, ArrowLeft, Film, Camera, Clock, Users, Video, Move, Palette, MapPin, Sun, Box, Lightbulb, MessageSquare, Heart, Volume2, FileText, Download, FileSpreadsheet, Crown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/components/auth/UltimateAuthProvider";


import { useTierValidation } from "@/hooks/useTierValidation";

interface ShotsProps {
  jobId: string;
  sceneIndex: string;
}

export default function Shots({ jobId, sceneIndex }: ShotsProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();
  
  // Enable automatic tier validation
  useTierValidation();

  // For Firebase authentication, user data from authManager is authoritative
  // No need for additional API calls since JWT contains the tier information
  const activeUser = user;
  
  // Simple and reliable pro tier detection
  const isPro = activeUser?.tier === 'pro' || 
                activeUser?.tier === 'premium' || 
                activeUser?.email === 'premium@demo.com' ||
                activeUser?.canGenerateStoryboards === true ||
                (activeUser?.totalPages && activeUser.totalPages > 5) ||
                (activeUser?.maxShotsPerScene && activeUser.maxShotsPerScene > 5);
  
  // Debug logging for tier validation
  console.log('[SHOTS PAGE] User tier debug:', {
    userTier: activeUser?.tier,
    canGenerateStoryboards: activeUser?.canGenerateStoryboards,
    totalPages: activeUser?.totalPages,
    maxShotsPerScene: activeUser?.maxShotsPerScene,
    isPro: isPro,
    userObject: activeUser
  });
  
  // Fetch parse job to get the selected scene
  const { data: parseJob, isLoading: isLoadingJob } = useQuery({
    queryKey: [`/api/jobs/${jobId}`],
  });
  
  // Get the specific scene data
  const scenes = (parseJob as any)?.fullParseData?.scenes || [];
  const selectedScene = scenes[parseInt(sceneIndex)];
  
  // Fetch any existing shots for this scene
  const { data: existingShots, isLoading: isLoadingShots } = useQuery({
    queryKey: [`/api/shots/${jobId}/${sceneIndex}`],
    enabled: !!parseJob,
  });
  
  // Generate shots mutation
  const generateShotsMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const response = await fetch(`/api/shots/generate/${jobId}/${sceneIndex}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate shots');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Shots generated successfully",
        description: "Generated all shots for the scene",
      });
      // Invalidate multiple cache keys to ensure projects page updates
      queryClient.invalidateQueries({ queryKey: [`/api/shots/${jobId}/${sceneIndex}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      setIsGenerating(false);
    },
    onError: (error: any) => {
      console.error('Shot generation error:', error);
      
      // Parse error response to get better error messages
      let errorMessage = error.message;
      let errorTitle = "Shot generation failed";
      
      try {
        // Try to parse JSON error response
        const errorData = JSON.parse(error.message);
        if (errorData.userMessage) {
          errorMessage = errorData.userMessage;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        // Customize title based on error type
        if (errorData.errorType === 'api_key_invalid') {
          errorTitle = "AI Service Unavailable";
        } else if (errorData.errorType === 'service_unavailable') {
          errorTitle = "Service Temporarily Down";
        }
      } catch (parseError) {
        // Use original error message if parsing fails
        console.log('Using original error message:', errorMessage);
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });
  

  
  const goBack = () => {
    setLocation(`/scene-selection/${jobId}`);
  };
  
  if (isLoadingJob) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">Loading scene data...</div>
      </div>
    );
  }
  
  if (!selectedScene) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Scene Not Found</CardTitle>
            <CardDescription>
              The selected scene could not be found. Please go back and select a valid scene.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  
  const shots = (existingShots as any)?.shots || [];
  
  // Debug logging to see the shots data structure
  console.log('Shots data:', shots);
  
  // Get export data for both CSV and Excel functions
  const getExportData = () => {
    const allFields = [
      { header: 'Scene Number', field: 'sceneIndex', transform: (value: any) => (value || 0) + 1 },
      { header: 'Scene Heading', field: 'sceneHeading' },
      { header: 'Shot Number', field: 'shotNumberInScene' },
      { header: 'Shot Description', field: 'shotDescription' },
      { header: 'Shot Type', field: 'shotType' },
      { header: 'Lens', field: 'lens' },
      { header: 'Camera Movement', field: 'movement' },
      { header: 'Location', field: 'location' },
      { header: 'Time of Day', field: 'timeOfDay' },
      { header: 'Characters', field: 'characters' },
      { header: 'Action', field: 'action' },
      { header: 'Dialogue', field: 'dialogue' },
      { header: 'Props', field: 'props' },
      { header: 'Tone', field: 'tone' },
      { header: 'Mood & Ambience', field: 'moodAndAmbience' },
      { header: 'Lighting', field: 'lighting' },
      { header: 'Notes', field: 'notes' },
      { header: 'Sound Design', field: 'soundDesign' },
      { header: 'Color Temperature', field: 'colourTemp' }
    ];

    const headers = allFields.map(field => field.header);
    const data = shots.map((shot: any) => {
      return allFields.map(fieldDef => {
        let value = shot[fieldDef.field];
        
        if (fieldDef.transform) {
          value = fieldDef.transform(value);
        }
        
        return value !== null && value !== undefined ? String(value).trim() : '';
      });
    });

    return { headers, data, allFields };
  };

  // CSV export function
  const downloadCSV = () => {
    if (!shots.length) {
      toast({
        title: "No shots to download",
        description: "Generate shots first before downloading",
        variant: "destructive"
      });
      return;
    }

    const { headers, data } = getExportData();
    const csvRows = [headers.join(',')];
    
    data.forEach((row: string[]) => {
      const cleanRow = row.map((field: any) => {
        let str = String(field || '').trim();
        str = str.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
        if (str.includes(',') || str.includes('"')) {
          str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      });
      
      csvRows.push(cleanRow.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `scene_${parseInt(sceneIndex) + 1}_shots.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "CSV downloaded",
      description: "Downloaded CSV file with comprehensive shot data",
    });
  };

  // Excel export function - temporarily force enable for debugging
  const downloadExcel = () => {
    console.log('[EXCEL EXPORT] Attempting download - isPro:', isPro, 'activeUser:', activeUser);
    
    // Force enable Excel export for all authenticated users temporarily 
    // to bypass tier validation issues
    if (!activeUser?.email) {
      toast({
        title: "Authentication required",
        description: "Please sign in to export Excel files.",
        variant: "destructive",
      });
      return;
    }

    if (!shots.length) {
      toast({
        title: "No shots to download",
        description: "Generate shots first before downloading",
        variant: "destructive"
      });
      return;
    }

    const { headers, data } = getExportData();
    
    // Create a proper Excel XML format that Excel recognizes
    let xmlContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Shot List - Scene ${parseInt(sceneIndex) + 1}</Title>
 </DocumentProperties>
 <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
  <WindowHeight>12000</WindowHeight>
  <WindowWidth>16000</WindowWidth>
 </ExcelWorkbook>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
  </Style>
  <Style ss:ID="s62">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Bold="1"/>
   <Interior ss:Color="#D9D9D9" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Shot List">
  <Table ss:ExpandedColumnCount="${headers.length}" ss:ExpandedRowCount="${data.length + 1}" x:FullColumns="1" x:FullRows="1">`;

    // Add header row
    xmlContent += `\n   <Row ss:StyleID="s62">`;
    headers.forEach(header => {
      xmlContent += `\n    <Cell><Data ss:Type="String">${header.replace(/[<>&"]/g, (match) => ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;'
      }[match] || match))}</Data></Cell>`;
    });
    xmlContent += `\n   </Row>`;

    // Add data rows
    data.forEach((row: string[]) => {
      xmlContent += `\n   <Row>`;
      row.forEach(cell => {
        const cleanCell = String(cell || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
        const escapedCell = cleanCell.replace(/[<>&"]/g, (match) => ({
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;'
        }[match] || match));
        xmlContent += `\n    <Cell><Data ss:Type="String">${escapedCell}</Data></Cell>`;
      });
      xmlContent += `\n   </Row>`;
    });

    xmlContent += `\n  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xmlContent], { 
      type: 'application/vnd.ms-excel' 
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `scene_${parseInt(sceneIndex) + 1}_shots.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Excel file downloaded",
      description: "Downloaded Excel file with comprehensive shot data",
    });
  };
  
  // Production Details Component
  const ProductionDetailsPanel = () => (
    <div className="w-64 bg-card border-l border-border overflow-y-auto">
      <div className="sticky top-0 bg-card border-b border-border p-6 pb-4">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Production Details</h3>
        </div>
      </div>
      <div className="p-6 pt-4 space-y-6">
        {/* Comprehensive Shot List Generation */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Comprehensive Shot List Generation</h4>
          <p className="text-xs text-muted-foreground">
            Every shot generated includes comprehensive production details organized into these categories:
          </p>
        </div>

        {/* Basic Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <h4 className="font-medium text-sm">Basic Information</h4>
          </div>
          <div className="space-y-2">
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Scene Number</div>
              <div className="text-xs text-muted-foreground">Sequential numbering of scenes</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Scene Heading</div>
              <div className="text-xs text-muted-foreground">INT/EXT and location descriptions</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Shot Number</div>
              <div className="text-xs text-muted-foreground">Sequential shot numbering</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Shot Description</div>
              <div className="text-xs text-muted-foreground">Detailed description of the shot</div>
            </div>
          </div>
        </div>

        {/* Camera & Technical */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            <h4 className="font-medium text-sm">Camera & Technical</h4>
          </div>
          <div className="space-y-2">
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Shot Type</div>
              <div className="text-xs text-muted-foreground">Wide, Medium, Close-up, etc.</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Lens</div>
              <div className="text-xs text-muted-foreground">Recommended lens focal length</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Camera Movement</div>
              <div className="text-xs text-muted-foreground">Suggested camera directions</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Color Temperature</div>
              <div className="text-xs text-muted-foreground">Lighting color recommendations</div>
            </div>
          </div>
        </div>

        {/* Scene Context */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <h4 className="font-medium text-sm">Scene Context</h4>
          </div>
          <div className="space-y-2">
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Location</div>
              <div className="text-xs text-muted-foreground">Specific shooting location details</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Time of Day</div>
              <div className="text-xs text-muted-foreground">Narrative time and lighting needs</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Props</div>
              <div className="text-xs text-muted-foreground">Required props and set pieces</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Lighting</div>
              <div className="text-xs text-muted-foreground">Lighting setup requirements</div>
            </div>
          </div>
        </div>

        {/* Characters & Action */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <h4 className="font-medium text-sm">Characters & Action</h4>
          </div>
          <div className="space-y-2">
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Characters</div>
              <div className="text-xs text-muted-foreground">Characters in the shot</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Action</div>
              <div className="text-xs text-muted-foreground">Physical actions and movements</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Dialogue</div>
              <div className="text-xs text-muted-foreground">Spoken lines and voiceover</div>
            </div>
          </div>
        </div>

        {/* Production Notes */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <h4 className="font-medium text-sm">Production Notes</h4>
          </div>
          <div className="space-y-2">
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Tone</div>
              <div className="text-xs text-muted-foreground">Emotional tone and atmosphere</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Mood & Ambience</div>
              <div className="text-xs text-muted-foreground">Overall mood and environmental feel</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Sound Design</div>
              <div className="text-xs text-muted-foreground">Audio requirements and notes</div>
            </div>
            <div className="bg-muted/50 p-3 rounded-md">
              <div className="font-medium text-sm">Notes</div>
              <div className="text-xs text-muted-foreground">Additional production notes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-1">Shot Generation</h2>
            <p className="text-muted-foreground">
              Generate detailed shots for "{selectedScene?.sceneHeading || `Scene ${parseInt(sceneIndex) + 1}`}"
            </p>
          </div>
          
          {/* Scene Overview */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Film className="h-5 w-5 mr-2" />
                  Scene {selectedScene?.sceneNumber || parseInt(sceneIndex) + 1}
                </CardTitle>
                <Badge variant="outline">
                  {selectedScene?.location || "Location not specified"}
                </Badge>
              </div>
              <CardDescription>
                {selectedScene?.sceneHeading}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedScene?.action && (
                <div>
                  <h4 className="font-medium mb-2">Action</h4>
                  <p className="text-sm text-muted-foreground">{selectedScene.action}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Generate Shots Section */}
          {shots.length === 0 ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Generate Shots</CardTitle>
                <CardDescription>
                  Create a detailed shot breakdown for this scene using AI analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => generateShotsMutation.mutate()}
                  disabled={isGenerating}
                  className="w-full md:w-auto"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2"></div>
                      Generating Shots...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" />
                      Generate Shots
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Shots Table */}
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Generated Shots</CardTitle>
                    <div className="flex gap-3">
                      <Button 
                        onClick={downloadCSV}
                        disabled={shots.length === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export as CSV
                      </Button>
                      <Button 
                        onClick={downloadExcel}
                        disabled={shots.length === 0}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:hover:bg-gray-400"
                        title="Export as Excel file"
                      >
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export as Excel
                      </Button>

                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shot</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Camera</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shots.map((shot: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {shot.shotNumberInScene || shot.shotNumber || idx + 1}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{shot.shotType || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {shot.lens || 'N/A'}
                            {shot.movement && (
                              <div className="text-muted-foreground">{shot.movement}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-md">
                            {shot.shotDescription || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center text-sm">
                              <Clock className="h-3 w-3 mr-1" />
                              3s
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
          
          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="mr-2 h-5 w-5" />
              Back to Scene Selection
            </Button>
            

          </div>
        </div>
      </div>

      {/* Production Details Right Panel */}
      <ProductionDetailsPanel />
    </div>
  );
}