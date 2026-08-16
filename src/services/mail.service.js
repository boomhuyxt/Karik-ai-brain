const nodemailer = require('nodemailer');
const env = require('../config/env');

class MailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    if (env.smtp.user && env.smtp.pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host: env.smtp.host,
          port: env.smtp.port,
          secure: env.smtp.port === 465,
          auth: {
            user: env.smtp.user,
            pass: env.smtp.pass
          }
        });
      } catch (err) {
        console.warn('[MailService] Failed to initialize Nodemailer transporter:', err.message);
      }
    }
  }

  async sendOtpEmail(toEmail, otpCode) {
    const subject = 'Mã OTP Đặt Lại Mật Khẩu - AI Brain Karik';
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #334155; border-radius: 12px; background-color: #0f172a; color: #f8fafc;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #c084fc; margin: 0;">AI Brain Karik System</h2>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Yêu cầu đặt lại mật khẩu</p>
        </div>
        <div style="background-color: #1e293b; padding: 15px; rounded: 8px; text-align: center; margin: 20px 0; border: 1px solid #475569;">
          <p style="color: #cbd5e1; font-size: 14px; margin: 0 0 10px 0;">Mã xác thực OTP của bạn là:</p>
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">${otpCode}</span>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 10px;">(Mã có hiệu lực trong vòng 15 phút)</p>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center;">Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.</p>
      </div>
    `;

    console.log(`\n======================================================`);
    console.log(`📧 [GMAIL SMTP OTP SENT] To: ${toEmail} | OTP Code: ${otpCode}`);
    console.log(`======================================================\n`);

    if (this.transporter && env.smtp.user) {
      try {
        await this.transporter.sendMail({
          from: `"AI Brain Karik" <${env.smtp.user}>`,
          to: toEmail,
          subject,
          html: htmlContent
        });
        return { success: true, sentViaSmtp: true };
      } catch (err) {
        console.error('[MailService] Error sending email via SMTP:', err.message);
        return { success: true, sentViaSmtp: false, warning: err.message };
      }
    }

    return { success: true, sentViaSmtp: false, devOtp: otpCode };
  }
}

module.exports = new MailService();
