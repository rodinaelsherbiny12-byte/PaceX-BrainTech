import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { db, getBootstrapData, initDatabase, seedDemoData } from './src/server/db.ts';

initDatabase();

const app = express();
app.use(express.json({ limit: '1mb' }));

// Security headers suitable for AI Studio iframe preview
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

function sanitizeText(val: unknown, maxLen = 500): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

function parseIntBounded(val: unknown, min: number, max: number): number | null {
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < min || rounded > max) return null;
  return rounded;
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mode: 'research-prototype-sqlite', timestamp: new Date().toISOString() });
});

// Hydrate entire app state
app.get('/api/bootstrap', (_req, res) => {
  res.json(getBootstrapData());
});

// Profile & accessibility settings
app.patch('/api/profile', (req, res) => {
  const body = req.body ?? {};
  const current = getBootstrapData().profile;

  const validLangs = ['en', 'de', 'es', 'fr', 'ar'];
  const validSizes = ['standard', 'large', 'xlarge'];
  const validThemes = ['dark', 'light'];

  const name = sanitizeText(body.name, 100) || current.name;
  const conditionNote =
    body.conditionNote !== undefined ? sanitizeText(body.conditionNote, 300) : current.conditionNote;
  const language = validLangs.includes(body.language) ? body.language : current.language;
  const textSize = validSizes.includes(body.textSize) ? body.textSize : current.textSize;
  const theme = validThemes.includes(body.theme) ? body.theme : current.theme;
  const reduceMotion =
    typeof body.reduceMotion === 'boolean' ? (body.reduceMotion ? 1 : 0) : current.reduceMotion ? 1 : 0;
  const highContrast =
    typeof body.highContrast === 'boolean' ? (body.highContrast ? 1 : 0) : current.highContrast ? 1 : 0;
  const voiceFeedback =
    typeof body.voiceFeedback === 'boolean' ? (body.voiceFeedback ? 1 : 0) : current.voiceFeedback ? 1 : 0;
  const notificationsEnabled =
    typeof body.notificationsEnabled === 'boolean'
      ? body.notificationsEnabled
        ? 1
        : 0
      : current.notificationsEnabled
        ? 1
        : 0;
  const patientMode =
    typeof body.patientMode === 'boolean' ? (body.patientMode ? 1 : 0) : current.patientMode ? 1 : 0;
  const demoMode =
    typeof body.demoMode === 'boolean' ? (body.demoMode ? 1 : 0) : current.demoMode ? 1 : 0;

  const updatedAt = new Date().toISOString();

  db.prepare(
    `UPDATE user_profile SET
      name = ?, condition_note = ?, language = ?, text_size = ?, theme = ?,
      reduce_motion = ?, high_contrast = ?, voice_feedback = ?,
      notifications_enabled = ?, patient_mode = ?, demo_mode = ?, updated_at = ?
    WHERE id = 1`,
  ).run(
    name,
    conditionNote,
    language,
    textSize,
    theme,
    reduceMotion,
    highContrast,
    voiceFeedback,
    notificationsEnabled,
    patientMode,
    demoMode,
    updatedAt,
  );

  res.json(getBootstrapData().profile);
});

// Simulated device controller state
app.patch('/api/device', (req, res) => {
  const body = req.body ?? {};
  const current = getBootstrapData().device;

  const connected = typeof body.connected === 'boolean' ? body.connected : current.connected;
  const monitoring = connected
    ? typeof body.monitoring === 'boolean'
      ? body.monitoring
      : current.monitoring
    : false;
  const batteryLevel =
    body.batteryLevel !== undefined
      ? (parseIntBounded(body.batteryLevel, 0, 100) ?? current.batteryLevel)
      : current.batteryLevel;
  const samplingRateHz = body.samplingRateHz === 500 ? 500 : body.samplingRateHz === 250 ? 250 : current.samplingRateHz;
  const notchFilterHz = body.notchFilterHz === 60 ? 60 : body.notchFilterHz === 50 ? 50 : current.notchFilterHz;
  const validProfiles = ['resting-alpha', 'cognitive-load', 'drowsy-theta', 'mixed-artifact'];
  const simulationProfile = validProfiles.includes(body.simulationProfile)
    ? body.simulationProfile
    : current.simulationProfile;

  let components = current.components;
  if (body.components && typeof body.components === 'object') {
    const next = { ...current.components };
    for (const key of Object.keys(current.components) as (keyof typeof current.components)[]) {
      const incoming = body.components[key];
      if (incoming && typeof incoming === 'object') {
        next[key] = {
          ...current.components[key],
          active: typeof incoming.active === 'boolean' ? incoming.active : current.components[key].active,
          simulatedQuality:
            parseIntBounded(incoming.simulatedQuality, 0, 100) ??
            current.components[key].simulatedQuality,
        };
      }
    }
    components = next;
  }

  db.prepare(
    `UPDATE device_state SET
      connected = ?, monitoring = ?, battery_level = ?, sampling_rate_hz = ?,
      notch_filter_hz = ?, simulation_profile = ?, components_json = ?
    WHERE id = 1`,
  ).run(
    connected ? 1 : 0,
    monitoring ? 1 : 0,
    batteryLevel,
    samplingRateHz,
    notchFilterHz,
    simulationProfile,
    JSON.stringify(components),
  );

  res.json(getBootstrapData().device);
});

