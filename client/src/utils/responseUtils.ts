/**
 * Safe response handling utilities to prevent "body stream already read" errors
 * in deployment environments
 */

export async function safeResponseHandler(response: Response): Promise<any> {
  try {
    // Clone the response to avoid "body stream already read" errors
    const responseClone = response.clone();
    
    if (!response.ok) {
      let errorMessage = `Server error: ${response.status}`;
      try {
        // Use original response for error handling
        const text = await response.text();
        if (text.trim()) {
          try {
            const parsed = JSON.parse(text);
            errorMessage = parsed.message || parsed.error || errorMessage;
          } catch {
            // If JSON parsing fails, check if it's HTML error page
            if (text.includes('<html>') || text.includes('<!DOCTYPE')) {
              errorMessage = `Server error (${response.status}): Service temporarily unavailable`;
            } else {
              errorMessage = text.substring(0, 200) || errorMessage;
            }
          }
        }
      } catch (textError) {
        console.error('Failed to read error response:', textError);
      }
      throw new Error(errorMessage);
    }
    
    // Use cloned response for success handling
    const text = await responseClone.text();
    if (!text.trim()) {
      // Return empty but valid response structure for storyboards
      return { storyboards: [], success: false, message: 'Empty response from server' };
    }
    
    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch (jsonError) {
      console.error('Failed to parse response as JSON:', jsonError);
      console.error('Response text was:', text.substring(0, 200));
      
      // If the response looks like an HTML error page, provide better error message
      if (text.includes('<html>') || text.includes('<!DOCTYPE')) {
        throw new Error('Server returned HTML error page instead of JSON. This may be a deployment issue.');
      }
      
      throw new Error('Server returned invalid response format');
    }
  } catch (error) {
    console.error('Safe response handler error:', error);
    throw error;
  }
}

export async function safeFetch(url: string, options?: RequestInit): Promise<any> {
  try {
    const response = await fetch(url, options);
    return await safeResponseHandler(response);
  } catch (error) {
    console.error('Safe fetch error:', error);
    throw error;
  }
}