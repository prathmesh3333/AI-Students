const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTPEmail = async (to, name, otp) => {
  const mailOptions = {
    from: `"EduPrep" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your EduPrep verification code",
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;background:#07091a;border-radius:20px;padding:40px 36px;border:1px solid rgba(255,255,255,0.08);">

        <div style="text-align:center;margin-bottom:28px;">
          <div style="width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:16px;">🎓</div>
          <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 6px;">Verify your email</h1>
          <p style="color:rgba(255,255,255,0.45);font-size:14px;margin:0;">Hi <strong style="color:rgba(255,255,255,0.8);">${name}</strong>, here is your one-time code</p>
        </div>

        <div style="background:rgba(99,102,241,0.12);border:1px solid rgba(99,102,241,0.3);border-radius:14px;padding:28px;text-align:center;margin-bottom:24px;">
          <p style="color:rgba(255,255,255,0.4);font-size:11px;letter-spacing:2.5px;text-transform:uppercase;margin:0 0 12px;">Your OTP</p>
          <span style="font-size:44px;font-weight:900;color:#a5b4fc;letter-spacing:12px;display:block;">${otp}</span>
        </div>

        <p style="color:rgba(255,255,255,0.35);font-size:13px;text-align:center;margin:0;">
          This code expires in <strong style="color:rgba(255,255,255,0.6);">10 minutes</strong>.<br/>
          If you didn't create an EduPrep account, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendOTPEmail };
