import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/components/auth/UltimateAuthProvider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { Mail, User, Calendar, MessageSquare, ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'pending' | 'responded' | 'resolved';
  createdAt: string;
  respondedAt?: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['/api/admin/contact-submissions'],
    enabled: user?.email === 'premium@demo.com'
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest('PUT', `/api/admin/contact-submissions/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/contact-submissions'] });
      toast({
        title: "Status Updated",
        description: "Contact submission status has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update status",
        variant: "destructive"
      });
    }
  });

  if (user?.email !== 'premium@demo.com') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Only administrators can access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const submissions = (submissionsData as any)?.submissions || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="destructive" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'responded':
        return <Badge variant="default" className="flex items-center gap-1"><Mail className="w-3 h-3" />Responded</Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />Resolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStatusUpdate = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleEmailForward = (submission: ContactSubmission) => {
    const subject = encodeURIComponent(`[IndieShots Contact] ${submission.subject}`);
    const body = encodeURIComponent(`
Contact Form Submission from IndieShots:

From: ${submission.name}
Email: ${submission.email}
Date: ${format(new Date(submission.createdAt), 'PPP p')}
Subject: ${submission.subject}

Message:
${submission.message}

---
To respond, reply directly to: ${submission.email}
    `);
    
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=indieshots@theindierise.com&su=${subject}&body=${body}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Contact Form Administration</h1>
        <p className="text-gray-600">
          Manage contact form submissions and forward them to indieshots@theindierise.com
        </p>
        
        <div className="mt-4 flex gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm">
              <strong>{submissions.filter((s: ContactSubmission) => s.status === 'pending').length}</strong> pending submissions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm">
              <strong>{submissions.filter((s: ContactSubmission) => s.status === 'resolved').length}</strong> resolved
            </span>
          </div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Contact Submissions</h3>
            <p className="text-gray-600">
              Contact form submissions will appear here when users submit messages.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {submissions.map((submission: ContactSubmission) => (
            <Card key={submission.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-semibold">{submission.name}</span>
                      <Badge variant="outline">{submission.email}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {format(new Date(submission.createdAt), 'PPP p')}
                      </span>
                      {getStatusBadge(submission.status)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEmailForward(submission)}
                      className="flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Forward to indieshots@theindierise.com
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {submission.subject}
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="whitespace-pre-wrap text-gray-700">
                        {submission.message}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      ID: #{submission.id}
                      {submission.respondedAt && (
                        <span className="ml-4">
                          Responded: {format(new Date(submission.respondedAt), 'PPP p')}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {submission.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(submission.id, 'responded')}
                          disabled={updateStatusMutation.isPending}
                        >
                          Mark as Responded
                        </Button>
                      )}
                      {submission.status === 'responded' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleStatusUpdate(submission.id, 'resolved')}
                          disabled={updateStatusMutation.isPending}
                        >
                          Mark as Resolved
                        </Button>
                      )}
                      {submission.status === 'resolved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusUpdate(submission.id, 'pending')}
                          disabled={updateStatusMutation.isPending}
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}