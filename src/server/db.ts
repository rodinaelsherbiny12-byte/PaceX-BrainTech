import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type {
  AppNotification,
  BootstrapPayload,
  DeviceComponentId,
  DeviceComponentState,
  DeviceState,
  EegSessionRecord,
  EmergencyContact,
  FatigueLog,
  HealthVital,
  MedicationReminder,
  UserProfile,
} from '../types.ts';
import { DEFAULT_DEVICE_COMPONENTS } from '../services/eegDeviceAdapter.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'neuroflow.db');
export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      avatar_url TEXT NOT NULL,
      condition_note TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      text_size TEXT NOT NULL DEFAULT 'standard',
      theme TEXT NOT NULL DEFAULT 'dark',
      reduce_motion INTEGER NOT NULL DEFAULT 0,
      high_contrast INTEGER NOT NULL DEFAULT 0,
      voice_feedback INTEGER NOT NULL DEFAULT 1,
      notifications_enabled INTEGER NOT NULL DEFAULT 1,
      patient_mode INTEGER NOT NULL DEFAULT 0,
      demo_mode INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS device_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      connected INTEGER NOT NULL DEFAULT 1,
      monitoring INTEGER NOT NULL DEFAULT 0,
      battery_level INTEGER NOT NULL DEFAULT 84,
      sampling_rate_hz INTEGER NOT NULL DEFAULT 250,
      notch_filter_hz INTEGER NOT NULL DEFAULT 50,
      simulation_profile TEXT NOT NULL DEFAULT 'resting-alpha',
      components_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fatigue_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level INTEGER NOT NULL,
      activity TEXT NOT NULL,
      notes TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      is_simulated INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      med_type TEXT NOT NULL,
      dosage_note TEXT NOT NULL,
      schedule_date TEXT NOT NULL,
      reminder_time TEXT NOT NULL,
      recurrence TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      is_simulated INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS health_vitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      heart_rate INTEGER,
      systolic INTEGER,
      diastolic INTEGER,
      steps INTEGER,
      activity_minutes INTEGER,
      notes TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'manual'
    );

    CREATE TABLE IF NOT EXISTS eeg_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      duration_sec INTEGER NOT NULL,
      active_channels_json TEXT NOT NULL,
      avg_signal_quality INTEGER NOT NULL,
      notes TEXT NOT NULL,
      waveform_snapshot_json TEXT NOT NULL,
      is_simulated INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 1,
      message_template TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  const profileCount = db.prepare('SELECT COUNT(*) as c FROM user_profile').get() as { c: number };
  if (profileCount.c === 0) {
    seedDemoData();
  }
}

