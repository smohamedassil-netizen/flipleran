/**
 * Email Service - Uses Resend HTTP API (SMTP blocked on Render free tier)
 * Fallback: logs to console if no API key configured
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.GMAIL_USER || 'smohamedassil@gmail.com';

/**
 * Send an email via Resend HTTP API (works on Render — no SMTP needed)
 */
export const sendEmail = async (to, subject, html) => {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL] No RESEND_API_KEY — skipping email to ${to}: ${subject}`);
    return;
  }

  try {
    // Resend free tier: can only send to the account owner's email
    // Route all notifications to the admin email with original recipient in subject
    const adminEmail = FROM_EMAIL;
    const finalSubject = to === adminEmail ? subject : `[Pour ${to}] ${subject}`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `FlipLearn <onboarding@resend.dev>`,
        to: [adminEmail],
        subject: finalSubject,
        html: `<p style="color:#666;font-size:12px;">Destinataire original : <strong>${to}</strong></p>${html}`,
        reply_to: FROM_EMAIL,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`[EMAIL] Sent to ${to}: ${subject} (id: ${data.id})`);
    } else {
      console.error(`[EMAIL] Resend error:`, data);
    }
  } catch (err) {
    console.error('[EMAIL] Error:', err.message);
  }
};

/**
 * Send a notification email with FlipLearn template
 */
export const sendNotificationEmail = async (to, title, message) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1B4F72, #2874A6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">FlipLearn</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">Plateforme de Classe Inversee</p>
      </div>
      <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1B4F72; margin: 0 0 12px; font-size: 18px;">${title}</h2>
        <p style="color: #374151; line-height: 1.6; font-size: 15px;">${message}</p>
        <div style="margin-top: 24px; text-align: center;">
          <a href="https://fliplearn-5lsz.onrender.com" style="display: inline-block; padding: 12px 28px; background: #1B4F72; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            Ouvrir FlipLearn
          </a>
        </div>
      </div>
      <div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
        FlipLearn - Projet de Fin d'Etudes - Licence Informatique ISIL
      </div>
    </div>
  `;
  await sendEmail(to, `FlipLearn - ${title}`, html);
};
