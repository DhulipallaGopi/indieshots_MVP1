import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ColumnSelectorProps {
  availableColumns: readonly string[];
  selectedColumns: string[];
  onColumnChange: (column: string, checked: boolean) => void;
}

type ColumnInfo = {
  label: string;
  description: string;
  icon?: React.ReactNode;
};

const columnInfoMap: Record<string, ColumnInfo> = {
  sceneNumber: {
    label: "Scene Number",
    description: "Sequential numbering of scenes",
    icon: <span className="text-xs font-mono bg-primary/10 text-primary rounded-md h-5 w-5 flex items-center justify-center">#</span>
  },
  sceneHeading: {
    label: "Scene Heading",
    description: "INT/EXT and location descriptions",
    icon: <span className="text-xs font-mono bg-primary/10 text-primary rounded-md h-5 w-5 flex items-center justify-center">H</span>
  },
  location: {
    label: "Location",
    description: "Where the scene takes place",
    icon: <span className="text-xs font-mono bg-primary/10 text-primary rounded-md h-5 w-5 flex items-center justify-center">L</span>
  },
  time: {
    label: "Time",
    description: "Time of day (DAY, NIGHT, etc.)",
    icon: <span className="text-xs font-mono bg-primary/10 text-primary rounded-md h-5 w-5 flex items-center justify-center">T</span>
  },
  characters: {
    label: "Characters",
    description: "Characters present in the scene",
    icon: <span className="text-xs font-mono bg-primary/10 text-primary rounded-md h-5 w-5 flex items-center justify-center">C</span>
  },
  props: {
    label: "Props",
    description: "Key items needed in the scene",
    icon: <span className="text-xs font-mono bg-primary/10 text-primary rounded-md h-5 w-5 flex items-center justify-center">P</span>
  },
  tone: {
    label: "Tone",
    description: "Emotional tone of the scene",
    icon: <span className="text-xs font-mono bg-primary/10 text-primary rounded-md h-5 w-5 flex items-center justify-center">E</span>
  },
  cameraMovement: {
    label: "Camera Movement",
    description: "Suggested camera directions",
    icon: <span className="text-xs font-mono bg-primary/10 text-primary rounded-md h-5 w-5 flex items-center justify-center">M</span>
  },
  action: {
    label: "Action",
    description: "Brief description of action",
    icon: <span className="text-xs font-mono bg-primary/10 text-primary rounded-md h-5 w-5 flex items-center justify-center">A</span>
  },
  dialogue: {
    label: "Dialogue",
    description: "Important lines of dialogue",
    icon: <span className="text-xs font-mono bg-primary/10 text-primary rounded-md h-5 w-5 flex items-center justify-center">D</span>
  }
};

export function ColumnSelector({
  availableColumns,
  selectedColumns,
  onColumnChange
}: ColumnSelectorProps) {
  return (
    <div className="space-y-2">
      {availableColumns.map((column) => {
        const info = columnInfoMap[column] || { 
          label: column.charAt(0).toUpperCase() + column.slice(1), 
          description: "",
          icon: <span className="text-xs font-mono bg-primary/10 text-primary rounded-md h-5 w-5 flex items-center justify-center">{column.charAt(0).toUpperCase()}</span>
        };
        
        const isSelected = selectedColumns.includes(column);
        
        return (
          <div 
            key={column}
            className={cn(
              "flex items-start p-2.5 rounded-lg border transition-colors",
              isSelected 
                ? "border-primary/20 bg-primary/5" 
                : "border-border bg-background hover:bg-background/80"
            )}
          >
            <Checkbox 
              id={`column-${column}`} 
              checked={isSelected}
              onCheckedChange={(checked) => onColumnChange(column, !!checked)}
              className="h-5 w-5 mt-0.5"
            />
            
            <div className="ml-3 flex-1">
              <div className="flex items-center">
                {info.icon && <div className="mr-2">{info.icon}</div>}
                <Label 
                  htmlFor={`column-${column}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {info.label}
                </Label>
              </div>
              {info.description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {info.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
