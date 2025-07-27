import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Image, Infinity, ArrowRight } from 'lucide-react';
import { useLocation } from 'wouter';

interface UpgradePromptProps {
  feature: 'storyboards' | 'shots' | 'pages';
  currentUsage?: number;
  limit?: number;
  message?: string;
  compact?: boolean;
}

export function UpgradePrompt({ feature, currentUsage, limit, message, compact = false }: UpgradePromptProps) {
  const [, setLocation] = useLocation();

  const featureConfig = {
    storyboards: {
      icon: Image,
      title: 'Storyboard Generation',
      description: 'Generate visual storyboards with AI-powered image creation',
      benefitText: 'Create stunning visual storyboards'
    },
    shots: {
      icon: Infinity,
      title: 'Unlimited Shots',
      description: 'Generate unlimited shots per scene for complex productions',
      benefitText: 'Generate unlimited shots per scene'
    },
    pages: {
      icon: Infinity,
      title: 'Unlimited Pages',
      description: 'Process unlimited script pages per month',
      benefitText: 'Process unlimited script pages'
    }
  };

  const config = featureConfig[feature];
  const IconComponent = config.icon;

  if (compact) {
    return (
      <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
              <Crown className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
                {message || `${config.title} is a Pro feature`}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">
                Upgrade to unlock {config.benefitText}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setLocation('/upgrade')} className="bg-indigo-600 hover:bg-indigo-700">
            Upgrade
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
              <IconComponent className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-lg text-indigo-800 dark:text-indigo-200">
                Unlock {config.title}
              </CardTitle>
              <CardDescription className="text-indigo-600 dark:text-indigo-400">
                {config.description}
              </CardDescription>
            </div>
          </div>
          <Badge variant="success" className="text-xs">Pro Feature</Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {message && (
            <p className="text-sm text-gray-700 dark:text-gray-300 bg-indigo-100/50 dark:bg-indigo-900/30 p-3 rounded-md border border-indigo-200/50 dark:border-indigo-700/30">
              {message}
            </p>
          )}
          
          {currentUsage !== undefined && limit !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-indigo-600 dark:text-indigo-400">Current Usage</span>
                <span className="font-medium text-indigo-800 dark:text-indigo-200">
                  {currentUsage}/{limit === -1 ? '∞' : limit}
                </span>
              </div>
              <div className="w-full bg-indigo-200 dark:bg-indigo-800 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: limit === -1 ? '0%' : `${Math.min(100, (currentUsage / limit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => setLocation('/upgrade')} 
              className="bg-indigo-600 hover:bg-indigo-700 flex-1"
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Pro
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setLocation('/upgrade')}
              className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
            >
              Compare Plans
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default UpgradePrompt;