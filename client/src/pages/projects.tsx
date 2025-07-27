import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, 
  Eye, 
  Download, 
  ArrowRight, 
  Search, 
  Filter,
  Calendar,
  FileText,
  Trash2,
  MoreHorizontal,
  Heart
} from "lucide-react";
import { formatDate, truncate } from "@/lib/utils";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Projects() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterBy, setFilterBy] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scriptToDelete, setScriptToDelete] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's scripts
  const { data: scripts = [], isLoading: isLoadingScripts } = useQuery({
    queryKey: ["/api/scripts"],
  });

  // Fetch user's parse jobs
  const { data: parseJobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ["/api/jobs"],
  });



  // Filter and sort scripts
  const filteredScripts = Array.isArray(scripts) ? scripts.filter((script: any) => {
    const matchesSearch = script.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterBy === "all") return matchesSearch;
    if (filterBy === "parsed") {
      const hasCompletedJob = Array.isArray(parseJobs) && 
        parseJobs.some((job: any) => job.scriptId === script.id && job.status === 'completed');
      return matchesSearch && hasCompletedJob;
    }
    if (filterBy === "unparsed") {
      const hasCompletedJob = Array.isArray(parseJobs) && 
        parseJobs.some((job: any) => job.scriptId === script.id && job.status === 'completed');
      return matchesSearch && !hasCompletedJob;
    }
    return matchesSearch;
  }).sort((a: any, b: any) => {
    if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "size") return b.pageCount - a.pageCount;
    return 0;
  }) : [];

  const getJobStatus = (scriptId: number) => {
    if (!Array.isArray(parseJobs)) return null;
    // Find the most recent completed job for this script (handle both string and number IDs)
    const jobs = parseJobs.filter((job: any) => 
      job.scriptId === scriptId || 
      job.scriptId === String(scriptId) || 
      String(job.scriptId) === String(scriptId)
    );
    if (jobs.length === 0) return null;
    
    // Check if any job is completed
    const completedJob = jobs.find((job: any) => job.status === 'completed');
    if (completedJob) return 'completed';
    
    // Check for processing/pending jobs
    const processingJob = jobs.find((job: any) => job.status === 'processing' || job.status === 'pending');
    if (processingJob) return processingJob.status;
    
    // Check for failed jobs
    const failedJob = jobs.find((job: any) => job.status === 'failed');
    if (failedJob) return 'failed';
    
    // Return the most recent job status
    return jobs[jobs.length - 1]?.status || null;
  };

  const getJobForScript = (scriptId: number) => {
    if (!Array.isArray(parseJobs)) return null;
    // Find the most recent completed job, or the most recent job if none completed (handle both string and number IDs)
    const jobs = parseJobs.filter((job: any) => 
      job.scriptId === scriptId || 
      job.scriptId === String(scriptId) || 
      String(job.scriptId) === String(scriptId)
    );
    if (jobs.length === 0) return null;
    
    const completedJob = jobs.find((job: any) => job.status === 'completed');
    if (completedJob) return completedJob;
    
    // Return the most recent job
    return jobs[jobs.length - 1] || null;
  };

  // Delete script mutation
  const deleteMutation = useMutation({
    mutationFn: async (scriptId: number) => {
      return await apiRequest("DELETE", `/api/scripts/${scriptId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scripts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Project deleted",
        description: "The project has been permanently deleted."
      });
      setDeleteDialogOpen(false);
      setScriptToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete project",
        description: error.message || "An error occurred while deleting the project",
        variant: "destructive"
      });
    }
  });

  const handleDeleteClick = (script: any) => {
    setScriptToDelete(script);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (scriptToDelete) {
      deleteMutation.mutate(scriptToDelete.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Projects</h1>
        <p className="text-muted-foreground">
          Manage all your uploaded scripts and parsing jobs
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="title">Title A-Z</SelectItem>
            <SelectItem value="size">Largest First</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterBy} onValueChange={setFilterBy}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            <SelectItem value="parsed">Parsed Only</SelectItem>
            <SelectItem value="unparsed">Unparsed Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      {isLoadingScripts ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                <div className="h-6 bg-muted rounded w-20"></div>
              </CardContent>
              <CardFooter>
                <div className="h-9 bg-muted rounded w-full"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : filteredScripts.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScripts.map((script: any) => {
            const jobStatus = getJobStatus(script.id);
            const job = getJobForScript(script.id);
            

            
            return (
              <Card key={script.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="truncate">{script.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(script.createdAt)}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/columns/${script.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/script-health/${script.id}`}>
                            <Heart className="h-4 w-4 mr-2" />
                            Script Health Score
                          </Link>
                        </DropdownMenuItem>
                        {jobStatus === 'completed' && (
                          <DropdownMenuItem asChild>
                            <a href={`/api/jobs/${job?.id}/download`}>
                              <Download className="h-4 w-4 mr-2" />
                              Download CSV
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDeleteClick(script)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{script.pageCount} pages</span>
                      <span>•</span>
                      <span>{script.fileType.toUpperCase()}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      {jobStatus === 'completed' ? (
                        <Badge variant="success">
                          Parsed ✨
                        </Badge>
                      ) : jobStatus === 'processing' || jobStatus === 'pending' ? (
                        <Badge variant="secondary">
                          Processing
                        </Badge>
                      ) : jobStatus === 'failed' ? (
                        <Badge variant="destructive">
                          Failed
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Ready to Parse
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex gap-2">
                  {jobStatus === 'completed' ? (
                    <>
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link href={`/review/${job?.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Link>
                      </Button>
                      <Button size="sm" asChild className="flex-1">
                        <a href={`/api/jobs/${job?.id}/download`}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </>
                  ) : jobStatus === 'processing' || jobStatus === 'pending' ? (
                    <Button variant="outline" size="sm" disabled className="flex-1">
                      Processing...
                    </Button>
                  ) : (
                    <Button size="sm" asChild className="flex-1">
                      <Link href={`/columns/${script.id}`}>
                        Start Parsing <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || filterBy !== 'all' ? 'No projects found' : 'No projects yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm || filterBy !== 'all' 
                  ? 'Try adjusting your search terms or filters'
                  : 'Upload your first script to get started with IndieShots'
                }
              </p>
              {!searchTerm && filterBy === 'all' && (
                <Button asChild>
                  <Link href="/upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Your First Script
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {filteredScripts.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{filteredScripts.length}</div>
              <div className="text-sm text-muted-foreground">Total Projects</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {filteredScripts.filter((script: any) => getJobStatus(script.id) === 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">Parsed</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {filteredScripts.reduce((total: number, script: any) => total + (script.pageCount || 0), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Pages</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {new Set(filteredScripts.map((script: any) => script.fileType)).size}
              </div>
              <div className="text-sm text-muted-foreground">File Types</div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{scriptToDelete?.title}"? This action cannot be undone and will permanently remove the project and all associated parsing jobs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}