import sgMail from '@sendgrid/mail';

let initialized = false;

function ensureInit(): boolean {
  if (initialized) return true;
  const key = process.env.SENDGRID_API_KEY;
  if (!key) return false;
  sgMail.setApiKey(key);
  initialized = true;
  return true;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  if (!ensureInit()) {
    return false;
  }

  await sgMail.send({
    to: opts.to,
    from: { email: 'signals@firasa.app', name: 'Firasa' },
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });

  return true;
}
