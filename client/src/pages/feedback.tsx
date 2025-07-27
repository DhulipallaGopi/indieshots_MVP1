import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Check, Star } from "lucide-react";

interface FeedbackProps {
  id: string;
}

export default function Feedback({ id }: FeedbackProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  
  // Fetch parse job details
  const { data: parseJob, isLoading: isLoadingJob } = useQuery({
    queryKey: [`/api/jobs/${id}`],
  });
  
  // Fetch associated script
  const { data: script, isLoading: isLoadingScript } = useQuery({
    queryKey: [`/api/scripts/${parseJob?.scriptId}`],
    enabled: !!parseJob?.scriptId,
  });
  
  // Submit feedback
  const submitFeedback = () => {
    // In a real app, this would send the feedback to the server
    toast({
      title: "Feedback submitted",
      description: "Thank you for your feedback!",
    });
    setSubmitted(true);
  };
  
  // Navigate back to review
  const goBack = () => {
    setLocation(`/review/${id}`);
  };
  
  // Navigate to dashboard
  const goToDashboard = () => {
    setLocation('/dashboard');
  };
  
  // Show loading state
  if (isLoadingJob || isLoadingScript) {
    return (
      <div className="max-w-3xl mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Show error if job not found or not completed
  if (!parseJob || parseJob.status !== 'completed') {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">
                {!parseJob ? "Parse job not found" : "Parse job not completed"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {!parseJob 
                  ? "The requested parse job could not be found." 
                  : "This parse job is not yet complete. Please complete the parsing step first."}
              </p>
              <Button onClick={() => setLocation(!parseJob ? '/upload' : `/parse/${id}`)}>
                {!parseJob ? "Go to Upload" : "Go to Parse"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Show submitted confirmation
  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-2xl font-medium mb-2">Feedback Submitted</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Thank you for your feedback! Your insights help us improve the Script-to-Shot service.
              </p>
              <Button onClick={goToDashboard}>
                Return to Dashboard
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
        <h2 className="text-2xl font-semibold mb-1">Provide Feedback</h2>
        <p className="text-muted-foreground">
          Help us improve by sharing your thoughts
        </p>
      </div>
      
      {/* Feedback Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Rate Your Experience</CardTitle>
          <CardDescription>
            Please rate the quality of the shot list generated from "{script?.title}"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Rate the overall quality
              </label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="p-1"
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating ? "fill-primary text-primary" : "text-muted"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            
            {/* Text Feedback */}
            <div>
              <label htmlFor="feedback" className="block text-sm font-medium mb-2">
                Additional comments
              </label>
              <Textarea
                id="feedback"
                rows={5}
                placeholder="Please share any additional feedback about the quality of the parsed script, suggestions for improvement, or features you'd like to see..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={submitFeedback}
            disabled={rating === 0}
          >
            Submit Feedback
          </Button>
        </CardFooter>
      </Card>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={goBack}>
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back to Review
        </Button>
        
        <Button onClick={goToDashboard}>
          Go to Dashboard
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
