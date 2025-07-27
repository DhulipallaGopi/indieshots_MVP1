import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Star, 
  Sparkles, 
  ArrowLeft, 
  TrendingUp, 
  Target,
  Eye,
  MessageCircle,
  Users,
  DollarSign
} from 'lucide-react';

export default function ScriptHealthComingSoon() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Heart className="h-16 w-16 text-indigo-600" />
              <Sparkles className="h-6 w-6 text-amber-500 absolute -top-1 -right-1" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Script Health Score
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Advanced AI-powered script analysis and improvement suggestions
          </p>
        </div>

        {/* Coming Soon Card */}
        <Card className="mb-8 bg-gradient-to-br from-indigo-50 to-amber-50 dark:from-indigo-950/30 dark:to-amber-950/30 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-2">
              <Star className="h-6 w-6" />
              Coming Soon
              <Star className="h-6 w-6" />
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
              We're building an incredible AI-powered script analysis tool that will revolutionize your screenplay development process.
            </p>
            <Badge variant="success" className="text-sm px-4 py-2">
              In Development ✨
            </Badge>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-indigo-200 dark:border-indigo-800 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <TrendingUp className="h-5 w-5" />
                Health Score Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Get comprehensive scores for structure, pacing, character development, dialogue, and marketability.
              </p>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 dark:border-indigo-800 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <Target className="h-5 w-5" />
                Improvement Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Receive AI-powered recommendations to strengthen your script's weaknesses and enhance its strengths.
              </p>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 dark:border-indigo-800 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <Users className="h-5 w-5" />
                Market Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Understand your target audience, genre positioning, and commercial viability insights.
              </p>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 dark:border-indigo-800 hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                <Eye className="h-5 w-5" />
                Visual Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Beautiful, professional reports with charts, graphs, and actionable insights for your screenplay.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
          <CardContent className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">Stay Updated</h2>
            <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
              This powerful feature will be available soon. Continue using IndieShots for your shot list generation needs!
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setLocation('/projects')}
                className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
              <Button 
                size="lg"
                onClick={() => setLocation('/dashboard')}
                className="bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}