import { ReactNode } from 'react';
import ContactButton from '@/components/ContactButton';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {children}
      <ContactButton />
    </div>
  );
}