import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight, ArrowLeft, Play, Download, Loader2 } from "lucide-react";

interface ParseProps {
  id: string;
}

export default function Parse({ id }: ParseProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch parse job details
  const { data: parseJob, isLoading: isLoadingJob } = useQuery({
    queryKey: [`/api/jobs/${id}`],
    refetchInterval: 1000, // Poll every second to catch status changes
  });
  
  // Fetch associated script
  const { data: script, isLoading: isLoadingScript } = useQuery({
    queryKey: [`/api/scripts/${(parseJob as any)?.scriptId}`],
    enabled: !!(parseJob as any)?.scriptId,
  });
  
  // Parse script mutation
  const parseMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/jobs/${id}/parse`, {});
    },
    onSuccess: () => {
      toast({
        title: "Processing started",
        description: "Your script is being parsed."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/jobs/${id}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start parsing",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  // CSV Download function
  const downloadCSV = () => {
    const link = document.createElement('a');
    link.href = `/api/jobs/${id}/download`;
    link.download = `script-analysis-${id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Auto-start parsing when page loads if job is pending
  useEffect(() => {
    if ((parseJob as any)?.status === 'pending' && !parseMutation.isPending) {
      // Automatically start parsing after a short delay
      const timer = setTimeout(() => {
        parseMutation.mutate();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [(parseJob as any)?.status, parseMutation]);

  // Auto-navigate to review page when processing completes
  useEffect(() => {
    if ((parseJob as any)?.status === 'completed') {
      toast({
        title: "Scene extraction completed",
        description: "Your script has been divided into scenes. Choose a scene to work with."
      });
      setTimeout(() => {
        setLocation(`/scene-selection/${id}`);
      }, 1000);
    } else if ((parseJob as any)?.status === 'failed') {
      toast({
        title: "Parsing failed",
        description: (parseJob as any)?.errorMessage || "An error occurred during parsing",
        variant: "destructive"
      });
    }
  }, [(parseJob as any)?.status, (parseJob as any)?.errorMessage, id, setLocation, toast]);
  
  // Start parsing
  const startParsing = () => {
    parseMutation.mutate();
  };
  
  // Navigate back to columns
  const goBack = () => {
    setLocation(`/columns/${id}`);
  };
  
  // Show loading state
  if (isLoadingJob || isLoadingScript) {
    return (
      <div className="max-w-3xl mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Show error if job not found
  if (!parseJob) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Parse job not found</h3>
              <p className="text-muted-foreground mb-4">
                The requested parse job could not be found.
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
  
  // Determine if job is in progress
  const isProcessing = ['pending', 'processing'].includes((parseJob as any)?.status);
  const isCompleted = (parseJob as any)?.status === 'completed';
  const previewData = isCompleted ? ((parseJob as any)?.fullParseData || []) : ((parseJob as any)?.previewData || []);
  const columns = (parseJob as any)?.selectedColumns || [];
  
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1">Parse Script</h2>
        <p className="text-muted-foreground">
          Preview and process your script
        </p>
      </div>
      
      {/* Script Details */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{(script as any)?.title || "Script details"}</CardTitle>
          <CardDescription>
            {(script as any)?.pageCount} pages • {(script as any)?.fileType?.toUpperCase() || "Script"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {(parseJob as any)?.status === 'preview_ready' 
              ? "Preview is ready. You can start the full parse to process the entire script."
              : (parseJob as any)?.status === 'processing'
              ? "Your script is being processed. This may take a few moments."
              : (parseJob as any)?.status === 'completed'
              ? "Parsing completed successfully. You can now review the results."
              : "Prepare to parse your script with the selected columns."}
          </p>
          
          {(parseJob as any)?.status === 'preview_ready' && (
            <div className="flex justify-end">
              <Button 
                onClick={startParsing}
                disabled={parseMutation.isPending}
              >
                {parseMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Full Parse
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Preview Data */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>
            {isProcessing 
              ? "Processing..." 
              : (parseJob as any)?.status === 'completed' 
              ? "Parse Completed" 
              : "Script Preview"}
          </CardTitle>
          <CardDescription>
            {isProcessing 
              ? "Your script is being analyzed" 
              : (parseJob as any)?.status === 'completed' 
              ? "Your script has been fully parsed" 
              : "First few scenes from your script"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isProcessing ? (
            <div className="py-8">
              <div className="flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-muted-foreground">
                  Processing your script. This may take a few moments.
                </p>
              </div>
              
              <div className="mt-8 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ) : previewData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column: any) => (
                      <TableHead key={column}>{column.charAt(0).toUpperCase() + column.slice(1)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((row: any, index: number) => (
                    <TableRow key={index}>
                      {columns.map((column: any) => (
                        <TableCell key={column}>{row[column] || "-"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No preview data available</p>
            </div>
          )}
        </CardContent>
        {(parseJob as any)?.status === 'completed' && (
          <CardFooter className="flex justify-end">
            <Button asChild>
              <a href={`/api/jobs/${id}/download`}>
                <Download className="mr-2 h-4 w-4" />
                Download Results
              </a>
            </Button>
          </CardFooter>
        )}
      </Card>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Columns
        </Button>
        
        {(parseJob as any)?.status === 'completed' ? (
          <Button onClick={() => setLocation(`/review/${id}`)}>
            Continue to Review
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <Button disabled={isProcessing}>
            Processing...
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
