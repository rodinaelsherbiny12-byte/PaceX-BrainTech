export type PageId =
  | 'home'
  | 'device'
  | 'eeg'
  | 'health'
  | 'fatigue'
  | 'medications'
  | 'sos'
  | 'voice'
  | 'reports'
  | 'settings';

export type TextSizeOption = 'standard' | 'large' | 'xlarge';
export type ThemeOption = 'dark' | 'light';
export type LanguageCode = 'en' | 'de' | 'es' | 'fr' | 'ar';
export type SimulationProfile = 'resting-alpha' | 'cognitive-load' | 'drowsy-theta' | 'mixed-artifact';

export type DeviceComponentId =
  | 'E1'
  | 'E2'
  | 'E3'
  | 'E4'
  | 'E5'
  | 'E6'
  | 'E7'
  | 'E8'
  | 'structure'
  | 'holders'
  | 'electronics'
  | 'battery';

export interface DeviceComponentState {
  id: DeviceComponentId;
  kind: 'electrode' | 'hardware';
  label: string;
  electrodeNumber?: number;
  channelId?: string;
  position1020?: string;
  locationLabel: string;
  proposedFunction: string;
  active: boolean;
  simulatedQuality: number; // 0-100
  impedanceKOhm: number; // simulated kOhm
}

export interface DeviceState {
  id: number;
  connected: boolean;
  monitoring: boolean;
  batteryLevel: number;
  samplingRateHz: 250 | 500;
  notchFilterHz: 50 | 60;
  simulationProfile: SimulationProfile;
  components: Record<DeviceComponentId, DeviceComponentState>;
}

export interface UserProfile {
  id: number;
  name: string;
  avatarUrl: string;
  conditionNote: string;
  language: LanguageCode;
  textSize: TextSizeOption;
  theme: ThemeOption;
  reduceMotion: boolean;
  highContrast: boolean;
  voiceFeedback: boolean;
  notificationsEnabled: boolean;
  patientMode: boolean;
  demoMode: boolean;
  updatedAt: string;
}

export interface FatigueLog {
  id: number;
  level: number; // 1-10
  activity: string;
  notes: string;
  recordedAt: string;
  isSimulated: boolean;
}

export type MedicationType = 'Tablet' | 'Capsule' | 'Injection' | 'Infusion' | 'Other';
export type MedicationRecurrence = 'Once' | 'Daily' | 'Every 2 Days' | 'Weekly';

export interface MedicationReminder {
  id: number;
  name: string;
  medType: MedicationType;
  dosageNote: string;
  scheduleDate: string;
  reminderTime: string;
  recurrence: MedicationRecurrence;
  completed: boolean;
  completedAt: string | null;
  isSimulated: boolean;
}

export interface HealthVital {
  id: number;
  heartRate: number | null;
  systolic: number | null;
  diastolic: number | null;
  steps: number | null;
  activityMinutes: number | null;
  notes: string;
  recordedAt: string;
  sourceType: 'manual' | 'simulated';
}

export interface EegSessionRecord {
  id: number;
  startedAt: string;
  durationSec: number;
  activeChannels: string[];
  avgSignalQuality: number;
  notes: string;
  waveformSnapshot: Record<string, number[]>;
  isSimulated: boolean;
}

export interface EmergencyContact {
  id: number;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  priority: number;
  messageTemplate: string;
  isPrimary: boolean;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  category: 'device' | 'medication' | 'fatigue' | 'sos' | 'system';
  read: boolean;
  createdAt: string;
}

export interface BootstrapPayload {
  profile: UserProfile;
  device: DeviceState;
  fatigueLogs: FatigueLog[];
  medications: MedicationReminder[];
  healthVitals: HealthVital[];
  eegSessions: EegSessionRecord[];
  emergencyContacts: EmergencyContact[];
  notifications: AppNotification[];
}
