import * as React from "react";
import { useState, useRef } from "react";
import { cn, isValidFileType, isValidFileSize, formatFileSize } from "@/lib/utils";
import { Upload, FileWarning, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps extends React.HTMLAttributes<HTMLDivElement> {
  onFileChange: (file: File | null) => void;
  onTextChange: (text: string) => void;
  maxSize?: number; // in bytes
  acceptedFileTypes?: string[];
  defaultText?: string;
  pageCount?: number;
  userTier?: string;
  totalPages?: number;
}

export function FileUpload({
  className,
  onFileChange,
  onTextChange,
  maxSize = 10 * 1024 * 1024, // 10MB default (increased for PDF support)
  acceptedFileTypes = [".pdf", ".docx", ".txt"],
  defaultText = "",
  pageCount = 0,
  userTier = 'free',
  totalPages = 5,
  ...props
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scriptText, setScriptText] = useState(defaultText);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxSize) {
      setError(`File size is too large. Maximum allowed is ${formatFileSize(maxSize)}.`);
      toast({
        title: "File too large",
        description: `Maximum allowed size is ${formatFileSize(maxSize)}.`,
        variant: "destructive",
      });
      return false;
    }

    // Check file type
    const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;
    if (!acceptedFileTypes.includes(fileExt)) {
      setError(`Invalid file type. Accepted types: ${acceptedFileTypes.join(", ")}`);
      toast({
        title: "Invalid file type",
        description: `Accepted types: ${acceptedFileTypes.join(", ")}`,
        variant: "destructive",
      });
      return false;
    }

    setError(null);
    return true;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const uploadedFile = e.dataTransfer.files[0];
      if (validateFile(uploadedFile)) {
        setFile(uploadedFile);
        onFileChange(uploadedFile);
        
        // Clear textarea when file is uploaded
        setScriptText("");
        onTextChange("");
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const uploadedFile = e.target.files[0];
      if (validateFile(uploadedFile)) {
        setFile(uploadedFile);
        onFileChange(uploadedFile);
        
        // Clear textarea when file is uploaded
        setScriptText("");
        onTextChange("");
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScriptText(e.target.value);
    onTextChange(e.target.value);
    
    // Clear file when text is entered
    if (e.target.value && file) {
      setFile(null);
      onFileChange(null);
    }
  };

  // Calculate page count from text
  const estimatedPages = Math.ceil(scriptText.split(/\s+/).filter(word => word.length > 0).length / 250);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
    onFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-6", className)} {...props}>
      {/* File Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          dragActive ? "border-primary bg-muted/50" : "border-border",
          error ? "border-destructive" : ""
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={acceptedFileTypes.join(",")}
          onChange={handleFileInput}
        />

        {error ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <FileWarning className="h-10 w-10 text-destructive" />
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={() => setError(null)}>
              Try Again
            </Button>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={removeFile}>
              <FileX className="h-4 w-4 mr-2" />
              Remove File
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center space-y-3 mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Drag and drop your script file</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Supported formats: PDF, DOCX, TXT (max 5MB)
              </p>
            </div>

            <Button onClick={handleButtonClick} className="mb-4">
              <Upload className="h-5 w-5 mr-2" />
              Browse Files
            </Button>
          </>
        )}
      </div>

      {/* Or Divider */}
      <div className="flex items-center">
        <div className="flex-1 border-t border-border"></div>
        <div className="px-4 text-sm text-muted-foreground">OR</div>
        <div className="flex-1 border-t border-border"></div>
      </div>

      {/* Paste Script Area */}
      <div>
        <label
          htmlFor="script"
          className="block text-sm font-medium mb-2"
        >
          Paste your script here
        </label>
        <div className="relative">
          <Textarea
            id="script"
            rows={12}
            className="font-mono resize-none"
            placeholder="INT. COFFEE SHOP - DAY&#10;&#10;A busy café filled with CUSTOMERS. JANE (30s, professional) sits alone at a corner table, working on her laptop.&#10;&#10;JOHN (30s, casual) enters, looks around, and approaches the counter."
            value={scriptText}
            onChange={handleTextareaChange}
          />
          <div className="absolute right-2 bottom-2 text-xs bg-background px-2 py-1 rounded text-muted-foreground">
            <span>{estimatedPages || 0}</span> pages (approx.)
          </div>
        </div>
      </div>
    </div>
  );
}
