// Minimal Express server with Firebase Admin SDK
// Runs on a trusted environment (NOT the browser)

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');
require('dotenv').config();

const PORT = process.env.PORT || 5001;
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Multer for parsing multipart/form-data file uploads
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

let adminInitialized = false;
let adminInitError = null;

try {
  const options = {
    projectId: 'flodata-tournaments',
  };
  
  // Try Application Default Credentials first, fall back to project-only init
  try {
    options.credential = admin.credential.applicationDefault();
    console.log('[server] Using Application Default Credentials');
  } catch (credErr) {
    console.log('[server] No ADC found, initializing with project config only');
    // For Firebase Admin, we can initialize without credentials if running in Google Cloud
    // or if we only need to use features that don't require authentication
  }

  if (process.env.FIREBASE_DATABASE_URL) {
    options.databaseURL = process.env.FIREBASE_DATABASE_URL;
  }
  if (process.env.FIREBASE_STORAGE_BUCKET) {
    options.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  } else {
    // Default to project-id.appspot.com
    options.storageBucket = 'flodata-tournaments.appspot.com';
  }

  admin.initializeApp(options);
  adminInitialized = true;
  console.log('[server] Firebase Admin initialized');
  console.log('[server] Storage bucket:', options.storageBucket);
} catch (err) {
  adminInitError = err;
  console.warn('[server] Firebase Admin init failed:', err.message);
}

// Health endpoint
app.get('/api/health', async (req, res) => {
  const status = {
    ok: true,
    adminInitialized,
  };
  if (adminInitialized) {
    try {
      // Best-effort: get project ID
      const projectId = admin.app().options?.projectId || process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || null;
      status.projectId = projectId;
    } catch {}
  } else if (adminInitError) {
    status.ok = false;
    status.error = adminInitError.message;
    status.hint = 'Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON and restart.';
  }
  res.json(status);
});

// Example endpoint using Firestore (works only when admin is initialized)
app.get('/api/example', async (req, res) => {
  if (!adminInitialized) {
    return res.status(503).json({ ok: false, error: 'Admin not initialized. See /api/health for details.' });
  }
  try {
    const db = admin.firestore();
    // Read or create a ping doc in a meta collection
    const ref = db.collection('meta').doc('ping');
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({ lastPing: new Date().toISOString() });
      return res.json({ ok: true, created: true });
    }
    await ref.update({ lastPing: new Date().toISOString() });
    return res.json({ ok: true, updated: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// In-memory OTP store (email -> { code, expiresAt })
const otpStore = new Map();

function isGmail(email) {
  return typeof email === 'string' && /^(?:[A-Z0-9._%+-]+)@gmail\.com$/i.test(email.trim());
}

function createTransport() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = port === 465; // true for 465, false for 587
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error('SMTP_USER and SMTP_PASS must be set in environment');
  }
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

// Send OTP endpoint
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email || !isGmail(email)) {
      return res.status(400).json({ error: 'Please use a valid Gmail address (e.g., name@gmail.com).' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email.toLowerCase(), { code, expiresAt });

    const transporter = createTransport();
    const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
    const info = await transporter.sendMail({
      from: `Cricket League <${from}>`,
      to: email,
      subject: 'Your verification code',
      text: `Your One-Time Password (OTP) is ${code}. It expires in 10 minutes.`,
      html: `<p>Your One-Time Password (OTP) is <b>${code}</b>.</p><p>It expires in 10 minutes.</p>`
    });

    return res.json({ ok: true, messageId: info.messageId });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to send OTP', details: e?.message || String(e) });
  }
});

// Verify OTP endpoint
app.post('/api/auth/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !isGmail(email) || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required.' });
    }
    const rec = otpStore.get(email.toLowerCase());
    if (!rec) return res.status(400).json({ error: 'OTP not found. Please request a new code.' });
    if (Date.now() > rec.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return res.status(400).json({ error: 'OTP expired. Please request a new code.' });
    }
    if (String(otp).trim() !== rec.code) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }
    otpStore.delete(email.toLowerCase());
    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'OTP verification failed', details: e?.message || String(e) });
  }
});

// Server-side upload endpoint to avoid browser CORS issues.
// Accepts multipart/form-data with `file`, optional `folder` and `name` fields.
app.post('/api/upload-team-logo', upload.single('file'), async (req, res) => {
  if (!adminInitialized) return res.status(503).json({ ok: false, error: 'Admin not initialized' });
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ ok: false, error: 'No file uploaded' });

    const folder = (req.body.folder || 'team-logos').replace(/[^a-z0-9-\/]/gi, '-');
    const base = String(req.body.name || 'file').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const ext = (file.originalname && file.originalname.includes('.')) ? file.originalname.split('.').pop() : 'png';
    const filename = `${folder}/${base}-${Date.now()}.${ext}`;

    const bucket = admin.storage().bucket();
    const f = bucket.file(filename);
    // Save buffer; set metadata
    await f.save(file.buffer, { metadata: { contentType: file.mimetype } });
    // Make publicly readable (optional). If you prefer signed URLs, replace this with getSignedUrl.
    try { await f.makePublic(); } catch (e) { /* non-fatal */ }
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURI(filename)}`;
    return res.json({ ok: true, url: publicUrl });
  } catch (e) {
    console.error('Server upload error', e);
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
