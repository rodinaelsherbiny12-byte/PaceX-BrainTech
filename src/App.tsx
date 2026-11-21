import React, { useEffect, useState } from 'react';
import {
  Activity,
  Brain,
  Cpu,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Mic,
  Pill,
  RefreshCw,
  Settings,
  ShieldAlert,
  X,
} from 'lucide-react';
import type { BootstrapPayload, PageId } from './types';
import { api } from './services/api';
import { TRANSLATIONS } from './i18n/translations';
import { parseVoiceCommand, speakText } from './services/voiceService';
import { HomeDashboard } from './pages/HomeDashboard';
import { DeviceControllerPage } from './pages/DeviceControllerPage';
import { EegMonitoringPage } from './pages/EegMonitoringPage';
import { HealthMonitoringPage } from './pages/HealthMonitoringPage';
import { FatigueTrackerPage } from './pages/FatigueTrackerPage';
import { MedicationsPage } from './pages/MedicationsPage';
import { EmergencySosPage } from './pages/EmergencySosPage';
import { VoiceAssistantPage } from './pages/VoiceAssistantPage';
import { HealthReportsPage } from './pages/HealthReportsPage';
import { ProfileSettingsPage } from './pages/ProfileSettingsPage';

export default function App() {
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePage, setActivePage] = useState<PageId>('home');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setError('');
      const payload = await api.bootstrap();
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to NEUROFLOW backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Apply root accessibility & theme attributes whenever profile changes
  useEffect(() => {
    if (!data) return;
    const { theme, textSize, reduceMotion, language } = data.profile;
    const root = document.documentElement;

    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    if (reduceMotion) root.classList.add('reduce-motion');
    else root.classList.remove('reduce-motion');

    const scale = textSize === 'xlarge' ? '1.22' : textSize === 'large' ? '1.11' : '1';
    root.style.setProperty('--nf-font-scale', scale);
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
    root.lang = language;
  }, [data?.profile]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B1228] p-6 text-slate-100">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#20C5D8]/30 border-t-[#20C5D8]" />
        <p className="mt-4 text-sm font-medium text-slate-300">
          Initializing NEUROFLOW Neurotechnology Workspace...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B1228] p-6 text-center text-slate-100">
        <p className="text-lg font-bold text-[#F05263]">Backend Connection Issue</p>
        <p className="mt-2 max-w-md text-sm text-slate-300">{error || 'Unable to load workspace.'}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void loadData();
          }}
          className="mt-5 min-h-[44px] rounded-xl bg-[#7657F6] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const strings = TRANSLATIONS[data.profile.language] ?? TRANSLATIONS.en;

  const navItems: Array<{ id: PageId; label: string; icon: React.ReactNode; accent?: string }> = [
    { id: 'home', label: strings.nav.home, icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'device', label: strings.nav.device, icon: <Cpu className="h-4 w-4" />, accent: '#20C5D8' },
    { id: 'eeg', label: strings.nav.eeg, icon: <Brain className="h-4 w-4" />, accent: '#20C5D8' },
    { id: 'health', label: strings.nav.health, icon: <HeartPulse className="h-4 w-4" />, accent: '#35C98A' },
    { id: 'fatigue', label: strings.nav.fatigue, icon: <Activity className="h-4 w-4" />, accent: '#7657F6' },
    { id: 'medications', label: strings.nav.medications, icon: <Pill className="h-4 w-4" />, accent: '#FFB547' },
    { id: 'sos', label: strings.nav.sos, icon: <ShieldAlert className="h-4 w-4" />, accent: '#F05263' },
    { id: 'voice', label: strings.nav.voice, icon: <Mic className="h-4 w-4" />, accent: '#7657F6' },
    { id: 'reports', label: strings.nav.reports, icon: <FileText className="h-4 w-4" /> },
    { id: 'settings', label: strings.nav.settings, icon: <Settings className="h-4 w-4" /> },
  ];

  const handleNavigate = (page: PageId) => {
    setActivePage(page);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: data.profile.reduceMotion ? 'auto' : 'smooth' });
  };

  const handleUpdateProfile = async (patch: Partial<typeof data.profile>) => {
    const updated = await api.updateProfile(patch);
    setData((prev) => (prev ? { ...prev, profile: updated } : prev));
  };

  const handleUpdateDevice = async (patch: Partial<typeof data.device>) => {
    const updated = await api.updateDevice(patch);
    setData((prev) => (prev ? { ...prev, device: updated } : prev));
  };

  const handleResetDemo = async () => {
    const fresh = await api.resetDemo();
    setData(fresh);
  };

  const handleVoiceCommand = async (rawText: string): Promise<string> => {
    const parsed = parseVoiceCommand(rawText);
    switch (parsed.action) {
      case 'open_device':
        handleNavigate('device');
        return parsed.responseText;
      case 'connect_device':
        await handleUpdateDevice({ connected: true });
        handleNavigate('device');
        return parsed.responseText;
      case 'start_monitoring':
        await handleUpdateDevice({ connected: true, monitoring: true });
        handleNavigate('eeg');
        return parsed.responseText;
      case 'stop_monitoring':
        await handleUpdateDevice({ monitoring: false });
        return parsed.responseText;
      case 'show_eeg':
        handleNavigate('eeg');
        return parsed.responseText;
      case 'open_fatigue':
        handleNavigate('fatigue');
        return parsed.responseText;
      case 'add_medication':
        handleNavigate('medications');
        return parsed.responseText;
      case 'read_report': {
        handleNavigate('reports');
        const pendingMeds = data.medications.filter((m) => !m.completed).length;
        const avgF =
          data.fatigueLogs.length > 0
            ? (
                data.fatigueLogs.reduce((s, f) => s + f.level, 0) / data.fatigueLogs.length
              ).toFixed(1)
            : 'N/A';
        const spokenSummary = `Health report opened. Average logged fatigue is ${avgF} out of 10. You have ${pendingMeds} pending medication reminders and ${data.eegSessions.length} simulated EEG sessions.`;
        if (data.profile.voiceFeedback) speakText(spokenSummary, true);
        return spokenSummary;
      }
      case 'show_heart_rate':
        handleNavigate('health');
        return parsed.responseText;
      case 'open_contacts':
        handleNavigate('sos');
        return parsed.responseText;
      case 'call_emergency':
        handleNavigate('sos');
        setSosModalOpen(true);
        return parsed.responseText;
      default:
        return parsed.responseText;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--nf-bg)] text-[var(--nf-text)]">
      {/* Top Accessibility & Research Bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--nf-border)] bg-[var(--nf-surface)]/95 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4">
          {/* Left: Brand + Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label="Toggle navigation menu"
              className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-[var(--nf-border)] lg:hidden"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('home')}
              className="flex items-center gap-2.5 text-left"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#20C5D8] to-[#7657F6] text-white shadow-md">
                <Brain className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
                NEUROFLOW
              </span>
            </button>
          </div>

          {/* Center: Demo Mode Indicator (visible on md+) */}
          {data.profile.demoMode && (
            <div className="hidden items-center gap-2 text-xs font-semibold text-[#FFB547] md:flex">
              <span>{strings.demoBanner}</span>
            </div>
          )}

          {/* Right: Patient Mode + Quick Voice + Quick SOS */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => handleUpdateProfile({ patientMode: !data.profile.patientMode })}
              className={`hidden min-h-[40px] items-center rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors sm:flex ${
                data.profile.patientMode
                  ? 'border-[#35C98A] bg-[#35C98A]/15 text-[#35C98A]'
                  : 'border-[var(--nf-border)] bg-[var(--nf-surface-alt)] text-[var(--nf-text-muted)]'
              }`}
            >
              {strings.patientModeLabel}: {data.profile.patientMode ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={() => handleNavigate('voice')}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#7657F6]/60 bg-[#7657F6]/15 px-3 py-1.5 text-xs font-semibold text-[#7657F6] hover:bg-[#7657F6]/25 dark:text-slate-100"
            >
              <Mic className="h-4 w-4" />
              <span className="hidden sm:inline">{strings.voiceShortcut}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleNavigate('sos');
                setSosModalOpen(true);
              }}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#F05263] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#dc3f51]"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>{strings.sosShortcut}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1480px] gap-6 px-4 py-6 sm:px-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav aria-label="Primary Navigation" className="sticky top-24 space-y-1.5">
            {navItems.map((item) => {
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavigate(item.id)}
                  className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[#7657F6] text-white shadow-md'
                      : 'text-[var(--nf-text-muted)] hover:bg-[var(--nf-surface)] hover:text-[var(--nf-text)]'
                  }`}
                >
                  <span style={!active && item.accent ? { color: item.accent } : undefined}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}

            {data.profile.demoMode && (
              <div className="mt-6 rounded-2xl border border-[#FFB547]/40 bg-[var(--nf-surface)] p-4 text-xs">
                <p className="font-bold text-[#FFB547]">Demo Mode Active</p>
                <p className="mt-1 text-[var(--nf-text-muted)]">
                  Hardware & EEG signals are simulated for presentation.
                </p>
                <button
                  type="button"
                  onClick={() => void handleResetDemo()}
                  className="mt-3 flex min-h-[36px] w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-2.5 py-1.5 font-semibold hover:border-[#20C5D8]"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Reset Demo Data</span>
                </button>
              </div>
            )}
          </nav>
        </aside>

        {/* Mobile Drawer Navigation */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileNavOpen(false)}>
            <nav
              aria-label="Mobile Navigation"
              onClick={(e) => e.stopPropagation()}
              className="h-full w-72 overflow-y-auto border-r border-[var(--nf-border)] bg-[var(--nf-surface)] p-4"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-lg font-bold">NEUROFLOW</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg p-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-1.5">
                {navItems.map((item) => {
                  const active = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigate(item.id)}
                      className={`flex min-h-[46px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium ${
                        active ? 'bg-[#7657F6] text-white' : 'text-[var(--nf-text-muted)]'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>
        )}

        {/* Active Page Viewport */}
        <main className="min-w-0 flex-1">
          {activePage === 'home' && (
            <HomeDashboard
              data={data}
              strings={strings}
              onNavigate={handleNavigate}
              onCompleteMedication={async (id, completed) => {
                const updated = await api.updateMedication(id, { completed });
                setData((prev) =>
                  prev
                    ? {
                        ...prev,
                        medications: prev.medications.map((m) => (m.id === id ? updated : m)),
                      }
                    : prev,
                );
              }}
              onToggleMonitoring={() =>
                void handleUpdateDevice({
                  connected: true,
                  monitoring: !data.device.monitoring,
                })
              }
              onMarkNotificationRead={async (id) => {
                await api.markNotificationRead(id);
                setData((prev) =>
                  prev
                    ? {
                        ...prev,
                        notifications: prev.notifications.map((n) =>
                          n.id === id ? { ...n, read: true } : n,
                        ),
                      }
                    : prev,
                );
              }}
            />
          )}

          {activePage === 'device' && (
            <DeviceControllerPage
              device={data.device}
              reduceMotion={data.profile.reduceMotion}
              onUpdateDevice={handleUpdateDevice}
            />
          )}

          {activePage === 'eeg' && (
            <EegMonitoringPage
              device={data.device}
              sessions={data.eegSessions}
              reduceMotion={data.profile.reduceMotion}
              onUpdateDevice={handleUpdateDevice}
              onSaveSession={async (payload) => {
                const created = await api.addEegSession(payload);
                setData((prev) =>
                  prev ? { ...prev, eegSessions: [created, ...prev.eegSessions] } : prev,
                );
              }}
            />
          )}

          {activePage === 'health' && (
            <HealthMonitoringPage
              data={data}
              onNavigate={handleNavigate}
              onAddVital={async (payload) => {
                const created = await api.addVital(payload);
                setData((prev) =>
                  prev ? { ...prev, healthVitals: [created, ...prev.healthVitals] } : prev,
                );
              }}
              onDeleteVital={async (id) => {
                await api.deleteVital(id);
                setData((prev) =>
                  prev
                    ? { ...prev, healthVitals: prev.healthVitals.filter((v) => v.id !== id) }
                    : prev,
                );
              }}
            />
          )}

          {activePage === 'fatigue' && (
            <FatigueTrackerPage
              logs={data.fatigueLogs}
              onAddFatigue={async (payload) => {
                const created = await api.addFatigue(payload);
                setData((prev) =>
                  prev ? { ...prev, fatigueLogs: [created, ...prev.fatigueLogs] } : prev,
                );
              }}
              onDeleteFatigue={async (id) => {
                await api.deleteFatigue(id);
                setData((prev) =>
                  prev
                    ? { ...prev, fatigueLogs: prev.fatigueLogs.filter((l) => l.id !== id) }
                    : prev,
                );
              }}
            />
          )}

          {activePage === 'medications' && (
            <MedicationsPage
              medications={data.medications}
              onAddMedication={async (payload) => {
                const created = await api.addMedication(payload);
                setData((prev) =>
                  prev ? { ...prev, medications: [created, ...prev.medications] } : prev,
                );
              }}
              onUpdateMedication={async (id, patch) => {
                const updated = await api.updateMedication(id, patch);
                setData((prev) =>
                  prev
                    ? {
                        ...prev,
                        medications: prev.medications.map((m) => (m.id === id ? updated : m)),
                      }
                    : prev,
                );
              }}
              onDeleteMedication={async (id) => {
                await api.deleteMedication(id);
                setData((prev) =>
                  prev
                    ? { ...prev, medications: prev.medications.filter((m) => m.id !== id) }
                    : prev,
                );
              }}
            />
          )}

          {activePage === 'sos' && (
            <EmergencySosPage
              profile={data.profile}
              contacts={data.emergencyContacts}
              sosModalOpen={sosModalOpen}
              setSosModalOpen={setSosModalOpen}
              onAddContact={async (payload) => {
                await api.addContact(payload);
                const fresh = await api.bootstrap();
                setData(fresh);
              }}
              onUpdateContact={async (id, patch) => {
                await api.updateContact(id, patch);
                const fresh = await api.bootstrap();
                setData(fresh);
              }}
              onDeleteContact={async (id) => {
                await api.deleteContact(id);
                setData((prev) =>
                  prev
                    ? {
                        ...prev,
                        emergencyContacts: prev.emergencyContacts.filter((c) => c.id !== id),
                      }
                    : prev,
                );
              }}
              onLogSimulatedSos={async (contact) => {
                const notif = await api.addNotification({
                  title: 'Simulated SOS Alert Logged',
                  message: contact
                    ? `Prototype SOS confirmed for ${contact.name} (${contact.phone}). No real external call was made.`
                    : 'Prototype SOS confirmed locally. No real external call was made.',
                  category: 'sos',
                });
                setData((prev) =>
                  prev ? { ...prev, notifications: [notif, ...prev.notifications] } : prev,
                );
              }}
            />
          )}

          {activePage === 'voice' && (
            <VoiceAssistantPage
              voiceFeedbackEnabled={data.profile.voiceFeedback}
              reduceMotion={data.profile.reduceMotion}
              onExecuteCommand={handleVoiceCommand}
              onToggleVoiceFeedback={(enabled) => void handleUpdateProfile({ voiceFeedback: enabled })}
            />
          )}

          {activePage === 'reports' && <HealthReportsPage data={data} />}

          {activePage === 'settings' && (
            <ProfileSettingsPage
              profile={data.profile}
              onUpdateProfile={handleUpdateProfile}
              onResetDemo={handleResetDemo}
              onNavigate={handleNavigate}
            />
          )}
        </main>
      </div>
    </div>
  );
}
