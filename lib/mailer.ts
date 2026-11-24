import nodemailer from 'nodemailer';

// Khởi tạo Transporter cho Nodemailer dùng Gmail SMTP
const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

/**
 * Gửi email chứa mã OTP 6 chữ số cho người dùng
 */
export async function sendOtpEmail(toEmail: string, otp: string): Promise<boolean> {
  // Nếu chưa cấu hình EMAIL_USER hoặc EMAIL_PASS, in mã OTP ra console để hỗ trợ dev/test
  if (!emailUser || !emailPass) {
    console.warn('⚠️ [MAILER WARNING] Chưa cấu hình EMAIL_USER hoặc EMAIL_PASS trong .env.local.');
    console.info(`🔑 [DEV OTP CODE] Mã OTP thử nghiệm gửi tới ${toEmail} là: ${otp}`);
    return true;
  }

  const mailOptions = {
    from: `"THI ONLINE VB2" <${emailUser}>`,
    to: toEmail,
    subject: `[THI ONLINE VB2] Mã xác thực OTP đăng ký tài khoản: ${otp}`,
    html: `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Mã xác thực OTP</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f6f5; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
          <tr>
            <td align="center" style="padding: 40px 10px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                
                <!-- HEADER PHONG CÁCH CAND -->
                <tr>
                  <td style="background-color: #0f2d22; padding: 32px 30px; text-align: center;">
                    <div style="font-size: 20px; font-weight: 800; color: #fbbf24; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                      THI ONLINE VB2
                    </div>
                    <div style="font-size: 13px; color: #a7f3d0; font-weight: 500;">
                      Văn bằng 2 Công an nhân dân
                    </div>
                  </td>
                </tr>

                <!-- NỘI DUNG CHÍNH -->
                <tr>
                  <td style="padding: 36px 32px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #0f2d22;">
                      Xác thực đăng ký tài khoản
                    </h2>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                      Xin chào quý thí sinh! Bạn vừa thực hiện đăng ký tài khoản trên hệ thống ôn luyện <strong>THI ONLINE VB2</strong>. Dưới đây là mã xác thực OTP của bạn:
                    </p>

                    <!-- KHỐI MÃ OTP NỔI BẬT -->
                    <div style="background-color: #f0fdf4; border: 2px dashed #10b981; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
                      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: #047857; letter-spacing: 1.5px; margin-bottom: 8px;">
                        MÃ XÁC THỰC OTP
                      </div>
                      <div style="font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #0f2d22; font-family: 'Courier New', Courier, monospace;">
                        ${otp}
                      </div>
                      <div style="margin-top: 10px; font-size: 13px; color: #059669; font-weight: 500;">
                        ⏱ Có hiệu lực trong vòng <strong>5 phút</strong>
                      </div>
                    </div>

                    <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #64748b;">
                      Vui lòng nhập mã này vào trang đăng ký để hoàn tất kích hoạt tài khoản.
                    </p>

                    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #92400e; line-height: 1.5;">
                      ⚠️ <strong>Lưu ý bảo mật:</strong> Không chia sẻ mã OTP này cho bất kỳ ai để bảo vệ an toàn cho tài khoản của bạn.
                    </div>
                  </td>
                </tr>

                <!-- FOOTER -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">
                    Hệ thống thi thử & ôn thi Văn bằng 2 Công an Nhân dân<br />
                    Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ [MAILER ERROR] Lỗi khi gửi mail qua Nodemailer:', error);
    throw new Error('Không thể gửi mã xác thực tới email. Vui lòng kiểm tra lại địa chỉ Gmail.');
  }
}
