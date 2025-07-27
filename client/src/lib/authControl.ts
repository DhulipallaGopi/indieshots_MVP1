// Authentication control utility to prevent auto-relogin after logout
export class AuthControl {
  private static readonly AUTH_DISABLED_KEY = 'indieshots_auth_disabled';
  
  static disableAuth(): void {
    localStorage.setItem(this.AUTH_DISABLED_KEY, 'true');
    console.log('Authentication disabled');
  }
  
  static enableAuth(): void {
    localStorage.removeItem(this.AUTH_DISABLED_KEY);
    console.log('Authentication enabled');
  }
  
  static isAuthDisabled(): boolean {
    return localStorage.getItem(this.AUTH_DISABLED_KEY) === 'true';
  }
  
  static clearAllAuthData(): void {
    // Clear Firebase-related localStorage
    const firebaseKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('firebase:')) {
        firebaseKeys.push(key);
      }
    }
    firebaseKeys.forEach(key => localStorage.removeItem(key));
    
    // Clear session storage
    sessionStorage.clear();
    
    console.log('All auth data cleared');
  }
}