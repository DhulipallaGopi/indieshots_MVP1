import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, 
  Target, 
  TrendingUp, 
  Users, 
  MessageCircle, 
  Eye, 
  DollarSign,
  Star,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Film,
  Clock,
  Award
} from 'lucide-react';

interface HealthScore {
  overall: number;
  structure: number;
  pacing: number;
  characterDevelopment: number;
  dialogue: number;
  visualStorytelling: number;
  marketability: number;
}

interface ImprovementSuggestion {
  category: string;
  priority: 'high' | 'medium' | 'low';
  suggestion: string;
  example?: string;
  reasoning: string;
}

interface ScriptHealthReport {
  healthScore: HealthScore;
  strengths: string[];
  improvements: ImprovementSuggestion[];
  genre: string;
  mood: string;
  targetAudience: string;
  marketingTags: string[];
  oneLinePitch: string;
  estimatedBudget: string;
  productionComplexity: string;
  lastUpdated?: string;
}

interface ScriptHealthPageProps {
  scriptId: string;
}

export default function ScriptHealthPage({ scriptId }: ScriptHealthPageProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch existing health analysis
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['/api/scripts', scriptId, 'health'],
    enabled: !!scriptId,
  });

  // Generate new health analysis
  const generateAnalysis = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/scripts/${scriptId}/health`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to generate health analysis');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scripts', scriptId, 'health'] });
    },
  });

  const analysis: ScriptHealthReport | undefined = (healthData as any)?.analysis;
  const hasAnalysis = !!analysis;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  const getBudgetIcon = (budget: string) => {
    switch (budget) {
      case 'micro': return '💰';
      case 'low': return '💰💰';
      case 'medium': return '💰💰💰';
      case 'high': return '💰💰💰💰';
      default: return '💰';
    }
  };

  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'simple': return '🟢';
      case 'moderate': return '🟡';
      case 'complex': return '🔴';
      default: return '🟡';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <Lightbulb className="h-4 w-4 text-blue-500" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading script health analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Heart className="h-8 w-8 text-red-500" />
              Script Health Score
            </h1>
            <p className="text-muted-foreground mt-2">
              Get AI-powered insights and creative improvement suggestions for your screenplay
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation('/projects')}
            >
              Back to Projects
            </Button>
            <Button
              onClick={() => generateAnalysis.mutate()}
              disabled={generateAnalysis.isPending}
            >
              {generateAnalysis.isPending ? 'Analyzing...' : hasAnalysis ? 'Refresh Analysis' : 'Generate Health Score'}
            </Button>
          </div>
        </div>

        {!hasAnalysis && !generateAnalysis.isPending && (
          <Alert className="mb-8">
            <Star className="h-4 w-4" />
            <AlertDescription>
              Click "Generate Health Score" to get AI-powered creative feedback and improvement suggestions for your script.
            </AlertDescription>
          </Alert>
        )}

        {generateAnalysis.isPending && (
          <Alert className="mb-8">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <AlertDescription>
              Analyzing your script... This may take a moment as our AI reviews structure, pacing, characters, and more.
            </AlertDescription>
          </Alert>
        )}

        {analysis && (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="scores">Detailed Scores</TabsTrigger>
              <TabsTrigger value="improvements">Improvements</TabsTrigger>
              <TabsTrigger value="marketing">Marketing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Overall Score Card */}
              <Card className="text-center">
                <CardHeader>
                  <CardTitle className="text-2xl">Overall Health Score</CardTitle>
                  <CardDescription>Based on structure, pacing, character development, and more</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center space-x-8">
                    <div className="text-center">
                      <div className={`text-6xl font-bold ${getScoreColor(analysis.healthScore.overall)}`}>
                        {analysis.healthScore.overall}
                      </div>
                      <div className="text-sm text-muted-foreground">out of 100</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getScoreColor(analysis.healthScore.overall)}`}>
                        {getScoreGrade(analysis.healthScore.overall)}
                      </div>
                      <div className="text-sm text-muted-foreground">Grade</div>
                    </div>
                  </div>
                  <Progress 
                    value={analysis.healthScore.overall} 
                    className="mt-6 h-3"
                  />
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Genre</p>
                        <p className="text-2xl font-bold">{analysis.genre}</p>
                      </div>
                      <Film className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Estimated Budget</p>
                        <p className="text-2xl font-bold">{getBudgetIcon(analysis.estimatedBudget)} {analysis.estimatedBudget}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Production Complexity</p>
                        <p className="text-2xl font-bold">{getComplexityIcon(analysis.productionComplexity)} {analysis.productionComplexity}</p>
                      </div>
                      <Target className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Strengths */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Key Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.strengths.map((strength, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Award className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                        <span className="text-sm">{strength}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* One-Line Pitch */}
              <Card>
                <CardHeader>
                  <CardTitle>One-Line Pitch</CardTitle>
                  <CardDescription>AI-generated marketing description</CardDescription>
                </CardHeader>
                <CardContent>
                  <blockquote className="text-lg italic border-l-4 border-primary pl-4">
                    "{analysis.oneLinePitch}"
                  </blockquote>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scores" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(analysis.healthScore).map(([key, score]) => {
                  if (key === 'overall') return null;
                  
                  const icons: Record<string, any> = {
                    structure: Target,
                    pacing: TrendingUp,
                    characterDevelopment: Users,
                    dialogue: MessageCircle,
                    visualStorytelling: Eye,
                    marketability: DollarSign,
                  };
                  
                  const Icon = icons[key] || Star;
                  const displayName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                  
                  return (
                    <Card key={key}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-primary" />
                            <span className="font-medium">{displayName}</span>
                          </div>
                          <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                            {score}
                          </div>
                        </div>
                        <Progress value={score} className="h-2" />
                        <div className="mt-2 text-sm text-muted-foreground">
                          Grade: {getScoreGrade(score)}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="improvements" className="space-y-6">
              <div className="space-y-4">
                {analysis.improvements.map((improvement, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {getPriorityIcon(improvement.priority)}
                          {improvement.category}
                        </CardTitle>
                        <Badge variant={improvement.priority === 'high' ? 'destructive' : improvement.priority === 'medium' ? 'default' : 'secondary'}>
                          {improvement.priority} priority
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm mb-4">{improvement.suggestion}</p>
                      {improvement.example && (
                        <div className="bg-muted p-3 rounded-md mb-4">
                          <p className="text-sm font-medium mb-1">Example:</p>
                          <p className="text-sm text-muted-foreground">{improvement.example}</p>
                        </div>
                      )}
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm font-medium mb-1">Why this helps:</p>
                        <p className="text-sm text-blue-700">{improvement.reasoning}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="marketing" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Target Audience</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg">{analysis.targetAudience}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Mood & Tone</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg">{analysis.mood}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Marketing Tags</CardTitle>
                  <CardDescription>Keywords for promoting your script</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.marketingTags.map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Production Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Estimated Budget</p>
                      <p className="text-lg">{getBudgetIcon(analysis.estimatedBudget)} {analysis.estimatedBudget.charAt(0).toUpperCase() + analysis.estimatedBudget.slice(1)} Budget</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Production Complexity</p>
                      <p className="text-lg">{getComplexityIcon(analysis.productionComplexity)} {analysis.productionComplexity.charAt(0).toUpperCase() + analysis.productionComplexity.slice(1)} Production</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}