// Fatigue Tracker CRUD
app.post('/api/fatigue', (req, res) => {
  const body = req.body ?? {};
  const level = parseIntBounded(body.level, 1, 10);
  const activity = sanitizeText(body.activity, 80);
  const notes = sanitizeText(body.notes, 400);
  const recordedAt = sanitizeText(body.recordedAt, 64) || new Date().toISOString();

  if (level === null || !activity) {
    res.status(400).json({ error: 'Valid fatigue level (1-10) and activity are required.' });
    return;
  }

  const info = db
    .prepare('INSERT INTO fatigue_logs (level, activity, notes, recorded_at, is_simulated) VALUES (?, ?, ?, ?, 0)')
    .run(level, activity, notes, recordedAt);

  res.status(201).json({
    id: Number(info.lastInsertRowid),
    level,
    activity,
    notes,
    recordedAt,
    isSimulated: false,
  });
});

app.delete('/api/fatigue/:id', (req, res) => {
  const id = parseIntBounded(req.params.id, 1, 1_000_000_000);
  if (id === null) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }
  db.prepare('DELETE FROM fatigue_logs WHERE id = ?').run(id);
  res.json({ deleted: id });
});

// Medications CRUD
app.post('/api/medications', (req, res) => {
  const body = req.body ?? {};
  const name = sanitizeText(body.name, 120);
  const validTypes = ['Tablet', 'Capsule', 'Injection', 'Infusion', 'Other'];
  const medType = validTypes.includes(body.medType) ? body.medType : 'Tablet';
  const dosageNote = sanitizeText(body.dosageNote, 200);
  const scheduleDate = sanitizeText(body.scheduleDate, 20) || new Date().toISOString().slice(0, 10);
  const reminderTime = sanitizeText(body.reminderTime, 10) || '09:00';
  const validRec = ['Once', 'Daily', 'Every 2 Days', 'Weekly'];
  const recurrence = validRec.includes(body.recurrence) ? body.recurrence : 'Daily';

  if (!name) {
    res.status(400).json({ error: 'Medication name is required.' });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO medications (
        name, med_type, dosage_note, schedule_date, reminder_time,
        recurrence, completed, completed_at, is_simulated
      ) VALUES (?, ?, ?, ?, ?, ?, 0, NULL, 0)`,
    )
    .run(name, medType, dosageNote, scheduleDate, reminderTime, recurrence);

  res.status(201).json({
    id: Number(info.lastInsertRowid),
    name,
    medType,
    dosageNote,
    scheduleDate,
    reminderTime,
    recurrence,
    completed: false,
    completedAt: null,
    isSimulated: false,
  });
});

app.patch('/api/medications/:id', (req, res) => {
  const id = parseIntBounded(req.params.id, 1, 1_000_000_000);
  if (id === null) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }
  const existing = db.prepare('SELECT * FROM medications WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Medication reminder not found' });
    return;
  }

  const body = req.body ?? {};
  const validTypes = ['Tablet', 'Capsule', 'Injection', 'Infusion', 'Other'];
  const validRec = ['Once', 'Daily', 'Every 2 Days', 'Weekly'];

  const name = sanitizeText(body.name, 120) || String(existing.name);
  const medType = validTypes.includes(body.medType) ? body.medType : String(existing.med_type);
  const dosageNote =
    body.dosageNote !== undefined ? sanitizeText(body.dosageNote, 200) : String(existing.dosage_note);
  const scheduleDate = sanitizeText(body.scheduleDate, 20) || String(existing.schedule_date);
  const reminderTime = sanitizeText(body.reminderTime, 10) || String(existing.reminder_time);
  const recurrence = validRec.includes(body.recurrence) ? body.recurrence : String(existing.recurrence);
  const completed =
    typeof body.completed === 'boolean' ? (body.completed ? 1 : 0) : Number(existing.completed);
  const completedAt =
    typeof body.completed === 'boolean'
      ? body.completed
        ? new Date().toISOString()
        : null
      : existing.completed_at
        ? String(existing.completed_at)
        : null;

  db.prepare(
    `UPDATE medications SET
      name = ?, med_type = ?, dosage_note = ?, schedule_date = ?,
      reminder_time = ?, recurrence = ?, completed = ?, completed_at = ?
    WHERE id = ?`,
  ).run(name, medType, dosageNote, scheduleDate, reminderTime, recurrence, completed, completedAt, id);

  res.json({
    id,
    name,
    medType,
    dosageNote,
    scheduleDate,
    reminderTime,
    recurrence,
    completed: Boolean(completed),
    completedAt,
    isSimulated: Boolean(existing.is_simulated),
  });
});

app.delete('/api/medications/:id', (req, res) => {
  const id = parseIntBounded(req.params.id, 1, 1_000_000_000);
  if (id === null) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }
  db.prepare('DELETE FROM medications WHERE id = ?').run(id);
  res.json({ deleted: id });
});

// Manual Health Vitals & Notes
app.post('/api/vitals', (req, res) => {
  const body = req.body ?? {};
  const heartRate = body.heartRate !== undefined && body.heartRate !== '' ? parseIntBounded(body.heartRate, 30, 230) : null;
  const systolic = body.systolic !== undefined && body.systolic !== '' ? parseIntBounded(body.systolic, 60, 260) : null;
  const diastolic = body.diastolic !== undefined && body.diastolic !== '' ? parseIntBounded(body.diastolic, 35, 160) : null;
  const steps = body.steps !== undefined && body.steps !== '' ? parseIntBounded(body.steps, 0, 100000) : null;
  const activityMinutes =
    body.activityMinutes !== undefined && body.activityMinutes !== ''
      ? parseIntBounded(body.activityMinutes, 0, 1440)
      : null;
  const notes = sanitizeText(body.notes, 400);
  const recordedAt = sanitizeText(body.recordedAt, 64) || new Date().toISOString();

  if (heartRate === null && systolic === null && steps === null && !notes) {
    res.status(400).json({ error: 'Enter at least one measurement or personal note.' });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO health_vitals (
        heart_rate, systolic, diastolic, steps, activity_minutes,
        notes, recorded_at, source_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'manual')`,
    )
    .run(heartRate, systolic, diastolic, steps, activityMinutes, notes, recordedAt);

  res.status(201).json({
    id: Number(info.lastInsertRowid),
    heartRate,
    systolic,
    diastolic,
    steps,
    activityMinutes,
    notes,
    recordedAt,
    sourceType: 'manual',
  });
});

