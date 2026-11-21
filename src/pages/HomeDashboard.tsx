import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Brain,
  CheckCircle2,
  Cpu,
  HeartPulse,
  Mic,
  Pill,
  ShieldAlert,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { BootstrapPayload, PageId } from '../types';
import { EegWaveformCanvas } from '../components/EegWaveformCanvas';
import type { UiStrings } from '../i18n/translations';

interface HomeDashboardProps {
  data: BootstrapPayload;
  strings: UiStrings;
  onNavigate: (page: PageId) => void;
  onCompleteMedication: (id: number, completed: boolean) => void;
  onToggleMonitoring: () => void;
  onMarkNotificationRead: (id: number) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  data,
  strings,
  onNavigate,
  onCompleteMedication,
  onToggleMonitoring,
  onMarkNotificationRead,
}) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const { profile, device, fatigueLogs, medications, healthVitals, notifications } = data;
  const latestFatigue = fatigueLogs[0];
  const latestVital = healthVitals[0];
  const upcomingMeds = medications.filter((m) => !m.completed).slice(0, 3);
  const unreadNotifs = notifications.filter((n) => !n.read).slice(0, 4);
  const activeElectrodeCount = Object.values(device.components).filter(
    (c) => c.kind === 'electrode' && c.active,
  ).length;

  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Simplified extra-accessible layout when Patient Mode is active
  if (profile.patientMode) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-700/50 bg-[var(--nf-surface)] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="h-16 w-16 rounded-2xl border border-[#20C5D8]/40 object-cover"
              />
              <div>
                <p className="text-sm text-[var(--nf-text-muted)]">
                  {formattedDate} · <span className="font-mono-tabular">{formattedTime}</span>
                </p>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {strings.welcome}, {profile.name}
                </h1>
                <p className="mt-1 text-sm text-[#20C5D8]">
                  Patient Mode Active · Large-Target Simplified Controls
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('voice')}
                className="flex min-h-[54px] items-center gap-2.5 rounded-xl bg-[#7657F6] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#6646eb]"
              >
                <Mic className="h-5 w-5" />
                <span>Voice Assistant</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('sos')}
                className="flex min-h-[54px] items-center gap-2.5 rounded-xl bg-[#F05263] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#dc3f51]"
              >
                <ShieldAlert className="h-5 w-5" />
                <span>Emergency SOS</span>
              </button>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => onNavigate('device')}
            className="flex min-h-[128px] flex-col justify-between rounded-2xl border border-[#20C5D8]/40 bg-[var(--nf-surface)] p-6 text-left transition-colors hover:border-[#20C5D8]"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">3D Head Device</span>
              <Cpu className="h-7 w-7 text-[#20C5D8]" />
            </div>
            <p className="text-base text-[var(--nf-text-muted)]">
              Simulated: {device.connected ? 'Connected' : 'Disconnected'} · Battery{' '}
              <span className="font-mono-tabular">{device.batteryLevel}%</span>
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('fatigue')}
            className="flex min-h-[128px] flex-col justify-between rounded-2xl border border-[#7657F6]/40 bg-[var(--nf-surface)] p-6 text-left transition-colors hover:border-[#7657F6]"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Log My Fatigue</span>
              <Activity className="h-7 w-7 text-[#7657F6]" />
            </div>
            <p className="text-base text-[var(--nf-text-muted)]">
              Latest entry:{' '}
              <span className="font-mono-tabular font-semibold text-[var(--nf-text)]">
                {latestFatigue ? `${latestFatigue.level}/10` : 'None yet'}
              </span>{' '}
              · Tap to record how you feel
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('medications')}
            className="flex min-h-[128px] flex-col justify-between rounded-2xl border border-[#FFB547]/40 bg-[var(--nf-surface)] p-6 text-left transition-colors hover:border-[#FFB547]"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Medication Reminders</span>
              <Pill className="h-7 w-7 text-[#FFB547]" />
            </div>
            <p className="text-base text-[var(--nf-text-muted)]">
              {upcomingMeds.length > 0
                ? `Next: ${upcomingMeds[0].name} at ${upcomingMeds[0].reminderTime}`
                : 'All scheduled reminders completed'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('eeg')}
            className="flex min-h-[128px] flex-col justify-between rounded-2xl border border-[#35C98A]/40 bg-[var(--nf-surface)] p-6 text-left transition-colors hover:border-[#35C98A]"
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Simulated EEG Signals</span>
              <Brain className="h-7 w-7 text-[#35C98A]" />
            </div>
            <p className="text-base text-[var(--nf-text-muted)]">
              {device.monitoring ? 'Streaming 8 simulated channels' : 'Monitoring paused'}
            </p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Top Summary Hero */}
      <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              referrerPolicy="no-referrer"
              className="h-16 w-16 shrink-0 rounded-2xl border border-[#7657F6]/40 object-cover"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--nf-text-muted)]">
                <span>{formattedDate}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{formattedTime}</span>
                <span aria-hidden="true">·</span>
                <span className="font-medium text-[#20C5D8]">Research Prototype</span>
              </div>
              <h1 className="mt-1 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
                {strings.welcome}, {profile.name}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[var(--nf-text-muted)]">
                {profile.conditionNote}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('device')}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#7657F6] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6646eb]"
            >
              <Cpu className="h-4 w-4" />
              <span>Open 3D Device</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('voice')}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[#20C5D8]/50 bg-[#20C5D8]/10 px-4 py-2.5 text-sm font-semibold text-[#20C5D8] transition-colors hover:bg-[#20C5D8]/20"
            >
              <Mic className="h-4 w-4" />
              <span>Voice Assistant</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('sos')}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-[#F05263] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#dc3f51]"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Emergency SOS</span>
            </button>
          </div>
        </div>

        {/* 4-column Overview Metric Strip */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-[var(--nf-border)] pt-6 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-[var(--nf-surface-alt)] p-4">
            <div className="flex items-center justify-between text-xs text-[var(--nf-text-muted)]">
              <span>Headset Status (Simulated)</span>
              {device.connected ? (
                <Wifi className="h-4 w-4 text-[#35C98A]" />
              ) : (
                <WifiOff className="h-4 w-4 text-slate-400" />
              )}
            </div>
            <p className="mt-2 text-lg font-bold">
              {device.connected ? (device.monitoring ? 'Streaming 8-Ch' : 'Connected Idle') : 'Disconnected'}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--nf-text-muted)]">
              <BatteryCharging className="h-3.5 w-3.5 text-[#35C98A]" />
              <span className="font-mono-tabular">Battery {device.batteryLevel}%</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular">{activeElectrodeCount}/8 active</span>
            </p>
          </div>

          <div className="rounded-xl bg-[var(--nf-surface-alt)] p-4">
            <div className="flex items-center justify-between text-xs text-[var(--nf-text-muted)]">
              <span>Latest Fatigue Log</span>
              <Activity className="h-4 w-4 text-[#7657F6]" />
            </div>
            <p className="mt-2 font-mono-tabular text-lg font-bold">
              {latestFatigue ? `${latestFatigue.level} / 10` : 'No entries'}
            </p>
            <p className="mt-1 truncate text-xs text-[var(--nf-text-muted)]">
              {latestFatigue
                ? `${latestFatigue.activity} · ${latestFatigue.isSimulated ? 'Demo' : 'User'}`
                : 'Log your first daily fatigue entry'}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--nf-surface-alt)] p-4">
            <div className="flex items-center justify-between text-xs text-[var(--nf-text-muted)]">
              <span>Heart Rate ({latestVital?.sourceType === 'manual' ? 'Manual' : 'Demo'})</span>
              <HeartPulse className="h-4 w-4 text-[#F05263]" />
            </div>
            <p className="mt-2 font-mono-tabular text-lg font-bold">
              {latestVital?.heartRate ? `${latestVital.heartRate} bpm` : '—'}
            </p>
            <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
              {latestVital?.systolic && latestVital?.diastolic
                ? `BP ${latestVital.systolic}/${latestVital.diastolic} mmHg (Not from EEG)`
                : 'External / manually logged metric'}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--nf-surface-alt)] p-4">
            <div className="flex items-center justify-between text-xs text-[var(--nf-text-muted)]">
              <span>Upcoming Medications</span>
              <Pill className="h-4 w-4 text-[#FFB547]" />
            </div>
            <p className="mt-2 font-mono-tabular text-lg font-bold">
              {upcomingMeds.length} Pending
            </p>
            <p className="mt-1 truncate text-xs text-[var(--nf-text-muted)]">
              {upcomingMeds[0]
                ? `Next: ${upcomingMeds[0].name} (${upcomingMeds[0].reminderTime})`
                : 'All reminders completed'}
            </p>
          </div>
        </div>
      </section>

      {/* Main Two-Column Content Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left 7 cols: Live Simulated EEG Preview + Quick Access */}
        <div className="space-y-6 xl:col-span-7">
          <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-[#20C5D8]" />
                  <h2 className="text-lg font-bold">EEG Monitoring Overview</h2>
                </div>
                <p className="mt-0.5 text-xs font-medium text-[#FFB547]">
                  SIMULATED EEG DATA — NOT REAL SENSOR MEASUREMENTS
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleMonitoring}
                  className={`min-h-[40px] rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                    device.monitoring
                      ? 'border border-[#FFB547]/50 bg-[#FFB547]/15 text-[#FFB547] hover:bg-[#FFB547]/25'
                      : 'bg-[#20C5D8] text-slate-950 hover:bg-[#1bb2c4]'
                  }`}
                >
                  {device.monitoring ? 'Pause Simulation' : 'Start Simulation'}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('eeg')}
                  className="min-h-[40px] rounded-xl border border-[var(--nf-border)] px-3.5 py-2 text-xs font-semibold hover:border-[#7657F6]"
                >
                  Full 8-Ch View
                </button>
              </div>
            </div>

            <EegWaveformCanvas
              device={device}
              selectedChannel="ALL"
              compact
              reduceMotion={profile.reduceMotion}
            />
          </section>

          {/* Quick Access Modules */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onNavigate('fatigue')}
              className="flex flex-col justify-between rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5 text-left transition-colors hover:border-[#7657F6]"
            >
              <Activity className="h-6 w-6 text-[#7657F6]" />
              <div className="mt-4">
                <h3 className="font-semibold">Fatigue Tracker</h3>
                <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
                  Record current fatigue scale & activity notes
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('health')}
              className="flex flex-col justify-between rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5 text-left transition-colors hover:border-[#35C98A]"
            >
              <HeartPulse className="h-6 w-6 text-[#35C98A]" />
              <div className="mt-4">
                <h3 className="font-semibold">Health Monitor</h3>
                <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
                  Log manual heart rate, blood pressure & steps
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="flex flex-col justify-between rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5 text-left transition-colors hover:border-[#20C5D8]"
            >
              <Sparkles className="h-6 w-6 text-[#20C5D8]" />
              <div className="mt-4">
                <h3 className="font-semibold">Health Reports</h3>
                <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
                  Daily & weekly summaries with PDF export
                </p>
              </div>
            </button>
          </section>
        </div>

        {/* Right 5 cols: Medication Reminders & Recent Notifications */}
        <div className="space-y-6 xl:col-span-5">
          <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-[#FFB547]" />
                <h2 className="text-lg font-bold">Upcoming Medications</h2>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('medications')}
                className="text-xs font-semibold text-[#7657F6] hover:underline"
              >
                Manage All
              </button>
            </div>

            {upcomingMeds.length === 0 ? (
              <p className="rounded-xl bg-[var(--nf-surface-alt)] p-4 text-sm text-[var(--nf-text-muted)]">
                No pending medication reminders right now.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingMeds.map((med) => (
                  <div
                    key={med.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{med.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--nf-text-muted)]">
                        {med.medType} ·{' '}
                        <span className="font-mono-tabular text-[#FFB547]">{med.reminderTime}</span> ·{' '}
                        {med.recurrence}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCompleteMedication(med.id, true)}
                      className="flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg bg-[#35C98A]/15 px-3 py-1.5 text-xs font-semibold text-[#35C98A] transition-colors hover:bg-[#35C98A]/25"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Done</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-[#20C5D8]" />
                <h2 className="text-lg font-bold">Recent Notifications</h2>
              </div>
              <span className="font-mono-tabular text-xs text-[var(--nf-text-muted)]">
                {unreadNotifs.length} unread
              </span>
            </div>

            {notifications.length === 0 ? (
              <p className="text-sm text-[var(--nf-text-muted)]">No notifications yet.</p>
            ) : (
              <div className="space-y-2.5">
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-xl border p-3.5 ${
                      n.read
                        ? 'border-[var(--nf-border)] bg-[var(--nf-surface-alt)]/50 opacity-80'
                        : 'border-[#20C5D8]/40 bg-[var(--nf-surface-alt)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{n.title}</p>
                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => onMarkNotificationRead(n.id)}
                          className="shrink-0 text-xs font-medium text-[#20C5D8] hover:underline"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[var(--nf-text-muted)]">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Scientific Responsibility Disclaimer */}
      <footer className="rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface)]/70 px-5 py-3.5 text-xs text-[var(--nf-text-muted)]">
        {strings.researchDisclaimer}
      </footer>
    </div>
  );
};
