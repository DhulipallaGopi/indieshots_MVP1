import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, CheckCircle, Sparkles } from 'lucide-react';

export const PaymentSuccessPopup = () => {
  const [location] = useLocation();
  const [showPopup, setShowPopup] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Only show popup for payment success on dashboard
    const urlParams = new URLSearchParams(window.location.search);
    const isPaymentSuccess = urlParams.get('status') === 'success';
    const isDashboard = location === '/dashboard';
    const message = urlParams.get('message') || '';
    
    // Only show if payment success AND on dashboard AND message contains payment success
    if (isPaymentSuccess && isDashboard && message.toLowerCase().includes('payment')) {
      console.log('💳 PAYMENT SUCCESS: Showing Pro Member welcome popup');
      setShowPopup(true);
      setIsOpen(true);
      
      // Clean URL after showing popup
      setTimeout(() => {
        const newUrl = window.location.pathname;
        window.history.replaceState(null, '', newUrl);
      }, 1000);
    }
  }, [location]);

  const handleClose = () => {
    setIsOpen(false);
    setShowPopup(false);
  };

  if (!showPopup) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md mx-auto border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 dark:border-amber-700">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-4 relative">
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 rounded-full animate-pulse"></div>
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-orange-400 rounded-full animate-ping"></div>
            <Crown className="h-16 w-16 text-amber-500 mx-auto drop-shadow-lg animate-bounce" />
            <Sparkles className="absolute -bottom-1 -right-1 h-5 w-5 text-amber-400 animate-pulse" />
          </div>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Welcome to Pro Membership!
          </DialogTitle>
        </DialogHeader>
        
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Payment Successful</span>
          </div>
          
          <p className="text-amber-800 dark:text-amber-200">
            Your account has been upgraded! You now have access to all premium features.
          </p>
          
          <div className="grid grid-cols-1 gap-3 my-4">
            <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-amber-900/10 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Unlimited Pages</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-amber-900/10 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Unlimited Shots per Scene</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white/50 dark:bg-amber-900/10 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-amber-900 dark:text-amber-100">AI Storyboard Generation</span>
            </div>
          </div>
          
          <Button 
            onClick={handleClose}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            Start Creating Amazing Content!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};