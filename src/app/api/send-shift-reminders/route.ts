import { NextResponse } from 'next/server';
import { getDatabase, ref, get } from 'firebase/database';
import { initializeApp, getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

type ShiftRecord = {
  caregiverId?: string;
  scheduledStartTime?: string;
  status?: string;
  shiftName?: string;
};

function ensureApp() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
}

export async function GET() {
  try {
    ensureApp();
    const db = getDatabase();
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      return NextResponse.json({ error: 'FIREBASE_SERVICE_ACCOUNT not configured' }, { status: 500 });
    }

    // Fetch scheduled shifts and notification tokens
    const [shiftsSnap, tokensSnap] = await Promise.all([
      get(ref(db, 'scheduled_shifts')),
      get(ref(db, 'notificationTokens')),
    ]);

    const now = Date.now();
    const soonThreshold = 5 * 60 * 1000; // 5 minutes
    const shiftsVal = shiftsSnap.exists() ? shiftsSnap.val() : {};
    const tokensVal = tokensSnap.exists() ? tokensSnap.val() : {};

    const messages: Array<{ token: string; title: string; body: string; shiftName: string; scheduledStartTime: string }> = [];

    const shiftEntries = Object.values(shiftsVal as Record<string, ShiftRecord>);
    shiftEntries.forEach((s) => {
      if (!s.scheduledStartTime) return;
      const start = new Date(s.scheduledStartTime).getTime();
      // Send reminder if the shift starts within next 5 minutes and assigned to caregiver
      if (s.caregiverId && start >= now && start - now <= soonThreshold && s.status !== 'completed') {
        const caregiverToken = tokensVal[s.caregiverId]?.token;
        if (caregiverToken) {
          messages.push({
            token: caregiverToken,
            title: 'Shift Reminder',
            body: `Your shift "${s.shiftName || 'Scheduled Shift'}" is starting soon.`,
            shiftName: s.shiftName || 'Scheduled Shift',
            scheduledStartTime: s.scheduledStartTime,
          });
        }
      }
    });

    // Use FCM HTTP v1 API with service account
    const { google } = await import('googleapis');
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    const jwtClient = new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    
    const accessToken = await jwtClient.authorize().then(() => jwtClient.credentials.access_token);

    const results: Array<{ status: number }> = [];
    for (const msg of messages) {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${firebaseConfig.projectId}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: msg.token,
              notification: {
                title: msg.title,
                body: msg.body,
              },
              data: {
                shiftName: msg.shiftName,
                scheduledStartTime: msg.scheduledStartTime,
              },
              webpush: {
                fcmOptions: {
                  link: '/caregiver',
                },
              },
            },
          }),
        }
      );
      results.push({ status: res.status });
    }

    return NextResponse.json({ sent: results.length, results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Manual send for a specific shift/caregiver (Admin action)
export async function POST(req: Request) {
  try {
    console.log('[POST /api/send-shift-reminders] Starting...');
    ensureApp();
    const db = getDatabase();
    
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    console.log('[POST] Service account configured:', !!serviceAccountJson);
    if (!serviceAccountJson) {
      return NextResponse.json({ 
        error: 'FIREBASE_SERVICE_ACCOUNT environment variable not configured on server',
        hint: 'Add FIREBASE_SERVICE_ACCOUNT to Vercel environment variables'
      }, { status: 500 });
    }

    const body = (await req.json()) as {
      caregiverId?: string;
      shiftName?: string;
      scheduledStartTime?: string;
    };
    console.log('[POST] Request body:', { caregiverId: body?.caregiverId, shiftName: body?.shiftName });
    const { caregiverId, shiftName, scheduledStartTime } = body || {};
    if (!caregiverId || !scheduledStartTime) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        required: ['caregiverId', 'scheduledStartTime'],
        received: body
      }, { status: 400 });
    }

    console.log('[POST] Fetching notification tokens...');
    const tokensSnap = await get(ref(db, 'notificationTokens'));
    const tokensVal = tokensSnap.exists() ? tokensSnap.val() : {};
    console.log('[POST] All registered tokens:', Object.keys(tokensVal));
    
    const token = tokensVal[caregiverId]?.token;
    console.log('[POST] Token for caregiver', caregiverId, ':', token ? 'Found' : 'Not found');
    if (!token) {
      return NextResponse.json({ 
        error: 'Caregiver has no registered FCM token',
        caregiverId,
        hint: 'Caregiver must log in and enable notifications to receive reminders',
        registeredUsers: Object.keys(tokensVal)
      }, { status: 404 });
    }

    // Use FCM HTTP v1 API with service account
    console.log('[POST] Loading googleapis...');
    const { google } = await import('googleapis');
    const serviceAccount = JSON.parse(serviceAccountJson);
    console.log('[POST] Service account project:', serviceAccount.project_id);
    
    console.log('[POST] Creating JWT client...');
    const jwtClient = new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });
    
    console.log('[POST] Authorizing...');
    const accessToken = await jwtClient.authorize().then(() => jwtClient.credentials.access_token);
    console.log('[POST] Access token obtained:', !!accessToken);
    
    const messageBody = {
      message: {
        token,
        notification: {
          title: 'Shift Reminder',
          body: `Your shift "${shiftName || 'Scheduled Shift'}" is starting soon.`,
        },
        data: {
          shiftName: shiftName || 'Scheduled Shift',
          scheduledStartTime: scheduledStartTime,
        },
        webpush: {
          fcmOptions: {
            link: '/caregiver',
          },
        },
      },
    };
    
    console.log('[POST] Sending FCM message...');
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${firebaseConfig.projectId}/messages:send`;
    console.log('[POST] FCM URL:', fcmUrl);
    
    const res = await fetch(fcmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(messageBody),
    });

    const responseText = await res.text();
    console.log('[POST] FCM response status:', res.status);
    console.log('[POST] FCM response body:', responseText);
    
    if (res.ok) {
      return NextResponse.json({ 
        success: true,
        status: res.status, 
        message: 'Notification sent successfully',
        response: responseText 
      });
    } else {
      return NextResponse.json({ 
        success: false,
        status: res.status, 
        error: 'FCM API error',
        response: responseText 
      }, { status: res.status });
    }
  } catch (error: unknown) {
    console.error('[POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json({ 
      success: false,
      error: message,
      stack
    }, { status: 500 });
  }
}