app.delete('/api/vitals/:id', (req, res) => {
  const id = parseIntBounded(req.params.id, 1, 1_000_000_000);
  if (id === null) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }
  db.prepare('DELETE FROM health_vitals WHERE id = ?').run(id);
  res.json({ deleted: id });
});

// Simulated EEG Sessions History
app.post('/api/eeg-sessions', (req, res) => {
  const body = req.body ?? {};
  const startedAt = sanitizeText(body.startedAt, 64) || new Date().toISOString();
  const durationSec = parseIntBounded(body.durationSec, 1, 86400) ?? 30;
  const activeChannels = Array.isArray(body.activeChannels)
    ? body.activeChannels.map((c: unknown) => sanitizeText(c, 10)).filter(Boolean)
    : ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8'];
  const avgSignalQuality = parseIntBounded(body.avgSignalQuality, 0, 100) ?? 90;
  const notes = sanitizeText(body.notes, 300) || 'Simulated EEG session snapshot';
  const waveformSnapshot =
    body.waveformSnapshot && typeof body.waveformSnapshot === 'object' ? body.waveformSnapshot : {};

  const info = db
    .prepare(
      `INSERT INTO eeg_sessions (
        started_at, duration_sec, active_channels_json, avg_signal_quality,
        notes, waveform_snapshot_json, is_simulated
      ) VALUES (?, ?, ?, ?, ?, ?, 1)`,
    )
    .run(
      startedAt,
      durationSec,
      JSON.stringify(activeChannels),
      avgSignalQuality,
      notes,
      JSON.stringify(waveformSnapshot),
    );

  res.status(201).json({
    id: Number(info.lastInsertRowid),
    startedAt,
    durationSec,
    activeChannels,
    avgSignalQuality,
    notes,
    waveformSnapshot,
    isSimulated: true,
  });
});

