import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/** Sends a 6-digit verification OTP to the given email address. */
export async function sendOtpEmail(to, otp) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP configuration is missing');
  }

  return getTransporter().sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: 'Your Sentinel code',
    text: `Your code is ${otp}. It expires in 10 minutes.`,
  });
}
