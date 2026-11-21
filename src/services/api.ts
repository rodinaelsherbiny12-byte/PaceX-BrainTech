import type {
  AppNotification,
  BootstrapPayload,
  DeviceState,
  EegSessionRecord,
  EmergencyContact,
  FatigueLog,
  HealthVital,
  MedicationReminder,
  UserProfile,
} from '../types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err?.error) message = err.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  bootstrap: () => request<BootstrapPayload>('/api/bootstrap'),

  updateProfile: (patch: Partial<UserProfile>) =>
    request<UserProfile>('/api/profile', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  updateDevice: (patch: Partial<DeviceState>) =>
    request<DeviceState>('/api/device', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  addFatigue: (payload: { level: number; activity: string; notes: string; recordedAt?: string }) =>
    request<FatigueLog>('/api/fatigue', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteFatigue: (id: number) =>
    request<{ deleted: number }>(`/api/fatigue/${id}`, { method: 'DELETE' }),

  addMedication: (payload: {
    name: string;
    medType: string;
    dosageNote: string;
    scheduleDate: string;
    reminderTime: string;
    recurrence: string;
  }) =>
    request<MedicationReminder>('/api/medications', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateMedication: (id: number, patch: Partial<MedicationReminder>) =>
    request<MedicationReminder>(`/api/medications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteMedication: (id: number) =>
    request<{ deleted: number }>(`/api/medications/${id}`, { method: 'DELETE' }),

  addVital: (payload: {
    heartRate?: number | string;
    systolic?: number | string;
    diastolic?: number | string;
    steps?: number | string;
    activityMinutes?: number | string;
    notes: string;
    recordedAt?: string;
  }) =>
    request<HealthVital>('/api/vitals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteVital: (id: number) =>
    request<{ deleted: number }>(`/api/vitals/${id}`, { method: 'DELETE' }),

  addEegSession: (payload: {
    startedAt: string;
    durationSec: number;
    activeChannels: string[];
    avgSignalQuality: number;
    notes: string;
    waveformSnapshot: Record<string, number[]>;
  }) =>
    request<EegSessionRecord>('/api/eeg-sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  addContact: (payload: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
    priority: number;
    messageTemplate: string;
    isPrimary: boolean;
  }) =>
    request<EmergencyContact>('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateContact: (id: number, patch: Partial<EmergencyContact>) =>
    request<EmergencyContact>(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteContact: (id: number) =>
    request<{ deleted: number }>(`/api/contacts/${id}`, { method: 'DELETE' }),

  addNotification: (payload: {
    title: string;
    message: string;
    category: AppNotification['category'];
  }) =>
    request<AppNotification>('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  markNotificationRead: (id: number) =>
    request<{ id: number; read: boolean }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    }),

  markAllNotificationsRead: () =>
    request<{ ok: boolean }>('/api/notifications/mark-all-read', { method: 'POST' }),

  resetDemo: () => request<BootstrapPayload>('/api/demo/reset', { method: 'POST' }),
};