// Emergency Contacts CRUD
app.post('/api/contacts', (req, res) => {
  const body = req.body ?? {};
  const name = sanitizeText(body.name, 100);
  const relationship = sanitizeText(body.relationship, 80);
  const phone = sanitizeText(body.phone, 40);
  const email = sanitizeText(body.email, 120);
  const priority = parseIntBounded(body.priority, 1, 20) ?? 2;
  const messageTemplate =
    sanitizeText(body.messageTemplate, 300) ||
    'NEUROFLOW Alert: I need assistance. Please contact me as soon as possible.';
  const isPrimary = Boolean(body.isPrimary);

  if (!name || !phone) {
    res.status(400).json({ error: 'Contact name and phone number are required.' });
    return;
  }

  const tx = db.transaction(() => {
    if (isPrimary) {
      db.prepare('UPDATE emergency_contacts SET is_primary = 0').run();
    }
    const info = db
      .prepare(
        `INSERT INTO emergency_contacts (
          name, relationship, phone, email, priority, message_template, is_primary
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(name, relationship || 'Trusted Contact', phone, email, priority, messageTemplate, isPrimary ? 1 : 0);
    return Number(info.lastInsertRowid);
  });

  const id = tx();
  res.status(201).json({
    id,
    name,
    relationship: relationship || 'Trusted Contact',
    phone,
    email,
    priority,
    messageTemplate,
    isPrimary,
  });
});

app.patch('/api/contacts/:id', (req, res) => {
  const id = parseIntBounded(req.params.id, 1, 1_000_000_000);
  if (id === null) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }
  const existing = db.prepare('SELECT * FROM emergency_contacts WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Contact not found' });
    return;
  }

  const body = req.body ?? {};
  const name = sanitizeText(body.name, 100) || String(existing.name);
  const relationship = sanitizeText(body.relationship, 80) || String(existing.relationship);
  const phone = sanitizeText(body.phone, 40) || String(existing.phone);
  const email = body.email !== undefined ? sanitizeText(body.email, 120) : String(existing.email);
  const priority = parseIntBounded(body.priority, 1, 20) ?? Number(existing.priority);
  const messageTemplate =
    body.messageTemplate !== undefined
      ? sanitizeText(body.messageTemplate, 300)
      : String(existing.message_template);
  const isPrimary =
    typeof body.isPrimary === 'boolean' ? body.isPrimary : Boolean(existing.is_primary);

  const tx = db.transaction(() => {
    if (isPrimary) {
      db.prepare('UPDATE emergency_contacts SET is_primary = 0').run();
    }
    db.prepare(
      `UPDATE emergency_contacts SET
        name = ?, relationship = ?, phone = ?, email = ?,
        priority = ?, message_template = ?, is_primary = ?
      WHERE id = ?`,
    ).run(name, relationship, phone, email, priority, messageTemplate, isPrimary ? 1 : 0, id);
  });
  tx();

  res.json({ id, name, relationship, phone, email, priority, messageTemplate, isPrimary });
});

app.delete('/api/contacts/:id', (req, res) => {
  const id = parseIntBounded(req.params.id, 1, 1_000_000_000);
  if (id === null) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }
  db.prepare('DELETE FROM emergency_contacts WHERE id = ?').run(id);
  res.json({ deleted: id });
});

// Notifications & Simulated SOS Log
app.post('/api/notifications', (req, res) => {
  const body = req.body ?? {};
  const title = sanitizeText(body.title, 120);
  const message = sanitizeText(body.message, 350);
  const validCats = ['device', 'medication', 'fatigue', 'sos', 'system'];
  const category = validCats.includes(body.category) ? body.category : 'system';
  const createdAt = new Date().toISOString();

  if (!title || !message) {
    res.status(400).json({ error: 'Title and message are required.' });
    return;
  }

  const info = db
    .prepare('INSERT INTO notifications (title, message, category, read, created_at) VALUES (?, ?, ?, 0, ?)')
    .run(title, message, category, createdAt);

  res.status(201).json({
    id: Number(info.lastInsertRowid),
    title,
    message,
    category,
    read: false,
    createdAt,
  });
});

app.patch('/api/notifications/:id/read', (req, res) => {
  const id = parseIntBounded(req.params.id, 1, 1_000_000_000);
  if (id === null) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
  res.json({ id, read: true });
});

app.post('/api/notifications/mark-all-read', (_req, res) => {
  db.prepare('UPDATE notifications SET read = 1').run();
  res.json({ ok: true });
});

// Reset Demo Mode Dataset
app.post('/api/demo/reset', (_req, res) => {
  seedDemoData();
  res.json(getBootstrapData());
});

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const distPath = path.resolve(process.cwd(), 'dist');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (process.env.NODE_ENV !== 'development' && fs.existsSync(path.join(distPath, 'index.html')));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NEUROFLOW server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NEUROFLOW server:', err);
  process.exit(1);
});
