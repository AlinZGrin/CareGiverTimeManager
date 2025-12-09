# Firebase Authentication Setup for Password Reset Emails

To enable real password reset emails, follow these simple steps:

## Step 1: Enable Email/Password Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **caregivertimemanager**
3. In the left sidebar, click **Authentication**
4. Click on the **Sign-in method** tab
5. Click on **Email/Password**
6. Toggle **Enable** to ON
7. Click **Save**

## Step 2: Create Admin User

1. Still in **Authentication**, click on the **Users** tab
2. Click **Add user** button
3. Enter:
   - **Email**: Your real email address (e.g., `youremail@gmail.com`)
   - **Password**: `password123` (or your preferred temporary password)
4. Click **Add user**

✅ **That's it!** Password reset emails will now be sent to your email address.

## Step 3: Test Password Reset

1. Go to your app: https://care-giver-time-manager-3g4crkp68-alins-projects-186a0c90.vercel.app
2. Click "Forgot Email/Password?" on the Admin tab
3. Enter the email you just created in Firebase
4. **Check your email inbox** (and spam folder)
5. Click the reset link in the email
6. Set your new password

## Step 4: Update Admin Email in Database (Optional)

If you used a different email than `admin@example.com`, you should update it in your app:

1. Log in to admin panel with the new credentials
2. Go to **Settings** tab
3. Click **Edit Credentials** for the admin
4. Update the email to match what you set up in Firebase
5. Click **Update**

## Email Template Customization (Optional)

Make the password reset emails look professional:

1. Go to Firebase Console → Authentication → Templates
2. Select **Password reset**
3. Customize:
   - Email subject
   - Email body
   - Add your app name and styling
4. Click **Save**

## Important Notes

✅ **Emails are sent from**: `noreply@caregivertimemanager.firebaseapp.com`
✅ **Reset links expire**: After 1 hour for security  
✅ **Free tier**: Firebase includes email sending in the free tier

## Troubleshooting

**❌ Email not received:**
- Check spam/junk folder (sometimes Gmail filters Firebase emails)
- Wait 2-3 minutes (email delivery can be delayed)
- Verify Email/Password is enabled in Firebase Console → Authentication → Sign-in method
- Check the email exists in Firebase Console → Authentication → Users

**❌ "Email not found" error:**
- The email must exist in Firebase Authentication → Users tab first
- Create the user as described in Step 2 above

**❌ "Firebase Auth not configured" error:**
- Check your `.env.local` file has all Firebase credentials
- Verify NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is set correctly

## Using Your Real Email

Want to use your actual Gmail/Outlook email?

1. In Step 2, use your real email address instead of admin@example.com
2. You'll receive actual password reset emails at that address
3. After resetting, update the admin email in Settings tab to match

**Example:**
- Firebase Auth email: `john.doe@gmail.com`
- Database email (update in Settings): `john.doe@gmail.com`
- Now password resets will work perfectly!

