import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { 
  ClapperboardLoading, 
  AccessDeniedAnimation, 
  ProjectorErrorAnimation, 
  BufferingAnimation 
} from '@/components/ui/film-animations';

export default function FilmAnimationsDemo() {
  const [, setLocation] = useLocation();
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);

  const animations = [
    {
      id: 'clapperboard',
      name: 'Clapperboard Loading',
      description: 'Used for general loading states like scene data loading',
      component: <ClapperboardLoading message="Scene Loading..." />
    },
    {
      id: 'access-denied',
      name: 'Access Denied (Auth Error)',
      description: 'Security guard animation for authentication failures',
      component: <AccessDeniedAnimation message="Access Denied. You're not on the guest list." />
    },
    {
      id: 'projector-error',
      name: 'Projector Error (Server Error)',
      description: 'Film projector with "NO SIGNAL" for server/system errors',
      component: <ProjectorErrorAnimation message="Projector Jammed! Please try again later." />
    },
    {
      id: 'buffering',
      name: 'Film Reel Buffering (Network Lag)',
      description: 'Spinning film reel with bouncing popcorn for network issues',
      component: <BufferingAnimation message="Catching up… the scene is buffering." />
    }
  ];

  const goBack = () => {
    setLocation('/dashboard');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <Button variant="outline" onClick={goBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold mb-2">Film Industry Animations</h1>
        <p className="text-muted-foreground">
          Cinematic-themed animations for loading states, errors, and user feedback
        </p>
      </div>

      {/* Animation Preview Area */}
      {activeAnimation && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Live Preview</CardTitle>
              <Button variant="outline" onClick={() => setActiveAnimation(null)}>
                Close Preview
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-[400px] bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg flex items-center justify-center">
              {animations.find(anim => anim.id === activeAnimation)?.component}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Animation Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {animations.map((animation) => (
          <Card key={animation.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{animation.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{animation.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                  <div className="scale-75 transform">
                    {animation.component}
                  </div>
                </div>
                <Button 
                  onClick={() => setActiveAnimation(animation.id)}
                  className="w-full"
                  variant={activeAnimation === animation.id ? "default" : "outline"}
                >
                  {activeAnimation === animation.id ? "Currently Viewing" : "View Full Size"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Implementation Examples */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Implementation Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Usage in Components:</h4>
            <pre className="text-sm bg-background p-3 rounded border overflow-x-auto">
{`// Loading state replacement
if (isLoading) {
  return <ClapperboardLoading message="Loading scene data..." />;
}

// Error states with different animations
if (authError) {
  return <AccessDeniedAnimation />;
}

if (serverError) {
  return <ProjectorErrorAnimation />;
}

// Full-screen overlay during operations
{isGenerating && (
  <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
    <ClapperboardLoading message="Creating cinematic shots..." />
  </div>
)}`}
            </pre>
          </div>
          
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Current Integration:</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>Shot Generation Page:</strong> Clapperboard loading for scene data and shot generation</li>
              <li>• <strong>Scene Selection:</strong> Loading animation while fetching scenes</li>
              <li>• <strong>Authentication:</strong> Access denied animation for failed logins</li>
              <li>• <strong>API Errors:</strong> Projector error for server issues</li>
              <li>• <strong>Network Issues:</strong> Buffering animation for timeout/lag</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Animation Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Design Features:</h4>
              <ul className="text-sm space-y-1">
                <li>• Cinema-themed visual elements</li>
                <li>• Smooth CSS keyframe animations</li>
                <li>• Film grain overlay effects</li>
                <li>• Professional color schemes</li>
                <li>• Mobile-responsive design</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Technical Features:</h4>
              <ul className="text-sm space-y-1">
                <li>• Lightweight pure CSS animations</li>
                <li>• Custom React component wrappers</li>
                <li>• Configurable messages</li>
                <li>• TypeScript integration</li>
                <li>• Easy integration with existing UI</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}