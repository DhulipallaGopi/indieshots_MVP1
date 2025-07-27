import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Eye, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/utils";
import { useLocation, Link } from "wouter";

export default function Upload() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [file, setFile] = useState<File | null>(null);
  const [scriptText, setScriptText] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  
  // Function to create parse job automatically
  const createParseJob = async (scriptId: number) => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scriptId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create parse job');
      }
      
      const parseJob = await response.json();
      
      // Set default columns and start parsing immediately
      await fetch(`/api/jobs/${parseJob.id}/columns`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          columns: ['sceneHeading', 'location', 'characters', 'action']
        })
      });
      
      // Start the parsing process
      await fetch(`/api/jobs/${parseJob.id}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      return parseJob.id;
    } catch (error) {
      console.error('Error creating parse job:', error);
      throw error;
    }
  };
  
  // Calculate remaining pages
  const pagesRemaining = user ? (user.totalPages || 0) - (user.usedPages || 0) : 0;
  
  // Fetch previously uploaded scripts
  const { data: scripts = [], isLoading: isLoadingScripts } = useQuery({
    queryKey: ["/api/scripts"],
  });

  // Fetch parse jobs to determine completed status
  const { data: parseJobs = [] } = useQuery({
    queryKey: ["/api/jobs"],
  });
  
  // Upload script mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      try {
        const formData = new FormData();
        
        if (file) {
          formData.append("file", file);
          formData.append("title", file.name.replace(/\.[^/.]+$/, ""));
        } else if (scriptText) {
          formData.append("content", scriptText);
          formData.append("title", `Script ${new Date().toLocaleDateString()}`);
        } else {
          throw new Error("Please provide a file or script text");
        }
        
        const res = await fetch("/api/scripts/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to upload script");
        }
        
        return await res.json();
      } finally {
        setUploading(false);
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Script uploaded successfully",
        description: "Extracting scenes from your script...",
      });
      
      // Invalidate scripts query and upgrade status to update usage count
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/upgrade/status"] });
      
      // Create a parse job automatically with default columns
      createParseJob(data.script.id).then((parseJobId) => {
        // Wait for scene extraction to complete, then redirect to scene selection
        const checkCompletion = async () => {
          try {
            const response = await fetch(`/api/jobs/${parseJobId}`, {
              credentials: 'include'
            });
            const job = await response.json();
            
            if (job.status === 'completed') {
              // Invalidate multiple cache keys to ensure projects page updates
              queryClient.invalidateQueries({ queryKey: ["/api/upgrade/status"] });
              queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
              queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
              
              toast({
                title: "Scene extraction completed",
                description: "Your script has been divided into scenes. Choose a scene to work with."
              });
              setLocation(`/scene-selection/${parseJobId}`);
            } else if (job.status === 'failed') {
              toast({
                title: "Scene extraction failed",
                description: job.errorMessage || "An error occurred during processing",
                variant: "destructive"
              });
            } else {
              // Still processing, check again
              setTimeout(checkCompletion, 2000);
            }
          } catch (error) {
            console.error('Error checking parse job status:', error);
            setTimeout(checkCompletion, 2000);
          }
        };
        
        // Start checking after a brief delay
        setTimeout(checkCompletion, 2000);
      }).catch((error) => {
        console.error('Error creating parse job:', error);
        toast({
          title: "Processing failed",
          description: "Unable to start scene extraction",
          variant: "destructive"
        });
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleUpload = () => {
    if (!file && !scriptText) {
      toast({
        title: "No content provided",
        description: "Please upload a file or paste script text",
        variant: "destructive",
      });
      return;
    }
    
    uploadMutation.mutate();
  };
  
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-1">Upload Your Script</h2>
        <p className="text-muted-foreground">
          Upload a script file or paste your screenplay content
        </p>
      </div>
      
      {/* File Upload Area */}
      <FileUpload 
        onFileChange={setFile}
        onTextChange={setScriptText}
        maxSize={10 * 1024 * 1024} // 10MB
        acceptedFileTypes={[".pdf", ".docx", ".txt"]}
        pageCount={pagesRemaining}
        className="mb-8"
      />
      
      {/* Next Step Button */}
      <div className="flex justify-end mb-12">
        <Button 
          onClick={handleUpload}
          disabled={(!file && !scriptText) || uploading}
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2"></div>
              Uploading...
            </>
          ) : (
            <>
              Extract Scenes from Script
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
      
      {/* Recently Uploaded Files */}
      {Array.isArray(scripts) && scripts.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">Recently Uploaded</h3>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {scripts.slice(0, 3).map((script: any) => (
                  <div key={script.id} className="px-4 py-3 hover:bg-muted/50 transition flex items-center justify-between">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <div className="text-sm font-medium">{script.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {script.pageCount} pages • Uploaded {formatDate(script.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {(() => {
                        // Find the completed parse job for this script
                        const completedJob = Array.isArray(parseJobs) && parseJobs.find((job: any) => job.scriptId === script.id && job.status === 'completed');
                        
                        if (completedJob) {
                          return (
                            <>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/review/${completedJob.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`/api/jobs/${completedJob.id}/download`}>
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </>
                          );
                        } else {
                          return (
                            <>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/columns/${script.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="sm" disabled>
                                <Download className="h-4 w-4" />
                              </Button>
                            </>
                          );
                        }
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
