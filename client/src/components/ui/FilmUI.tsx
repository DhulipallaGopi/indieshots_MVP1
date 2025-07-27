import React from 'react';
import { 
  ClapperboardLoading, 
  AccessDeniedAnimation, 
  ProjectorErrorAnimation, 
  BufferingAnimation 
} from './film-animations';
import { useFilmAnimations, FilmAnimationState } from '@/hooks/useFilmAnimations';

interface FilmUIProps {
  children: React.ReactNode;
  animationState?: FilmAnimationState;
}

/**
 * FilmUI Wrapper Component
 * Provides cinematic loading states and error animations for any content
 */
export const FilmUI: React.FC<FilmUIProps> = ({ children, animationState }) => {
  // If no animation state is provided, render children normally
  if (!animationState) {
    return <>{children}</>;
  }

  // Show loading animation
  if (animationState.isLoading) {
    return <ClapperboardLoading message={animationState.message} />;
  }

  // Show buffering animation
  if (animationState.isBuffering) {
    return <BufferingAnimation message={animationState.message} />;
  }

  // Show error animations based on type
  if (animationState.hasError) {
    switch (animationState.errorType) {
      case 'auth':
        return <AccessDeniedAnimation message={animationState.message} />;
      case 'server':
        return <ProjectorErrorAnimation message={animationState.message} />;
      case 'network':
        return <BufferingAnimation message={animationState.message} />;
      default:
        return <ProjectorErrorAnimation message={animationState.message} />;
    }
  }

  // No animation state active, render children
  return <>{children}</>;
};

/**
 * FilmLoadingOverlay Component
 * Can be used as an overlay on top of existing content
 */
export const FilmLoadingOverlay: React.FC<{
  isVisible: boolean;
  type?: 'loading' | 'buffering';
  message?: string;
}> = ({ isVisible, type = 'loading', message }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      {type === 'loading' ? (
        <ClapperboardLoading message={message} />
      ) : (
        <BufferingAnimation message={message} />
      )}
    </div>
  );
};

/**
 * Higher-order component for adding film animations to any component
 */
export function withFilmAnimations<T extends object>(Component: React.ComponentType<T>) {
  return React.forwardRef<any, T & { filmAnimations?: FilmAnimationState }>((props, ref) => {
    const { filmAnimations, ...otherProps } = props;
    
    return (
      <FilmUI animationState={filmAnimations}>
        <Component {...(otherProps as T)} ref={ref} />
      </FilmUI>
    );
  });
}

// Export the hook for easy access
export { useFilmAnimations };