/**
 * Email utility for sending invitations via Nodemailer
 */
const nodemailer = require('nodemailer');

let transporter = null;

function initTransporter() {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('SMTP configuration missing. Email sending will be disabled.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
}

/**
 * Send an invitation email
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.roomName - Room name
 * @param {string} params.code - Room code
 * @param {string} params.inviteLink - Full invite acceptance link
 * @param {string} [params.inviterName] - Name of person sending invite
 */
async function sendInviteEmail({ to, roomName, code, inviteLink, inviterName }) {
  const transport = initTransporter();
  if (!transport) {
    console.warn('Email transporter not configured. Skipping email send.');
    return { sent: false, error: 'Email not configured' };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const subject = `You've been invited to join ${roomName} on FairHive`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; padding: 2rem; }
        .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 2rem; border-radius: 12px 12px 0 0; }
        .content { background: #ffffff; padding: 2rem; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
        .button { display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 999px; font-weight: 600; margin: 1rem 0; }
        .code { background: #f5f5f5; padding: 0.5rem 1rem; border-radius: 8px; font-family: monospace; font-weight: 600; display: inline-block; margin: 0.5rem 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">FairHive</h1>
        </div>
        <div class="content">
          <h2>You've been invited!</h2>
          <p>${inviterName ? inviterName + ' has' : 'You have'} been invited to join <strong>${roomName}</strong> on FairHive.</p>
          <p>Room code: <span class="code">${code}</span></p>
          <p>
            <a href="${inviteLink}" class="button">Accept Invitation</a>
          </p>
          <p style="font-size: 0.875rem; color: #64748b; margin-top: 2rem;">
            Or copy and paste this link into your browser:<br>
            <a href="${inviteLink}" style="color: #7c3aed; word-break: break-all;">${inviteLink}</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
You've been invited to join ${roomName} on FairHive.

Room code: ${code}

Accept your invitation by clicking this link:
${inviteLink}

Or copy and paste the link into your browser.
  `;

  try {
    await transport.sendMail({
      from: `"FairHive" <${from}>`,
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    console.error('Failed to send invite email:', error);
    return { sent: false, error: error.message };
  }
}

module.exports = {
  sendInviteEmail,
  initTransporter,
};
