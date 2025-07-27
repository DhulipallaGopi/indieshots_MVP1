import React from 'react';
import { Film, Camera, Video, Clapperboard, Sparkles, Star, Circle } from 'lucide-react';

interface CinematicShotAnimationProps {
  message?: string;
}

export const CinematicShotAnimation: React.FC<CinematicShotAnimationProps> = ({ 
  message = "Creating cinematic shots..." 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 bg-gradient-to-br from-indigo-50 via-slate-50 to-indigo-100 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 relative overflow-hidden rounded-lg border border-indigo-200 dark:border-indigo-800">
      {/* Subtle Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Minimal Floating Film Elements */}
        <div className="absolute top-8 left-8 animate-float-slow">
          <Film className="w-5 h-5 text-indigo-400 dark:text-indigo-300 opacity-10" />
        </div>
        <div className="absolute top-12 right-12 animate-float-delay-1">
          <Camera className="w-4 h-4 text-indigo-500 dark:text-indigo-400 opacity-10" />
        </div>
        <div className="absolute bottom-12 left-12 animate-float-delay-2">
          <Video className="w-6 h-6 text-indigo-400 dark:text-indigo-300 opacity-10" />
        </div>
        
        {/* Subtle Sparkle Effects */}
        <div className="absolute top-1/4 right-1/4 animate-twinkle">
          <Sparkles className="w-3 h-3 text-indigo-300 dark:text-indigo-400 opacity-15" />
        </div>
        <div className="absolute bottom-1/4 left-1/4 animate-twinkle-delay-1">
          <Star className="w-2 h-2 text-indigo-400 dark:text-indigo-300 opacity-15" />
        </div>
      </div>
      
      {/* Main Animation Container */}
      <div className="relative z-10 flex flex-col items-center space-y-6">
        {/* Clear Central Animation */}
        <div className="relative">
          {/* Main Clapperboard */}
          <div className="w-24 h-20 bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-800 rounded-lg border-2 border-indigo-400 dark:border-indigo-500 flex flex-col shadow-lg animate-bounce-subtle">
            {/* Clapperboard Top */}
            <div className="h-6 bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-t-md border-b-2 border-slate-600 flex items-center justify-center">
              <div className="text-white text-xs font-bold">SHOT</div>
            </div>
            
            {/* Clapperboard Body */}
            <div className="flex-1 flex items-center justify-center">
              <Film className="w-8 h-8 text-indigo-400 dark:text-indigo-300" />
            </div>
            
            {/* Animated stripes */}
            <div className="absolute top-0 left-0 right-0 h-6 rounded-t-md overflow-hidden">
              <div className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-slide-stripe"></div>
            </div>
          </div>
          
          {/* Clear Rotating Ring */}
          <div className="absolute inset-0 w-32 h-32 -m-4">
            <div className="w-full h-full rounded-full border-2 border-dashed border-indigo-400 dark:border-indigo-500 animate-spin-slow opacity-70"></div>
          </div>
          
          {/* Visible Orbiting Elements */}
          <div className="absolute inset-0 w-32 h-32 -m-4 animate-orbit">
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-indigo-100 dark:bg-indigo-900 rounded-full p-2 border border-indigo-300 dark:border-indigo-600">
              <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          
          <div className="absolute inset-0 w-32 h-32 -m-4 animate-orbit-reverse">
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-indigo-100 dark:bg-indigo-900 rounded-full p-2 border border-indigo-300 dark:border-indigo-600">
              <Video className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          
          <div className="absolute inset-0 w-32 h-32 -m-4 animate-orbit-slow">
            <div className="absolute top-1/2 -right-2 transform -translate-y-1/2 bg-indigo-100 dark:bg-indigo-900 rounded-full p-2 border border-indigo-300 dark:border-indigo-600">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>
        
        {/* Message */}
        <div className="text-center space-y-3">
          <h3 className="text-xl font-semibold text-indigo-900 dark:text-indigo-100">
            {message}
          </h3>
          
          {/* Progress Dots */}
          <div className="flex space-x-2 justify-center">
            <div className="w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-500 animate-pulse-sequence"></div>
            <div className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-pulse-sequence-delay-1"></div>
            <div className="w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-500 animate-pulse-sequence-delay-2"></div>
          </div>
          
          {/* Subtitle */}
          <p className="text-sm text-indigo-600 dark:text-indigo-300 animate-fade-in-out">
            Crafting your cinematic vision...
          </p>
        </div>
        
        {/* Minimal Film Strip */}
        <div className="flex space-x-1 opacity-20">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="w-4 h-5 bg-gradient-to-b from-indigo-400 to-indigo-500 dark:from-indigo-500 dark:to-indigo-600 rounded-sm animate-film-strip"
              style={{ animationDelay: `${i * 0.15}s` }}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};