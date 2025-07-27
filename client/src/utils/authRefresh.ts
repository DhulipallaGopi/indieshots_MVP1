/**
 * Force refresh user authentication with latest database tier information
 */
export async function forceRefreshAuth(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/refresh-tier', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('Auth tier refreshed successfully');
      return true;
    } else {
      console.error('Failed to refresh auth tier:', response.status);
      return false;
    }
  } catch (error) {
    console.error('Error refreshing auth:', error);
    return false;
  }
}