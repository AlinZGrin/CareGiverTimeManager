# ✅ Deployment Instructions: Caregiver Time Manager

## Status
- ✅ Application built successfully for production
- ✅ Git repository initialized and committed
- ✅ Vercel configuration created
- ✅ Ready for deployment to the internet

---

## How to Deploy to the Internet

### Prerequisites
- Vercel CLI installed (already done: `vercel --version` shows 48.0.0)
- Git repository configured (already done)
- GitHub/GitLab/Bitbucket account (optional but recommended)

### Quick Deployment (5 minutes)

#### Step 1: Deploy to Vercel

Open terminal in the project directory and run:

```bash
vercel --prod
```

#### Step 2: Follow the Prompts

When running the command, you'll be asked:

1. **"Set up and deploy?"** → Type `Y` and press Enter
2. **"Which scope do you want to deploy to?"** → Select your account
3. **"Link to existing project?"** → Type `N` (first time deployment)
4. **"What's your project's name?"** → Press Enter to use default or type custom name:
   ```
   caregiver-time-manager
   ```
5. **"In which directory is your code located?"** → Press Enter (uses `./`)
6. **"Want to modify the settings?"** → Type `N` and press Enter

#### Step 3: Get Your Live URL

Vercel will show you the deployment URL. It looks like:
```
https://caregiver-time-manager.vercel.app
```

**🎉 Your app is now live on the internet!**

---

## Alternative: Deploy via GitHub (Recommended for Production)

### Step 1: Push to GitHub

```bash
# Create a new repository on GitHub.com
# Then in terminal:

git remote add origin https://github.com/YOUR_USERNAME/caregiver-time-manager.git
git branch -M main
git push -u origin main
```

### Step 2: Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Project"
3. Paste your GitHub repository URL
4. Click "Import"
5. Vercel auto-detects Next.js settings
6. Click "Deploy"

### Benefits
- Automatic deployments on every push
- Pull request preview deployments
- Easy rollbacks
- Better collaboration

---

## Testing Your Deployment

Once deployed, test the live application:

### Test Accounts
```
Admin Login:
- Email: admin@example.com
- Password: password123

Caregiver (Jane):
- Phone: 5551234
- PIN: 1234

Caregiver (John):
- Phone: 5555678
- PIN: 5678
```

### Test Features
1. **Login** with both admin and caregiver accounts
2. **Time Clock**: Clock in/out as caregiver
3. **Scheduling**: Create and manage shifts as admin
4. **Claim Shifts**: Claim shifts as caregiver
5. **Credentials**: Update passwords/PINs in Settings

---

## Custom Domain (Optional)

To use your own domain (e.g., caregiver.yourcompany.com):

### Step 1: Buy Domain
Purchase from GoDaddy, Namecheap, Google Domains, etc.

### Step 2: Add to Vercel
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Domains
4. Add your domain
5. Update DNS records (Vercel provides instructions)
6. Wait 24-48 hours for DNS propagation

### Step 3: SSL Certificate
Vercel automatically provides a free SSL certificate.

---

## Monitoring Your Live App

### View Logs
```bash
vercel logs caregiver-time-manager
```

### View Performance
1. Go to Vercel Dashboard
2. Select your project
3. View Analytics, Speed Insights, and Web Vitals

### View Deployments
```bash
vercel ls
```

---

## Important Notes ⚠️

### Data Storage
- **Current**: Data stored in browser LocalStorage
- **Limitation**: Each user/browser has separate data
- **Impact**: Data is NOT synced between devices
- **Solution**: Upgrade to real database (see below)

### For Production Use

If this app will be used for real business, you should:

#### 1. Add Real Database
Replace LocalStorage with a real database:
- **PostgreSQL** (Vercel Postgres)
- **MongoDB**
- **Supabase**
- **Firebase**

#### Enable Push Notifications (FCM)

To send browser push notifications reminding caregivers to clock in:

- Add environment variables to `.env.local` and Vercel:
  - `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (Web Push key from Firebase Console)
  - `FIREBASE_SERVER_KEY` (Server key for FCM HTTP API)
- Ensure `public/firebase-messaging-sw.js` exists (added in repo).
- App registers tokens on the caregiver dashboard and stores them under `notificationTokens/{userId}` in Firebase.
- The endpoint `GET /api/send-shift-reminders` checks for shifts starting within 5 minutes and sends FCM notifications.

Optional scheduling with Vercel Cron:

Add to `vercel.json`:

```
{
  "crons": [
    {
      "path": "/api/send-shift-reminders",
      "schedule": "* * * * *"
    }
  ]
}
```

Notes:
- Caregivers must grant notification permission and open the app once per device.
- Background notifications require the service worker and a supported browser.

#### 2. Update API Calls
Convert MockService to actual API:
```typescript
// Old: MockService.getUsers()
// New: await fetch('/api/users')
```

#### 3. Add Authentication
Use a proper auth solution:
- NextAuth.js
- Clerk
- Auth0
- Supabase Auth

#### 4. Add HTTPS/Security
- Vercel provides free SSL (automatic)
- Add security headers
- Implement rate limiting

---

## Updating Deployed App

### If using GitHub (Automatic)
```bash
# Make changes locally
git add .
git commit -m "Your change message"
git push origin main

# Vercel automatically deploys
```

### If using Vercel CLI (Manual)
```bash
# Make changes locally
git add .
git commit -m "Your change message"
vercel --prod
```

---

## Rollback to Previous Version

If something goes wrong:

```bash
vercel ls
# Shows all deployments

