import { useState, useCallback } from 'react';

export interface FilmAnimationState {
  isLoading: boolean;
  hasError: boolean;
  errorType?: 'auth' | 'server' | 'network';
  isBuffering: boolean;
  message?: string;
}

/**
 * Custom hook for managing film-themed animations and loading states
 * Provides centralized control over cinematic UI feedback
 */
export const useFilmAnimations = () => {
  const [animationState, setAnimationState] = useState<FilmAnimationState>({
    isLoading: false,
    hasError: false,
    isBuffering: false,
  });

  const showLoading = useCallback((message?: string) => {
    setAnimationState({
      isLoading: true,
      hasError: false,
      isBuffering: false,
      message,
    });
  }, []);

  const showError = useCallback((errorType: 'auth' | 'server' | 'network', message?: string) => {
    setAnimationState({
      isLoading: false,
      hasError: true,
      errorType,
      isBuffering: false,
      message,
    });
  }, []);

  const showBuffering = useCallback((message?: string) => {
    setAnimationState({
      isLoading: false,
      hasError: false,
      isBuffering: true,
      message,
    });
  }, []);

  const hideAll = useCallback(() => {
    setAnimationState({
      isLoading: false,
      hasError: false,
      isBuffering: false,
    });
  }, []);

  const getErrorMessage = useCallback((errorType?: 'auth' | 'server' | 'network'): string => {
    switch (errorType) {
      case 'auth':
        return "Access Denied. You're not on the guest list.";
      case 'server':
        return "Projector Jammed! Please try again later.";
      case 'network':
        return "Catching up… the scene is buffering.";
      default:
        return "Something went wrong with the production.";
    }
  }, []);

  return {
    animationState,
    showLoading,
    showError,
    showBuffering,
    hideAll,
    getErrorMessage,
  };
};