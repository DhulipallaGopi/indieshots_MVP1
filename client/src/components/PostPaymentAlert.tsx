import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Crown, Check } from 'lucide-react';

export const PostPaymentAlert = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const message = urlParams.get('message');
    
    if (status === 'success' && message) {
      setShowAlert(true);
      setAlertMessage(decodeURIComponent(message));
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        setShowAlert(false);
      }, 10000);
    }
  }, []);

  if (!showAlert) return null;

  return (
    <Alert className="mb-6 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
      <div className="flex items-center gap-2">
        <Crown className="h-5 w-5 text-amber-500" />
        <Check className="h-4 w-4 text-green-600" />
      </div>
      <AlertDescription className="text-green-700 dark:text-green-300 font-medium">
        🎉 {alertMessage} Your account has been upgraded to Pro! All premium features are now unlocked.
      </AlertDescription>
    </Alert>
  );
};