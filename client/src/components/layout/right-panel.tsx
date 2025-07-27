import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ColumnSelector } from "@/components/ui/column-selector";
import { columnTypes } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { 
  LayoutGrid, 
  Zap, 
  FileText, 
  DownloadCloud,
  Settings2 
} from "lucide-react";

interface RightPanelProps {
  collapsed: boolean;
}

export default function RightPanel({ collapsed }: RightPanelProps) {
  const [location] = useLocation();
  const [jobId, setJobId] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [advancedOptions, setAdvancedOptions] = useState({
    groupByLocation: false,
    aiShotSuggestions: false,
    exportNotesColumn: false
  });

  // Extract job ID from URL if on columns, parse, or review page
  useEffect(() => {
    const match = location.match(/\/(columns|parse|review)\/(\d+)/);
    if (match && match[2]) {
      setJobId(match[2]);
    } else {
      setJobId(null);
    }
  }, [location]);

  // Fetch parse job data to get existing column selections
  const { data: parseJob } = useQuery({
    queryKey: [`/api/jobs/${jobId}`],
    enabled: !!jobId,
  });

  // Load existing column selections from parse job
  useEffect(() => {
    if (parseJob?.selectedColumns && parseJob.selectedColumns.length > 0) {
      setSelectedColumns(parseJob.selectedColumns);
    } else if (selectedColumns.length === 0) {
      // Only set defaults if no columns are selected yet
      setSelectedColumns(["sceneHeading", "location", "characters", "action"]);
    }
  }, [parseJob]);

  // Handle column selection change
  const handleColumnChange = (column: string, checked: boolean) => {
    if (checked) {
      setSelectedColumns(prev => [...prev, column]);
    } else {
      setSelectedColumns(prev => prev.filter(c => c !== column));
    }
  };

  // Handle advanced option change
  const handleAdvancedOptionChange = (option: keyof typeof advancedOptions, checked: boolean) => {
    setAdvancedOptions(prev => ({
      ...prev,
      [option]: checked
    }));
  };

  // Apply column settings
  const applySettings = async () => {
    if (!jobId) return;
    
    try {
      await apiRequest("PATCH", `/api/jobs/${jobId}/columns`, {
        columns: selectedColumns
      });
      
      // If on columns page, navigate to parse
      if (location.includes("/columns/")) {
        window.location.href = `/parse/${jobId}`;
      }
    } catch (error) {
      console.error("Failed to update columns:", error);
    }
  };

  // Don't show right panel on home page or when no job is active
  if (location === "/" || (!location.includes("/columns/") && !location.includes("/parse/") && !location.includes("/review/"))) {
    return null;
  }

  // Calculate the CSS width based on collapsed state
  const panelWidth = collapsed ? "w-0 overflow-hidden" : "w-[320px]";

  return (
    <div className={cn("bg-card border-l border-border flex-shrink-0 transition-all duration-300 ease-in-out", panelWidth)}>
      <div className="h-full flex flex-col">
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-center">
            <Settings2 className="h-5 w-5 mr-3 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Shot List Settings</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Configure your export options</p>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            <div>
              <div className="flex items-center mb-3">
                <LayoutGrid className="h-4 w-4 mr-2 text-primary" />
                <h3 className="text-base font-medium">Columns</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Select which data to include in your shot list
              </p>
              <ColumnSelector 
                availableColumns={columnTypes}
                selectedColumns={selectedColumns}
                onColumnChange={handleColumnChange}
              />
            </div>
            
            <div className="pt-2">
              <div className="flex items-center mb-3">
                <FileText className="h-4 w-4 mr-2 text-primary" />
                <h3 className="text-base font-medium">Output Format</h3>
              </div>
              <div className="bg-background rounded-lg p-4 border border-border">
                <div className="flex items-center space-x-2 mb-3">
                  <Checkbox id="csv-format" defaultChecked />
                  <Label htmlFor="csv-format" className="font-medium">CSV</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="xlsx-format" disabled />
                  <Label htmlFor="xlsx-format" className="flex items-center">
                    Excel
                    <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Pro</span>
                  </Label>
                </div>
              </div>
            </div>
            
            <div className="pt-2">
              <div className="flex items-center mb-3">
                <DownloadCloud className="h-4 w-4 mr-2 text-primary" />
                <h3 className="text-base font-medium">Export Options</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 bg-background rounded-lg p-3 border border-border">
                  <Checkbox 
                    id="groupByLocation" 
                    checked={advancedOptions.groupByLocation}
                    onCheckedChange={(checked) => 
                      handleAdvancedOptionChange('groupByLocation', checked as boolean)
                    }
                  />
                  <div>
                    <Label htmlFor="groupByLocation" className="font-medium">Group by location</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Organize shots by filming location
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 bg-background rounded-lg p-3 border border-border">
                  <Checkbox 
                    id="exportNotesColumn" 
                    checked={advancedOptions.exportNotesColumn}
                    onCheckedChange={(checked) => 
                      handleAdvancedOptionChange('exportNotesColumn', checked as boolean)
                    }
                  />
                  <div>
                    <Label htmlFor="exportNotesColumn" className="font-medium">Include notes column</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add empty column for production notes
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 bg-background/50 rounded-lg p-3 border border-border opacity-75">
                  <Checkbox 
                    id="aiShotSuggestions" 
                    checked={advancedOptions.aiShotSuggestions}
                    onCheckedChange={(checked) => 
                      handleAdvancedOptionChange('aiShotSuggestions', checked as boolean)
                    }
                    disabled
                  />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Label htmlFor="aiShotSuggestions" className="font-medium">AI shot suggestions</Label>
                      <span className="ml-2 text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-1.5 py-0.5 rounded font-medium">PRO</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Automatically generate camera angles
                    </p>
                  </div>
                  <Zap className="h-5 w-5 text-amber-500 ml-auto flex-shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-border">
          <Button 
            className="w-full font-medium h-10 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90" 
            onClick={applySettings}
            disabled={selectedColumns.length === 0}
          >
            Apply Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