function isoDaysAgo(daysAgo: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function dateStringOffset(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

function buildSnapshotWave(seedOffset: number): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (let ch = 1; ch <= 8; ch++) {
    const arr: number[] = [];
    for (let i = 0; i < 40; i++) {
      const t = i / 10;
      const val =
        Math.sin(t * 6.2 + ch * 0.7 + seedOffset) * (14 + ch * 0.8) +
        Math.cos(t * 11.4 + ch) * 6;
      arr.push(Number(val.toFixed(2)));
    }
    out[`CH${ch}`] = arr;
  }
  return out;
}

export function seedDemoData(): void {
  const tx = db.transaction(() => {
    db.exec(`
      DELETE FROM user_profile;
      DELETE FROM device_state;
      DELETE FROM fatigue_logs;
      DELETE FROM medications;
      DELETE FROM health_vitals;
      DELETE FROM eeg_sessions;
      DELETE FROM emergency_contacts;
      DELETE FROM notifications;
    `);

    const nowIso = new Date().toISOString();
    db.prepare(
      `INSERT INTO user_profile (
        id, name, avatar_url, condition_note, language, text_size, theme,
        reduce_motion, high_contrast, voice_feedback, notifications_enabled,
        patient_mode, demo_mode, updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'Elena Vance',
      '/src/assets/images/avatar_patient_profile_1795248522176.jpg',
      'Relapsing-Remitting MS · Exploring daily fatigue patterns (Research Demo Profile)',
      'en',
      'standard',
      'dark',
      0,
      0,
      1,
      1,
      0,
      1,
      nowIso,
    );

    db.prepare(
      `INSERT INTO device_state (
        id, connected, monitoring, battery_level, sampling_rate_hz,
        notch_filter_hz, simulation_profile, components_json
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      1,
      1,
      86,
      250,
      50,
      'resting-alpha',
      JSON.stringify(DEFAULT_DEVICE_COMPONENTS),
    );

    const insertFatigue = db.prepare(
      'INSERT INTO fatigue_logs (level, activity, notes, recorded_at, is_simulated) VALUES (?, ?, ?, ?, ?)',
    );
    const fatigueSeeds = [
      [3, 'Morning Rest', 'Slept 7.5 hours, steady morning clarity before stretching.', isoDaysAgo(6, 9, 15), 1],
      [6, 'Screen Work', 'Afternoon cognitive fatigue after 90 min of reading reports.', isoDaysAgo(5, 15, 30), 1],
      [4, 'Light Walk', 'Short 15-minute shaded park walk felt refreshing.', isoDaysAgo(4, 11, 20), 1],
      [7, 'Household Tasks', 'Warm room temperature increased tiredness during errands.', isoDaysAgo(3, 17, 10), 1],
      [5, 'Physical Therapy', 'Guided mobility exercises with scheduled rest breaks.', isoDaysAgo(2, 13, 45), 1],
      [4, 'Reading', 'Quiet afternoon reading in cool room.', isoDaysAgo(1, 14, 0), 1],
      [3, 'Morning Rest', 'Calm baseline session prior to simulated EEG demonstration.', isoDaysAgo(0, 8, 40), 1],
    ] as const;
    for (const row of fatigueSeeds) {
      insertFatigue.run(...row);
    }

    const insertMed = db.prepare(
      `INSERT INTO medications (
        name, med_type, dosage_note, schedule_date, reminder_time,
        recurrence, completed, completed_at, is_simulated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const medSeeds = [
      [
        'Disease-Modifying Therapy A (Demo)',
        'Injection',
        'Per physician schedule — rotate injection site',
        dateStringOffset(0),
        '20:00',
        'Every 2 Days',
        0,
        null,
        1,
      ],
      [
        'Vitamin D3 Supplement (Demo)',
        'Capsule',
        'Take with breakfast as prescribed',
        dateStringOffset(0),
        '09:00',
        'Daily',
        1,
        isoDaysAgo(0, 9, 5),
        1,
      ],
      [
        'Magnesium Glycinate (Demo)',
        'Tablet',
        'Evening routine support (user-entered schedule)',
        dateStringOffset(0),
        '21:30',
        'Daily',
        0,
        null,
        1,
      ],
      [
        'Physical Therapy Hydration & Rest',
        'Other',
        'Scheduled cooling & rest check-in',
        dateStringOffset(1),
        '14:00',
        'Weekly',
        0,
        null,
        1,
      ],
    ] as const;
    for (const row of medSeeds) {
      insertMed.run(...row);
    }

    const insertVital = db.prepare(
      `INSERT INTO health_vitals (
        heart_rate, systolic, diastolic, steps, activity_minutes,
        notes, recorded_at, source_type
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const vitalSeeds = [
      [71, 116, 74, 4200, 28, 'Morning baseline check via external cuff (Demo)', isoDaysAgo(5, 8, 30), 'simulated'],
      [76, 120, 78, 5100, 35, 'Afternoon pulse oximeter reading (Demo)', isoDaysAgo(4, 16, 0), 'simulated'],
      [69, 114, 72, 3800, 22, 'Calm rest day vitals (Demo)', isoDaysAgo(3, 10, 15), 'simulated'],
      [74, 118, 76, 4850, 32, 'Post-walk manual cuff record (Demo)', isoDaysAgo(2, 12, 0), 'simulated'],
      [72, 117, 75, 5340, 38, 'Steady morning reading (Demo)', isoDaysAgo(1, 9, 0), 'simulated'],
      [70, 115, 73, 3120, 24, 'Morning vitals prior to EEG demo session', isoDaysAgo(0, 8, 20), 'simulated'],
    ] as const;
    for (const row of vitalSeeds) {
      insertVital.run(...row);
    }

    const insertEeg = db.prepare(
      `INSERT INTO eeg_sessions (
        started_at, duration_sec, active_channels_json, avg_signal_quality,
        notes, waveform_snapshot_json, is_simulated
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const allCh = ['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8'];
    insertEeg.run(
      isoDaysAgo(2, 10, 0),
      600,
      JSON.stringify(allCh),
      91,
      'Resting eyes-closed simulated baseline (10 min)',
      JSON.stringify(buildSnapshotWave(0.2)),
      1,
    );
    insertEeg.run(
      isoDaysAgo(1, 15, 15),
      420,
      JSON.stringify(allCh),
      89,
      'Afternoon simulated cognitive task comparison run',
      JSON.stringify(buildSnapshotWave(1.5)),
      1,
    );
    insertEeg.run(
      isoDaysAgo(0, 9, 30),
      300,
      JSON.stringify(allCh),
      93,
      'Morning simulated 8-channel resting alpha demonstration',
      JSON.stringify(buildSnapshotWave(2.7)),
      1,
    );

    const insertContact = db.prepare(
      `INSERT INTO emergency_contacts (
        name, relationship, phone, email, priority, message_template, is_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    insertContact.run(
      'Marcus Vance',
      'Spouse / Primary Care Partner',
      '+1 (555) 234-8910',
      'marcus.vance@example.org',
      1,
      'NEUROFLOW Alert: I am experiencing high fatigue or need immediate assistance. Please check on me or call right away.',
      1,
    );
    insertContact.run(
      'Dr. Nadia Haddad',
      'Neurology Clinic Coordinator',
      '+1 (555) 890-4412',
      'clinic.neuro@example.org',
      2,
      'Patient check-in request from NEUROFLOW prototype regarding scheduled symptom log.',
      0,
    );
    insertContact.run(
      'Clara Vance',
      'Sister / Family Contact',
      '+1 (555) 412-6670',
      'clara.v@example.org',
      3,
      'Hi Clara, I triggered my NEUROFLOW assistance alert and could use support today.',
      0,
    );

    const insertNotif = db.prepare(
      'INSERT INTO notifications (title, message, category, read, created_at) VALUES (?, ?, ?, ?, ?)',
    );
    insertNotif.run(
      'Demo Mode Active',
      'Simulated 8-channel EEG headband and sample MS research data are loaded for presentation.',
      'system',
      0,
      isoDaysAgo(0, 8, 0),
    );
    insertNotif.run(
      'Upcoming Medication Reminder',
      'Disease-Modifying Therapy A (Demo) is scheduled for 20:00 today.',
      'medication',
      0,
      isoDaysAgo(0, 8, 15),
    );
    insertNotif.run(
      'Simulated Signal Quality Nominal',
      'All 8 dry EEG electrode channels (Fp1–P4) show simulated contact above 87%.',
      'device',
      1,
      isoDaysAgo(0, 9, 30),
    );
  });

  tx();
}

export function getBootstrapData(): BootstrapPayload {
  const pRow = db.prepare('SELECT * FROM user_profile WHERE id = 1').get() as Record<string, unknown>;
  const dRow = db.prepare('SELECT * FROM device_state WHERE id = 1').get() as Record<string, unknown>;

  const profile: UserProfile = {
    id: Number(pRow.id),
    name: String(pRow.name),
    avatarUrl: String(pRow.avatar_url),
    conditionNote: String(pRow.condition_note),
    language: pRow.language as UserProfile['language'],
    textSize: pRow.text_size as UserProfile['textSize'],
    theme: pRow.theme as UserProfile['theme'],
    reduceMotion: Boolean(pRow.reduce_motion),
    highContrast: Boolean(pRow.high_contrast),
    voiceFeedback: Boolean(pRow.voice_feedback),
    notificationsEnabled: Boolean(pRow.notifications_enabled),
    patientMode: Boolean(pRow.patient_mode),
    demoMode: Boolean(pRow.demo_mode),
    updatedAt: String(pRow.updated_at),
  };

  let parsedComponents: Record<DeviceComponentId, DeviceComponentState> = DEFAULT_DEVICE_COMPONENTS;
  try {
    parsedComponents = JSON.parse(String(dRow.components_json));
  } catch {
    parsedComponents = DEFAULT_DEVICE_COMPONENTS;
  }

  const device: DeviceState = {
    id: Number(dRow.id),
    connected: Boolean(dRow.connected),
    monitoring: Boolean(dRow.monitoring),
    batteryLevel: Number(dRow.battery_level),
    samplingRateHz: Number(dRow.sampling_rate_hz) === 500 ? 500 : 250,
    notchFilterHz: Number(dRow.notch_filter_hz) === 60 ? 60 : 50,
    simulationProfile: dRow.simulation_profile as DeviceState['simulationProfile'],
    components: parsedComponents,
  };

  const fatigueLogs = (
    db.prepare('SELECT * FROM fatigue_logs ORDER BY recorded_at DESC, id DESC').all() as Record<
      string,
      unknown
    >[]
  ).map(
    (r): FatigueLog => ({
      id: Number(r.id),
      level: Number(r.level),
      activity: String(r.activity),
      notes: String(r.notes),
      recordedAt: String(r.recorded_at),
      isSimulated: Boolean(r.is_simulated),
    }),
  );

  const medications = (
    db.prepare('SELECT * FROM medications ORDER BY completed ASC, schedule_date ASC, reminder_time ASC').all() as Record<
      string,
      unknown
    >[]
  ).map(
    (r): MedicationReminder => ({
      id: Number(r.id),
      name: String(r.name),
      medType: r.med_type as MedicationReminder['medType'],
      dosageNote: String(r.dosage_note),
      scheduleDate: String(r.schedule_date),
      reminderTime: String(r.reminder_time),
      recurrence: r.recurrence as MedicationReminder['recurrence'],
      completed: Boolean(r.completed),
      completedAt: r.completed_at ? String(r.completed_at) : null,
      isSimulated: Boolean(r.is_simulated),
    }),
  );

  const healthVitals = (
    db.prepare('SELECT * FROM health_vitals ORDER BY recorded_at DESC, id DESC').all() as Record<
      string,
      unknown
    >[]
  ).map(
    (r): HealthVital => ({
      id: Number(r.id),
      heartRate: r.heart_rate !== null ? Number(r.heart_rate) : null,
      systolic: r.systolic !== null ? Number(r.systolic) : null,
      diastolic: r.diastolic !== null ? Number(r.diastolic) : null,
      steps: r.steps !== null ? Number(r.steps) : null,
      activityMinutes: r.activity_minutes !== null ? Number(r.activity_minutes) : null,
      notes: String(r.notes),
      recordedAt: String(r.recorded_at),
      sourceType: r.source_type === 'simulated' ? 'simulated' : 'manual',
    }),
  );

  const eegSessions = (
    db.prepare('SELECT * FROM eeg_sessions ORDER BY started_at DESC, id DESC').all() as Record<
      string,
      unknown
    >[]
  ).map((r): EegSessionRecord => {
    let activeChannels: string[] = [];
    let waveformSnapshot: Record<string, number[]> = {};
    try {
      activeChannels = JSON.parse(String(r.active_channels_json));
    } catch {
      activeChannels = [];
    }
    try {
      waveformSnapshot = JSON.parse(String(r.waveform_snapshot_json));
    } catch {
      waveformSnapshot = {};
    }
    return {
      id: Number(r.id),
      startedAt: String(r.started_at),
      durationSec: Number(r.duration_sec),
      activeChannels,
      avgSignalQuality: Number(r.avg_signal_quality),
      notes: String(r.notes),
      waveformSnapshot,
      isSimulated: Boolean(r.is_simulated),
    };
  });

  const emergencyContacts = (
    db.prepare('SELECT * FROM emergency_contacts ORDER BY is_primary DESC, priority ASC, id ASC').all() as Record<
      string,
      unknown
    >[]
  ).map(
    (r): EmergencyContact => ({
      id: Number(r.id),
      name: String(r.name),
      relationship: String(r.relationship),
      phone: String(r.phone),
      email: String(r.email),
      priority: Number(r.priority),
      messageTemplate: String(r.message_template),
      isPrimary: Boolean(r.is_primary),
    }),
  );

  const notifications = (
    db.prepare('SELECT * FROM notifications ORDER BY created_at DESC, id DESC LIMIT 25').all() as Record<
      string,
      unknown
    >[]
  ).map(
    (r): AppNotification => ({
      id: Number(r.id),
      title: String(r.title),
      message: String(r.message),
      category: r.category as AppNotification['category'],
      read: Boolean(r.read),
      createdAt: String(r.created_at),
    }),
  );

  return {
    profile,
    device,
    fatigueLogs,
    medications,
    healthVitals,
    eegSessions,
    emergencyContacts,
    notifications,
  };
}
