/**
 * OTP email template options
 */
export interface OTPEmailOptions {
    email: string;
    otp: string;
    expiryMinutes: number;
    appName?: string;
}

/**
 * Generates the HTML content for an OTP email
 * 
 * @param options - OTP email template options
 * @returns HTML email content
 */
export function generateOTPEmailHTML(options: OTPEmailOptions): string {
    const appName = options.appName || "Supplier Hub";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
      font-size: 24px;
    }
    .otp-code {
      background-color: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-code .code {
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 8px;
      color: #1e293b;
      font-family: 'Courier New', monospace;
    }
    .info {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info p {
      margin: 0;
      color: #92400e;
      font-size: 14px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: #ffffff;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${appName}</h1>
      <p>Your verification code</p>
    </div>
    
    <p>Hello,</p>
    <p>You requested to sign in to ${appName}. Use the verification code below to complete your sign-in:</p>
    
    <div class="otp-code">
      <div class="code">${options.otp}</div>
    </div>
    
    <div class="info">
      <p><strong>⏱️ This code expires in ${options.expiryMinutes} minutes.</strong></p>
    </div>
    
    <p>If you didn't request this code, you can safely ignore this email. Someone else might have typed your email address by mistake.</p>
    
    <div class="footer">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generates the plain text content for an OTP email
 * 
 * @param options - OTP email template options
 * @returns Plain text email content
 */
export function generateOTPEmailText(options: OTPEmailOptions): string {
    const appName = options.appName || "Supplier Hub";

    return `
${appName} - Your Verification Code

Hello,

You requested to sign in to ${appName}. Use the verification code below to complete your sign-in:

${options.otp}

⏱️ This code expires in ${options.expiryMinutes} minutes.

If you didn't request this code, you can safely ignore this email. Someone else might have typed your email address by mistake.

This is an automated message, please do not reply to this email.

© ${new Date().getFullYear()} ${appName}. All rights reserved.
  `.trim();
}
