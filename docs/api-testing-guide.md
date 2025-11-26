# API Testing Guide for OTP Endpoints

This guide shows you how to test the OTP API endpoints.

## Testing with cURL

### 1. Send OTP

```bash
curl -X POST http://localhost:3005/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "OTP sent successfully. Please check your email.",
  "expiresIn": 600
}
```

**Expected Console Output (Dev Mode):**
```
📧 [DEV MODE] Email would be sent:
  To: test@example.com
  Subject: Your Verification Code
  HTML: (email content with OTP code)
```

**Copy the OTP code** from the console output.

---

### 2. Verify OTP

Use the OTP code you got from the console:

```bash
curl -X POST http://localhost:3005/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "123456"}'
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "user": {
    "id": "clxxx...",
    "email": "test@example.com",
    "name": null,
    "emailVerified": "2025-11-26T03:36:40.000Z"
  }
}
```

---

## Testing Error Cases

### Invalid Email Format

```bash
curl -X POST http://localhost:3005/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email"}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Please enter a valid email address",
  "validationErrors": [...]
}
```

---

### Invalid OTP Format

```bash
curl -X POST http://localhost:3005/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "12345"}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "OTP must be 6 digits",
  "validationErrors": [...]
}
```

---

### Wrong OTP

```bash
curl -X POST http://localhost:3005/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "otp": "999999"}'
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Invalid OTP. Please try again."
}
```

---

### Rate Limiting (Send more than 3 OTPs in 15 minutes)

```bash
# Send 1st OTP
curl -X POST http://localhost:3005/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Send 2nd OTP
curl -X POST http://localhost:3005/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Send 3rd OTP
curl -X POST http://localhost:3005/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Send 4th OTP - should be rate limited
curl -X POST http://localhost:3005/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Expected Response (4th request):**
```json
{
  "success": false,
  "error": "Too many requests. Please try again in X minutes."
}
```

---

## Testing with JavaScript/Fetch

### Send OTP

```javascript
const sendOTP = async (email) => {
  const response = await fetch('http://localhost:3005/api/auth/otp/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  
  const data = await response.json();
  console.log('Send OTP Response:', data);
  return data;
};

// Usage
sendOTP('test@example.com');
```

---

### Verify OTP

```javascript
const verifyOTP = async (email, otp) => {
  const response = await fetch('http://localhost:3005/api/auth/otp/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, otp }),
  });
  
  const data = await response.json();
  console.log('Verify OTP Response:', data);
  return data;
};

// Usage
verifyOTP('test@example.com', '123456');
```

---

## Full Flow Test

```javascript
async function testOTPFlow() {
  const email = 'test@example.com';
  
  console.log('1. Sending OTP...');
  const sendResult = await sendOTP(email);
  
  if (!sendResult.success) {
    console.error('Failed to send OTP:', sendResult.error);
    return;
  }
  
  console.log('2. OTP sent successfully!');
  console.log('3. Check your console for the OTP code (in dev mode)');
  
  // In a real scenario, user would enter the OTP from their email
  const otp = prompt('Enter the OTP from console:');
  
  console.log('4. Verifying OTP...');
  const verifyResult = await verifyOTP(email, otp);
  
  if (!verifyResult.success) {
    console.error('Failed to verify OTP:', verifyResult.error);
    return;
  }
  
  console.log('5. OTP verified successfully!');
  console.log('User:', verifyResult.user);
}

// Run the test
testOTPFlow();
```

---

## Testing in Development Mode

In development mode (without RESEND_API_KEY):
1. OTPs are logged to the console
2. Check the server console (where `npm run dev` is running)
3. Look for `📧 [DEV MODE] Email would be sent:` messages
4. Copy the OTP code from the HTML or text content
5. Use the copied OTP in the verify endpoint

---

## Checking Database

After successful verification, check the database:

```bash
npx prisma studio
```

Navigate to:
1. **User** table - Check if user was created with `emailVerified` timestamp
2. **VerificationToken** table - Verify OTP tokens are cleaned up after verification

---

## Common Issues

### 1. "Email service not configured"
- **Cause**: RESEND_API_KEY not set in production mode
- **Solution**: Set RESEND_API_KEY or test in development mode

### 2. "OTP expired or not found"
- **Cause**: OTP was not sent or expired (10 minutes)
- **Solution**: Request a new OTP

### 3. "Too many requests"
- **Cause**: Rate limit exceeded
- **Solution**: Wait 15 minutes or restart the server (clears in-memory rate limits)

### 4. "Invalid OTP"
- **Cause**: Wrong OTP or exceeded max attempts (3)
- **Solution**: Request a new OTP

---

## Next Steps

After successful API testing:
1. Proceed to Phase 3: Frontend Components
2. Build the sign-in UI with email input and OTP verification
3. Integrate the UI with these API endpoints
