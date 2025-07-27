import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Contact form schema
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Valid email required').max(100, 'Email too long'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long')
});

/**
 * POST /api/contact
 * Submit a contact form message
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = contactSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
    }

    const { name, email, subject, message } = validation.data;

    // Store contact message in database
    const result = await db.execute(sql`
      INSERT INTO contact_messages (name, email, subject, message, created_at)
      VALUES (${name}, ${email}, ${subject}, ${message}, NOW())
      RETURNING id, created_at
    `);

    console.log('Contact form submitted:', {
      id: result.rows[0]?.id,
      name,
      email,
      subject,
      timestamp: result.rows[0]?.created_at
    });

    // Email notification integration available for production use

    res.json({
      success: true,
      message: 'Contact form submitted successfully',
      id: result.rows[0]?.id
    });

  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({
      error: 'Failed to submit contact form',
      message: 'Please try again or contact us directly at indieshots@theindierise.com'
    });
  }
});

/**
 * GET /api/contact/messages
 * Get all contact messages (admin only)
 */
router.get('/messages', async (req: Request, res: Response) => {
  try {
    // In a real app, you'd check for admin permissions here
    const messages = await db.execute(sql`
      SELECT id, name, email, subject, message, status, created_at, updated_at
      FROM contact_messages
      ORDER BY created_at DESC
      LIMIT 100
    `);

    res.json({
      messages: messages.rows
    });

  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({
      error: 'Failed to fetch contact messages'
    });
  }
});

export default router;