vercel rollback
# Rollback to previous version
```

Or through Vercel Dashboard:
1. Go to Deployments
2. Click the previous working version
3. Click "Promote to Production"

---

## Environment Variables

To add sensitive configuration:

### Via CLI
```bash
vercel env add VARIABLE_NAME
# Prompts for value
# Automatically created for all environments
```

### Via Dashboard
1. Project Settings → Environment Variables
2. Add key/value pairs
3. Select which environments (Development, Preview, Production)

---

## Cost

**Vercel Pricing** (as of 2025):
- **Hobby (Free)**: $0/month
  - 100GB bandwidth
  - 6000 build hours/month
  - Perfect for testing/small projects
  
- **Pro**: $20/month
  - Unlimited bandwidth
  - Unlimited builds
  - Advanced analytics
  - Priority support

**Current app qualifies for free tier** ✅

---

## Troubleshooting

### Deployment Fails
```bash
# Check build locally first
npm run build

# If it works locally but not on Vercel
# The build configuration is correct
# Check Vercel logs: vercel logs

# If needed, redeploy
vercel --prod --force
```

### App Shows Old Version
```bash
# Clear cache and force redeploy
vercel --prod --force
```

### Environment Variable Not Working
1. Add variable via `vercel env add`
2. Redeploy: `vercel --prod --force`
3. Variables only available after rebuild

### Custom Domain Not Working
- Wait 24-48 hours for DNS to propagate
- Verify DNS records match Vercel instructions
- Check domain status in Vercel dashboard

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Support**: https://vercel.com/support
- **Discord Community**: https://discord.gg/vercel

---

## Quick Commands Reference

```bash
# Deploy to production
vercel --prod

# Deploy to staging (preview)
vercel

# View deployments
vercel ls

# View logs
vercel logs

# Rollback
vercel rollback

# Add environment variable
vercel env add VARIABLE_NAME

# Remove environment variable
vercel env rm VARIABLE_NAME

# View config
vercel config

# Link to existing Vercel project
vercel link

# Unlink from project
vercel unlink
```

---

## Next Steps

1. ✅ Run `vercel --prod` to deploy
2. ✅ Test at live URL
3. ✅ Share link with team
4. ⏭️ Consider upgrading to real database
5. ⏭️ Set up custom domain
6. ⏭️ Monitor performance

---

## QA Environment (Vercel)

- **Overview:** Pushing to the `qa` branch will trigger a GitHub Actions workflow that builds and deploys a QA preview to Vercel.
- **Workflow added:** `.github/workflows/deploy-qa.yml` (triggers on pushes to `qa`).
- **Required GitHub Secrets:**
  - `VERCEL_TOKEN` — a personal token from Vercel (Project → Settings → Tokens).
  - `VERCEL_ORG_ID` — your Vercel organization or team ID (Project Settings or team settings).
  - `VERCEL_PROJECT_ID` — the Vercel project ID (Project Settings → General).
  - `QA_ALIAS_DOMAIN` — optional; set to a custom QA domain (e.g., `qa.example.com`) to alias the deployment.
- **How it works:** The workflow installs dependencies, runs `npm run build`, then calls the Vercel Action to create a preview deployment. If `QA_ALIAS_DOMAIN` is set, the deployment will be aliased to that domain.
- **Trigger:** Create a `qa` branch and push changes:

```bash
git checkout -b qa
git push origin qa
```

- **Find the URL:** The action logs include the preview URL; if `QA_ALIAS_DOMAIN` is set, visit that domain.
- **Notes:** You must set the secrets in the repository Settings → Secrets & variables → Actions before the workflow can deploy.

### QA Firebase configuration

- **Summary:** The app reads Firebase configuration from environment variables (see `src/services/firebase.ts`). The QA workflow can inject a separate Firebase project's credentials at build time using GitHub Actions secrets (recommended) or by setting Preview environment variables in Vercel.
- **Exact environment keys the app expects (set these for QA):**
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `NEXT_PUBLIC_FIREBASE_VAPID_KEY` (for FCM web push)
  - `FIREBASE_SERVER_KEY` (server key used by backend to send FCM messages)

- **Recommended GitHub Secret names (examples):**
  - `QA_NEXT_PUBLIC_FIREBASE_API_KEY`
  - `QA_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `QA_NEXT_PUBLIC_FIREBASE_DATABASE_URL`
  - `QA_NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `QA_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `QA_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `QA_NEXT_PUBLIC_FIREBASE_APP_ID`
  - `QA_NEXT_PUBLIC_FIREBASE_VAPID_KEY`
  - `QA_FIREBASE_SERVER_KEY`

- **How to wire them (2 options):**
  - Preferred: Add the `QA_...` secrets to the repository (Settings → Secrets & variables → Actions). The QA workflow will inject them into the build and deploy steps.
  - Alternative: Add the same variables directly to your Vercel project under Settings → Environment Variables for the "Preview" environment (these will be used by Preview/QA deployments).

- **Verify:** Deploy to `qa` and visit the debug page at `/debug` to confirm Firebase variables are detected (the app prints whether `NEXT_PUBLIC_FIREBASE_API_KEY` and `NEXT_PUBLIC_FIREBASE_DATABASE_URL` are set).



**Your app is ready to go live! 🚀**
