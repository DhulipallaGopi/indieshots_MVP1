import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import ContactWidget from './ContactWidget';

export default function ContactButton() {
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <>
      {/* Floating Contact Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsContactOpen(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
          title="Contact Support"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>

      {/* Contact Widget Modal */}
      <ContactWidget 
        isOpen={isContactOpen} 
        onClose={() => setIsContactOpen(false)} 
      />
    </>
  );
}