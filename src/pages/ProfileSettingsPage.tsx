import React, { useState } from 'react';
import {
  Accessibility,
  Bell,
  Globe,
  RefreshCw,
  Save,
  ShieldCheck,
  User,
} from 'lucide-react';
import type {
  LanguageCode,
  PageId,
  TextSizeOption,
  ThemeOption,
  UserProfile,
} from '../types';

interface ProfileSettingsPageProps {
  profile: UserProfile;
  onUpdateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  onResetDemo: () => Promise<void>;
  onNavigate: (page: PageId) => void;
}

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({
  profile,
  onUpdateProfile,
  onResetDemo,
  onNavigate,
}) => {
  const [name, setName] = useState(profile.name);
  const [conditionNote, setConditionNote] = useState(profile.conditionNote);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [savedToast, setSavedToast] = useState('');

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdateProfile({ name: name.trim() || profile.name, conditionNote: conditionNote.trim() });
      setSavedToast('Profile changes saved to SQLite database.');
      setTimeout(() => setSavedToast(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemoData = async () => {
    setResetting(true);
    try {
      await onResetDemo();
      setSavedToast('Demo dataset restored to initial presentation state.');
      setTimeout(() => setSavedToast(''), 3500);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile, Accessibility & Settings</h1>
          <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
            Customize text scaling, motion preferences, Patient Mode, language, and privacy controls.
          </p>
        </div>
        {savedToast && (
          <span className="rounded-xl bg-[#35C98A]/15 px-3.5 py-2 text-xs font-semibold text-[#35C98A]">
            {savedToast}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* User Profile Form */}
        <form
          onSubmit={handleSaveIdentity}
          className="space-y-4 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6 xl:col-span-6"
        >
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#7657F6]" />
            <h2 className="text-lg font-bold">User Profile</h2>
          </div>

          <div className="flex items-center gap-4">
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-2xl border border-[#7657F6]/40 object-cover"
            />
            <p className="text-xs text-[var(--nf-text-muted)]">
              Local research profile stored securely on the application server without external sharing.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--nf-text-muted)]">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--nf-text-muted)]">
              Personal Support / Research Note
            </label>
            <textarea
              rows={2}
              value={conditionNote}
              onChange={(e) => setConditionNote(e.target.value)}
              className="w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] p-3 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#7657F6] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6646eb]"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </form>

        {/* Smart Accessibility & Theme Preferences */}
        <section className="space-y-5 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6 xl:col-span-6">
          <div className="flex items-center gap-2">
            <Accessibility className="h-5 w-5 text-[#20C5D8]" />
            <h2 className="text-lg font-bold">Smart Accessibility & Display</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--nf-text-muted)]">
                <Globe className="h-3.5 w-3.5" />
                <span>Interface Language</span>
              </label>
              <select
                value={profile.language}
                onChange={(e) => onUpdateProfile({ language: e.target.value as LanguageCode })}
                className="min-h-[44px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="ar">العربية (RTL)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--nf-text-muted)]">
                Theme Preference
              </label>
              <select
                value={profile.theme}
                onChange={(e) => onUpdateProfile({ theme: e.target.value as ThemeOption })}
                className="min-h-[44px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
              >
                <option value="dark">Deep Navy Dark (Default)</option>
                <option value="light">Clinical Light Mode</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--nf-text-muted)]">
              Adjustable Text Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['standard', 'Standard'],
                  ['large', 'Large (+12%)'],
                  ['xlarge', 'Extra Large (+25%)'],
                ] as [TextSizeOption, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onUpdateProfile({ textSize: val })}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-semibold transition-colors ${
                    profile.textSize === val
                      ? 'border-[#20C5D8] bg-[#20C5D8] text-slate-950'
                      : 'border-[var(--nf-border)] bg-[var(--nf-surface-alt)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-[var(--nf-border)] pt-4">
            <label className="flex min-h-[42px] cursor-pointer items-center justify-between rounded-xl bg-[var(--nf-surface-alt)] px-4 py-2.5 text-sm">
              <span>Patient Mode (Large Buttons & Simplified Layout)</span>
              <input
                type="checkbox"
                checked={profile.patientMode}
                onChange={(e) => onUpdateProfile({ patientMode: e.target.checked })}
                className="h-5 w-5 accent-[#7657F6]"
              />
            </label>

            <label className="flex min-h-[42px] cursor-pointer items-center justify-between rounded-xl bg-[var(--nf-surface-alt)] px-4 py-2.5 text-sm">
              <span>Reduce Motion & Animations</span>
              <input
                type="checkbox"
                checked={profile.reduceMotion}
                onChange={(e) => onUpdateProfile({ reduceMotion: e.target.checked })}
                className="h-5 w-5 accent-[#20C5D8]"
              />
            </label>

            <label className="flex min-h-[42px] cursor-pointer items-center justify-between rounded-xl bg-[var(--nf-surface-alt)] px-4 py-2.5 text-sm">
              <span>Voice Feedback (Text-to-Speech)</span>
              <input
                type="checkbox"
                checked={profile.voiceFeedback}
                onChange={(e) => onUpdateProfile({ voiceFeedback: e.target.checked })}
                className="h-5 w-5 accent-[#35C98A]"
              />
            </label>

            <label className="flex min-h-[42px] cursor-pointer items-center justify-between rounded-xl bg-[var(--nf-surface-alt)] px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#FFB547]" />
                <span>Medication & System Notifications</span>
              </span>
              <input
                type="checkbox"
                checked={profile.notificationsEnabled}
                onChange={(e) => onUpdateProfile({ notificationsEnabled: e.target.checked })}
                className="h-5 w-5 accent-[#FFB547]"
              />
            </label>
          </div>
        </section>
      </div>

      {/* Demo Mode & Privacy Controls */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#FFB547]/40 bg-[var(--nf-surface)] p-6">
          <h2 className="text-lg font-bold">Research Presentation Demo Mode</h2>
          <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
            Demo Mode provides curated sample EEG sessions, fatigue logs, medication reminders, and contacts for hardware-free demonstrations.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onUpdateProfile({ demoMode: !profile.demoMode })}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-semibold ${
                profile.demoMode
                  ? 'bg-[#FFB547] text-slate-950'
                  : 'border border-[var(--nf-border)] bg-[var(--nf-surface-alt)]'
              }`}
            >
              Demo Banner: {profile.demoMode ? 'Visible' : 'Minimized'}
            </button>

            <button
              type="button"
              disabled={resetting}
              onClick={handleResetDemoData}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[#20C5D8]/60 bg-[#20C5D8]/10 px-4 py-2 text-xs font-semibold text-[#20C5D8] hover:bg-[#20C5D8]/20"
            >
              <RefreshCw className="h-4 w-4" />
              <span>{resetting ? 'Resetting...' : 'Reset Demo Data'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('sos')}
              className="min-h-[44px] rounded-xl border border-[var(--nf-border)] px-4 py-2 text-xs font-semibold hover:border-[#F05263]"
            >
              Manage Emergency Contacts
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#35C98A]" />
            <h2 className="text-lg font-bold">Privacy & Scientific Responsibility</h2>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-[var(--nf-text-muted)]">
            <li>• All EEG waveforms, electrode impedance values, and battery metrics are simulated.</li>
            <li>• Heart rate and blood pressure values are manually entered or demonstration samples, never read from the EEG headset.</li>
            <li>• NEUROFLOW does not diagnose conditions, predict relapses, or recommend medication changes.</li>
            <li>• Records are persisted in your local application SQLite database with zero third-party ad tracking.</li>
          </ul>
        </section>
      </div>
    </div>
  );
};
