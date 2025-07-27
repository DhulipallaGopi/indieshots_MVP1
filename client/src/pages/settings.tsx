import { useAuth } from "@/components/auth/UltimateAuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Download,
  Trash2,
  AlertTriangle,
  Settings as SettingsIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { initializeTheme, setTheme as setAppTheme, setupSystemThemeListener } from "@/lib/theme";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useTranslation, type Language } from "@/lib/i18n";
import { useLocation } from "wouter";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch upgrade status to determine user tier
  const { data: upgradeStatus } = useQuery({
    queryKey: ["/api/upgrade/status"],
    enabled: !!user,
  });
  
  // Initialize state from user preferences with safe fallbacks
  const [notifications, setNotifications] = useState({
    email: true,
    parsing: true,
    marketing: false
  });
  
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || ''
  });

  const [language, setLanguage] = useState<Language>('en');
  const [timezone, setTimezone] = useState('utc');
  const [theme, setTheme] = useState(() => initializeTheme());
  
  // Get translation function for current language
  const { t } = useTranslation(language);

  // Update state when user data loads
  useEffect(() => {
    if (user?.preferences) {
      const prefs = user.preferences as any;
      if (prefs.notifications) {
        setNotifications({
          email: prefs.notifications.email ?? true,
          parsing: prefs.notifications.parsing ?? true,
          marketing: prefs.notifications.marketing ?? false
        });
      }
      if (prefs.appearance) {
        setLanguage(prefs.appearance.language || 'en');
        setTimezone(prefs.appearance.timezone || 'utc');
        setTheme(prefs.appearance.theme || 'system');
      }
    }
    setProfile({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || ''
    });
  }, [user]);

  // Mutation for updating preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async (preferences: any) => {
      const response = await fetch('/api/auth/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ preferences }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update preferences');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: t('toast.preferencesUpdated'),
        description: t('toast.preferencesUpdated')
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('toast.updateFailed'),
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation for updating profile
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation for deleting account
  const scheduleDeleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/schedule-delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to schedule account deletion');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Deletion Scheduled",
        description: "Your account will be deleted in 30 days. You can cancel by logging in again."
      });
      // Log out user after scheduling deletion and redirect to home
      setTimeout(() => {
        // Clear authentication token
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        window.location.href = '/';
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Scheduling failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/delete-account-permanent', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete account');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Account Permanently Deleted",
        description: "Your account and all data have been permanently deleted."
      });
      // Clear authentication token and redirect immediately
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      // Force immediate redirect to home page
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Mutation for exporting data
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/export-data', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to export data');
      }
      
      const exportData = await response.json();
      return exportData;
    },
    onSuccess: (exportData) => {
      // Create individual CSV file downloads
      const csvFiles = exportData.csvFiles;
      
      Object.entries(csvFiles).forEach(([filename, content]) => {
        const blob = new Blob([content as string], { type: filename.endsWith('.csv') ? 'text/csv' : 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      });
      
      toast({
        title: "Data Export Complete",
        description: `Downloaded ${Object.keys(csvFiles).length} files including scripts content and CSV data files.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProfileSave = () => {
    updateProfileMutation.mutate(profile);
  };

  const handleScheduleDelete = () => {
    const confirmed = window.confirm(
      "Schedule account deletion? Your account will be deleted in 30 days. You can cancel this by logging in again within 30 days."
    );
    
    if (confirmed) {
      scheduleDeleteMutation.mutate();
    }
  };

  const handlePermanentDelete = () => {
    const confirmed = window.confirm(
      "Are you sure? This action cannot be undone. Your account and all data will be permanently deleted immediately."
    );
    
    if (confirmed) {
      const doubleConfirmed = window.confirm(
        "FINAL WARNING: This will permanently delete everything. Type 'DELETE' in your mind and click OK to proceed."
      );
      
      if (doubleConfirmed) {
        permanentDeleteMutation.mutate();
      }
    }
  };

  const handleExportData = () => {
    exportDataMutation.mutate();
  };

  const handleNotificationSave = () => {
    const preferences = {
      notifications,
      appearance: {
        theme,
        language,
        timezone
      }
    };
    updatePreferencesMutation.mutate(preferences);
  };

  const handlePreferencesSave = () => {
    const preferences = {
      notifications,
      appearance: {
        theme,
        language,
        timezone
      }
    };
    updatePreferencesMutation.mutate(preferences);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    setAppTheme(newTheme);
  };

  useEffect(() => {
    const cleanup = setupSystemThemeListener();
    return cleanup;
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('settings.title')}</h1>
        <p className="text-muted-foreground">
          {t('settings.subtitle')}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('settings.profile.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.profile.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={profile.firstName}
                  onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={profile.lastName}
                  onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleProfileSave}>Save Changes</Button>
          </CardFooter>
        </Card>

        {/* Subscription & Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription & Usage
            </CardTitle>
            <CardDescription>
              Manage your subscription and view usage statistics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Plan</p>
                <p className="text-sm text-muted-foreground">
                  {(upgradeStatus as any)?.tier === 'pro' ? 'Pro Plan' : 'Free Plan'}
                </p>
              </div>
              <Badge variant={(upgradeStatus as any)?.tier === 'pro' ? 'default' : 'outline'}>
                {(upgradeStatus as any)?.tier === 'pro' ? 'Pro' : 'Free'}
              </Badge>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Pages Used</span>
                <span>
                  {(upgradeStatus as any)?.limits?.usedPages || 0} / {
                    (upgradeStatus as any)?.limits?.totalPages === -1 
                      ? 'Unlimited' 
                      : (upgradeStatus as any)?.limits?.totalPages || 10
                  }
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full" 
                  style={{ 
                    width: (upgradeStatus as any)?.limits?.totalPages === -1 
                      ? '100%' 
                      : `${Math.min(100, ((upgradeStatus as any)?.limits?.usedPages || 0) / ((upgradeStatus as any)?.limits?.totalPages || 10) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="pt-4">
              {(upgradeStatus as any)?.tier === 'pro' ? (
                <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                  <p className="text-green-800 dark:text-green-200 font-medium">You're on the Pro Plan!</p>
                  <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                    Enjoying unlimited pages and storyboard generation
                  </p>
                </div>
              ) : (
                <Button 
                  className="w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 hover:from-yellow-500 hover:via-orange-600 hover:to-yellow-700 text-white font-semibold shadow-lg"
                  onClick={() => setLocation('/upgrade')}
                >
                  Upgrade to Premium
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Choose how you want to be notified about your projects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive email updates about your account
                </p>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, email: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Parsing Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when script parsing completes
                </p>
              </div>
              <Switch
                checked={notifications.parsing}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, parsing: checked }))
                }
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Marketing Updates</p>
                <p className="text-sm text-muted-foreground">
                  Receive updates about new features and promotions
                </p>
              </div>
              <Switch
                checked={notifications.marketing}
                onCheckedChange={(checked) => 
                  setNotifications(prev => ({ ...prev, marketing: checked }))
                }
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleNotificationSave}>Save Preferences</Button>
          </CardFooter>
        </Card>

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Data & Privacy
            </CardTitle>
            <CardDescription>
              Manage your data and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Data Export</Label>
              <p className="text-sm text-muted-foreground">
                Download your script content and other data as organized CSV files including user profile, scripts, parse jobs, and shots
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportData}
                disabled={exportDataMutation.isPending}
              >
                <Download className="h-4 w-4 mr-2" />
                {exportDataMutation.isPending ? 'Creating Files...' : 'Export Data'}
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <Label className="text-destructive">Danger Zone</Label>
              
              {/* Temporary Delete (30 days) */}
              <div className="space-y-2">
                <Label className="text-yellow-600 font-medium">Temporarily Delete Account</Label>
                <p className="text-sm text-muted-foreground">
                  Schedule your account for deletion in 30 days. You can restore it by logging in again within this period.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-yellow-500 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-800 hover:border-yellow-600"
                  onClick={handleScheduleDelete}
                  disabled={scheduleDeleteMutation.isPending}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {scheduleDeleteMutation.isPending ? 'Scheduling...' : 'Schedule Deletion (30 days)'}
                </Button>
              </div>

              {/* Permanent Delete */}
              <div className="space-y-2">
                <Label className="text-destructive">Permanently Delete Account</Label>
                <p className="text-sm text-muted-foreground">
                  Immediately and permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handlePermanentDelete}
                  disabled={permanentDeleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {permanentDeleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              {t('settings.app.title')}
            </CardTitle>
            <CardDescription>
              {t('settings.app.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">{t('settings.app.theme')}</Label>
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">{t('settings.app.language')}</Label>
              <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timezone">{t('settings.app.timezone')}</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utc">UTC</SelectItem>
                  <SelectItem value="est">Eastern Time</SelectItem>
                  <SelectItem value="pst">Pacific Time</SelectItem>
                  <SelectItem value="cet">Central European Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handlePreferencesSave}
              disabled={updatePreferencesMutation.isPending}
            >
              {updatePreferencesMutation.isPending ? t('toast.saving') : t('settings.app.save')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}