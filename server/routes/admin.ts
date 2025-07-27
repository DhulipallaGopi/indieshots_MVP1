import { Router } from 'express';
import { Request, Response } from 'express';
import { authMiddleware } from '../auth/jwt';

const router = Router();

/**
 * GET /api/admin/contact-submissions
 * Get all contact form submissions for admin review
 */
router.get('/contact-submissions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Only allow admin users to view contact submissions
    if (user.email !== 'premium@demo.com') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only administrators can view contact submissions'
      });
    }

    const { db } = await import('../db');
    const { contactSubmissions } = await import('../../shared/schema');
    const { desc } = await import('drizzle-orm');

    const submissions = await db
      .select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt));

    res.json({
      success: true,
      submissions,
      count: submissions.length
    });

  } catch (error: any) {
    console.error('Error fetching contact submissions:', error);
    res.status(500).json({
      error: 'Failed to fetch contact submissions',
      message: error.message
    });
  }
});

/**
 * PUT /api/admin/contact-submissions/:id/status
 * Update contact submission status
 */
router.put('/contact-submissions/:id/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { status } = req.body;

    // Only allow admin users to update status
    if (user.email !== 'premium@demo.com') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only administrators can update contact submissions'
      });
    }

    if (!['pending', 'responded', 'resolved'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be pending, responded, or resolved'
      });
    }

    const { db } = await import('../db');
    const { contactSubmissions } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');

    const updateData: any = { status };
    if (status === 'responded') {
      updateData.respondedAt = new Date();
    }

    await db
      .update(contactSubmissions)
      .set(updateData)
      .where(eq(contactSubmissions.id, parseInt(id)));

    res.json({
      success: true,
      message: `Contact submission marked as ${status}`
    });

  } catch (error: any) {
    console.error('Error updating contact submission:', error);
    res.status(500).json({
      error: 'Failed to update contact submission',
      message: error.message
    });
  }
});

export default router;