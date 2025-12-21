# 🔐 Google OAuth Integration গাইড

## Google OAuth সেটআপ

### ১. Google Cloud Console থেকে Credentials তৈরি করুন

1. [Google Cloud Console](https://console.cloud.google.com) এ যান
2. নতুন প্রজেক্ট তৈরি করুন
3. **OAuth 2.0 Consent Screen** সেটআপ করুন
4. **OAuth 2.0 Credentials** (OAuth Client ID) তৈরি করুন
   - Application type: Web application
   - Authorized redirect URIs যোগ করুন:
     - `http://localhost:3000/auth/google/callback` (ডেভেলপমেন্ট)
     - `https://yourdomain.com/auth/google/callback` (প্রোডাকশন)

### ২. Environment Variables সেট করুন

`.env` ফাইলে নিম্নলিখিত যোগ করুন:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

## API ফ্লো

### Google OAuth সাইনআপ ফ্লো

```
1. GET /auth/google
   ↓ (Google এ রিডাইরেক্ট হয়)
   
2. User লগইন করে Google এ

3. GET /auth/google/callback
   ↓ Response: { googleToken: "jwt-token" }

4. POST /auth/google/add-email
   Headers: { Authorization: Bearer {googleToken} }
   Body: { email: "user@gmail.com" }
   ↓ Response: { message: "Verification code sent", verificationCode: "123456" }

5. POST /auth/google/verify-email
   Headers: { 
     Authorization: Bearer {googleToken},
     x-verification-code: "123456"
   }
   ↓ Response: { message: "Email verified" }

6. POST /auth/google/complete-signup
   Headers: { 
     Authorization: Bearer {googleToken},
     x-google-id: {googleId},
     x-user-email: {email}
   }
   Body: { 
     fullName: "Rahim Khan",
     password: "Pass@1234",
     confirmPassword: "Pass@1234"
   }
   ↓ Response: { 
     accessToken: "jwt-token",
     user: { id, email, name, role }
   }
```

### Email OTP সাইনআপ ফ্লো (পূর্ববর্তী)

```
1. POST /auth/send-otp
   Body: { email: "user@gmail.com" }
   ↓ Response: { message: "OTP sent" }

2. POST /auth/verify-otp
   Body: { email: "user@gmail.com", otp: "123456" }
   ↓ Response: { signupToken: "jwt-token" }

3. POST /auth/complete-signup
   Headers: { Authorization: Bearer {signupToken} }
   Body: { 
     name: "Rahim Khan",
     phone: "01812345678",
     password: "Pass@1234",
     confirmPassword: "Pass@1234"
   }
   ↓ Response: { 
     accessToken: "jwt-token",
     user: { id, email, name, role }
   }
```

### লগইন ফ্লো

```
POST /auth/login
Body: { 
  emailOrName: "user@gmail.com or Rahim Khan",
  password: "Pass@1234"
}
↓ Response: { 
  accessToken: "jwt-token",
  user: { id, email, name, role }
}
```

## ডাটাবেস স্কিমা

User entity এ নতুন ফিল্ড যোগ করা হয়েছে:

- `googleId` - Google user ID (ইউনিক, nullable)
- `googleEmail` - Google থেকে পাওয়া ইমেইল
- `googleName` - Google থেকে পাওয়া নাম
- `isGoogleSignup` - Google দিয়ে সাইনআপ করা হয়েছে কিনা

## মাইগ্রেশন

নতুন ফিল্ড যুক্ত করতে মাইগ্রেশন চালান:

```bash
npm run migration:generate src/migrations/AddGoogleOAuthFields
npm run migration:run
```

## নিরাপত্তা বিবেচনা

✅ **Google OAuth Token**: 30 মিনিট মেয়াদ সীমা
✅ **Email Verification Code**: 15 মিনিট মেয়াদ সীমা
✅ **Password**: Bcrypt দিয়ে হ্যাশ করা (salted)
✅ **Email শুধুমাত্র একবার রেজিস্টার**: ডুপ্লিকেট চেক আছে
✅ **Rate Limiting**: ৫টি অনুরোধ/মিনিট

## ফিচার

- ✅ Google OAuth সাইনআপ/লগইন
- ✅ Email যাচাইকরণ (OTP বা Verification code)
- ✅ Password সুরক্ষা (Bcrypt)
- ✅ Email/Name দিয়ে লগইন
- ✅ Google/Email উভয় মেথড সাপোর্ট
- ✅ Auto-ban মেকানিজম (ব্রুটফোর্স রোধে)
