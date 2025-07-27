// Simplified theme utilities that work with next-themes
export const getStoredTheme = (): string => {
  if (typeof window === 'undefined') return 'dark';
  return localStorage.getItem('theme') || 'dark';
};

export const setStoredTheme = (theme: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('theme', theme);
};

// Helper to check if system prefers dark theme
export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Apply theme class manually if needed
export const applyThemeClass = (theme: string): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.classList.remove('light', 'dark');

  if (theme === 'system') {
    const systemTheme = getSystemTheme();
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
};

// Initialize theme on app start
export const initializeTheme = (): void => {
  if (typeof window === 'undefined') return;
  
  const storedTheme = getStoredTheme();
  applyThemeClass(storedTheme);
};

// Set theme and persist to storage
export const setTheme = (theme: string): void => {
  setStoredTheme(theme);
  applyThemeClass(theme);
};

// Setup system theme change listener
export const setupSystemThemeListener = (): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = () => {
    const currentTheme = getStoredTheme();
    if (currentTheme === 'system') {
      applyThemeClass('system');
    }
  };
  
  mediaQuery.addEventListener('change', handleChange);
  
  // Return cleanup function
  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
};