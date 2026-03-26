import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'smohamedassil@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'rxde osbj bpun iycl',
  },
});

/**
 * Send an email notification
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 */
export const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"FlipLearn" <${process.env.GMAIL_USER || 'smohamedassil@gmail.com'}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    console.error('Email error:', err.message);
    // Don't throw — email failure shouldn't break the app
  }
};

/**
 * Send a notification email with FlipLearn template
 */
export const sendNotificationEmail = async (to, title, message) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1B4F72, #2874A6); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📚 FlipLearn</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">Plateforme de Classe Inversée</p>
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
        FlipLearn © 2025 — Plateforme de Classe Inversée<br>
        Projet de Fin d'Études — Licence Informatique ISIL
      </div>
    </div>
  `;
  await sendEmail(to, `FlipLearn — ${title}`, html);
};
