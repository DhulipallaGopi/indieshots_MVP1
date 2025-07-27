import { WorkingGoogleAuth } from "./working-google-auth";

interface SocialAuthProvidersProps {
  onFallbackToEmail?: () => void;
}

export function SocialAuthProviders({ onFallbackToEmail }: SocialAuthProvidersProps) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <WorkingGoogleAuth />
        <p className="text-xs text-muted-foreground text-center">
          Automatically creates account or signs you in
        </p>
      </div>
    </div>
  );
}