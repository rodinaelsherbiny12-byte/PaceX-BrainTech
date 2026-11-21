import React, { useMemo, useState } from 'react';
import {
  Activity,
  Brain,
  Footprints,
  HeartPulse,
  Plus,
  StickyNote,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BootstrapPayload, PageId } from '../types';

interface HealthMonitoringPageProps {
  data: BootstrapPayload;
  onAddVital: (payload: {
    heartRate?: number | string;
    systolic?: number | string;
    diastolic?: number | string;
    steps?: number | string;
    activityMinutes?: number | string;
    notes: string;
  }) => Promise<void>;
  onDeleteVital: (id: number) => Promise<void>;
  onNavigate: (page: PageId) => void;
}

export const HealthMonitoringPage: React.FC<HealthMonitoringPageProps> = ({
  data,
  onAddVital,
  onDeleteVital,
  onNavigate,
}) => {
  const [heartRate, setHeartRate] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [steps, setSteps] = useState('');
  const [activityMinutes, setActivityMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { device, healthVitals, fatigueLogs, eegSessions } = data;
  const latestVital = healthVitals[0];
  const latestFatigue = fatigueLogs[0];

  const chartData = useMemo(() => {
    return [...healthVitals]
      .reverse()
      .map((v) => ({
        date: new Date(v.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        heartRate: v.heartRate,
        systolic: v.systolic,
        diastolic: v.diastolic,
        steps: v.steps,
        source: v.sourceType,
      }));
  }, [healthVitals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!heartRate && !systolic && !steps && !notes.trim()) {
      setError('Please enter at least one manual measurement or health note.');
      return;
    }
    setSubmitting(true);
    try {
      await onAddVital({
        heartRate,
        systolic,
        diastolic,
        steps,
        activityMinutes,
        notes: notes.trim() || 'Manual entry',
      });
      setHeartRate('');
      setSystolic('');
      setDiastolic('');
      setSteps('');
      setActivityMinutes('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save health entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with explicit data provenance notice */}
      <div className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Health Monitoring</h1>
            <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
              Clear separation of <span className="font-semibold text-[#20C5D8]">Simulated EEG Device Data</span> vs.{' '}
              <span className="font-semibold text-[#35C98A]">Manually Entered / Demo External Vitals</span>. The NEUROFLOW EEG headband does not measure heart rate or blood pressure.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="min-h-[42px] shrink-0 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-4 py-2 text-xs font-semibold hover:border-[#7657F6]"
          >
            View Full Reports
          </button>
        </div>
      </div>

      {/* 6 Required Health Sections Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* 1. EEG Activity (Simulated) */}
        <section className="rounded-2xl border border-[#20C5D8]/40 bg-[var(--nf-surface)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <Brain className="h-5 w-5 text-[#20C5D8]" />
              <span>1. EEG Activity</span>
            </h2>
            <span className="text-xs font-semibold text-[#FFB547]">SIMULATED</span>
          </div>
          <p className="mt-3 font-mono-tabular text-2xl font-bold">
            {device.connected ? (device.monitoring ? 'Active Stream' : 'Standby') : 'Offline'}
          </p>
          <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
            {eegSessions.length} saved simulated sessions · Profile: {device.simulationProfile}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('eeg')}
            className="mt-4 min-h-[38px] rounded-xl bg-[#20C5D8]/15 px-3 py-1.5 text-xs font-semibold text-[#20C5D8] hover:bg-[#20C5D8]/25"
          >
            Inspect Simulated EEG
          </button>
        </section>

        {/* 2. Heart Rate (Manual / Demo External) */}
        <section className="rounded-2xl border border-[#F05263]/40 bg-[var(--nf-surface)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <HeartPulse className="h-5 w-5 text-[#F05263]" />
              <span>2. Heart Rate</span>
            </h2>
            <span className="text-xs font-semibold text-[#35C98A]">
              {latestVital?.sourceType === 'manual' ? 'MANUAL ENTRY' : 'DEMO SAMPLE'}
            </span>
          </div>
          <p className="mt-3 font-mono-tabular text-2xl font-bold">
            {latestVital?.heartRate ? `${latestVital.heartRate} bpm` : 'No reading'}
          </p>
          <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
            Measured via external watch/oximeter (never by EEG headband).
          </p>
        </section>

        {/* 3. Blood Pressure (Manual / Demo External) */}
        <section className="rounded-2xl border border-[#7657F6]/40 bg-[var(--nf-surface)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <Stethoscope className="h-5 w-5 text-[#7657F6]" />
              <span>3. Blood Pressure</span>
            </h2>
            <span className="text-xs font-semibold text-[#35C98A]">
              {latestVital?.sourceType === 'manual' ? 'MANUAL ENTRY' : 'DEMO SAMPLE'}
            </span>
          </div>
          <p className="mt-3 font-mono-tabular text-2xl font-bold">
            {latestVital?.systolic && latestVital?.diastolic
              ? `${latestVital.systolic} / ${latestVital.diastolic} mmHg`
              : 'No reading'}
          </p>
          <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
            External blood pressure cuff log entered by user or demo seed.
          </p>
        </section>

        {/* 4. Fatigue Tracking */}
        <section className="rounded-2xl border border-[#FFB547]/40 bg-[var(--nf-surface)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <Activity className="h-5 w-5 text-[#FFB547]" />
              <span>4. Fatigue Tracking</span>
            </h2>
            <span className="text-xs font-semibold text-[var(--nf-text-muted)]">SELF-REPORTED</span>
          </div>
          <p className="mt-3 font-mono-tabular text-2xl font-bold">
            {latestFatigue ? `${latestFatigue.level} / 10` : 'No log'}
          </p>
          <p className="mt-1 truncate text-xs text-[var(--nf-text-muted)]">
            {latestFatigue ? `Activity: ${latestFatigue.activity}` : 'Log daily fatigue patterns'}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('fatigue')}
            className="mt-4 min-h-[38px] rounded-xl bg-[#FFB547]/15 px-3 py-1.5 text-xs font-semibold text-[#FFB547] hover:bg-[#FFB547]/25"
          >
            Open Fatigue Tracker
          </button>
        </section>

        {/* 5. Daily Activity */}
        <section className="rounded-2xl border border-[#35C98A]/40 bg-[var(--nf-surface)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <Footprints className="h-5 w-5 text-[#35C98A]" />
              <span>5. Daily Activity</span>
            </h2>
            <span className="text-xs font-semibold text-[#35C98A]">
              {latestVital?.sourceType === 'manual' ? 'MANUAL' : 'DEMO'}
            </span>
          </div>
          <p className="mt-3 font-mono-tabular text-2xl font-bold">
            {latestVital?.steps !== null && latestVital?.steps !== undefined
              ? `${latestVital.steps.toLocaleString()} steps`
              : '—'}
          </p>
          <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
            Active time:{' '}
            <span className="font-mono-tabular">
              {latestVital?.activityMinutes ? `${latestFatigue ? latestVital.activityMinutes : latestVital.activityMinutes} min` : '—'}
            </span>
          </p>
        </section>

        {/* 6. Personal Health Notes */}
        <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold">
              <StickyNote className="h-5 w-5 text-[#20C5D8]" />
              <span>6. Personal Health Notes</span>
            </h2>
            <span className="text-xs text-[var(--nf-text-muted)]">USER JOURNAL</span>
          </div>
          <p className="mt-3 line-clamp-2 text-sm">
            {latestVital?.notes || 'Add observations about sleep, temperature sensitivity, or pacing.'}
          </p>
          <p className="mt-2 font-mono-tabular text-xs text-[var(--nf-text-muted)]">
            {latestVital ? new Date(latestVital.recordedAt).toLocaleString() : ''}
          </p>
        </section>
      </div>

      {/* Charts + Manual Entry Form */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5">
            <h2 className="mb-1 text-base font-bold">
              Heart Rate & Blood Pressure Trend (Manual / Demo Data)
            </h2>
            <p className="mb-4 text-xs text-[var(--nf-text-muted)]">
              Externally measured values — not acquired from the EEG head device.
            </p>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111B3A',
                      borderColor: 'rgba(148,163,184,0.3)',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="heartRate" name="Heart Rate (bpm)" stroke="#F05263" strokeWidth={2.2} />
                  <Line type="monotone" dataKey="systolic" name="Systolic (mmHg)" stroke="#7657F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="diastolic" name="Diastolic (mmHg)" stroke="#20C5D8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5">
            <h2 className="mb-4 text-base font-bold">Daily Activity Steps (Manual / Demo Data)</h2>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111B3A',
                      borderColor: 'rgba(148,163,184,0.3)',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="steps"
                    name="Steps"
                    stroke="#35C98A"
                    fill="#35C98A"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Manual Entry Form + History List */}
        <div className="space-y-6 xl:col-span-5">
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5"
          >
            <div>
              <h2 className="text-base font-bold">Log Manual Health Entry</h2>
              <p className="text-xs text-[var(--nf-text-muted)]">
                Saved to SQLite database tagged explicitly as MANUAL ENTRY.
              </p>
            </div>

            {error && (
              <p className="rounded-xl border border-[#F05263]/50 bg-[#F05263]/10 p-3 text-xs text-[#F05263]">
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">Heart Rate (bpm)</label>
                <input
                  type="number"
                  min={30}
                  max={230}
                  value={heartRate}
                  onChange={(e) => setHeartRate(e.target.value)}
                  placeholder="72"
                  className="min-h-[42px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">Systolic (mmHg)</label>
                <input
                  type="number"
                  min={60}
                  max={260}
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  placeholder="118"
                  className="min-h-[42px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">Diastolic (mmHg)</label>
                <input
                  type="number"
                  min={35}
                  max={160}
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  placeholder="76"
                  className="min-h-[42px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">Daily Steps</label>
                <input
                  type="number"
                  min={0}
                  max={100000}
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                  placeholder="4500"
                  className="min-h-[42px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">Active Minutes</label>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  value={activityMinutes}
                  onChange={(e) => setActivityMinutes(e.target.value)}
                  placeholder="30"
                  className="min-h-[42px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">Personal Health Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sleep quality, hydration, ambient temperature, or pacing notes..."
                className="w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] p-3 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#7657F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6646eb] disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>{submitting ? 'Saving...' : 'Save Manual Entry'}</span>
            </button>
          </form>

          {/* Recent Logs Table */}
          <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5">
            <h3 className="mb-3 text-sm font-bold">Recent Health Records</h3>
            <div className="max-h-[290px] space-y-2.5 overflow-y-auto pr-1">
              {healthVitals.map((v) => (
                <div
                  key={v.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] p-3"
                >
                  <div className="min-w-0 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-semibold ${
                          v.sourceType === 'manual' ? 'text-[#35C98A]' : 'text-[#FFB547]'
                        }`}
                      >
                        {v.sourceType === 'manual' ? 'MANUAL' : 'DEMO'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular text-[var(--nf-text-muted)]">
                        {new Date(v.recordedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 font-mono-tabular font-semibold">
                      {v.heartRate ? `HR ${v.heartRate} bpm` : ''}
                      {v.systolic && v.diastolic ? ` · BP ${v.systolic}/${v.diastolic}` : ''}
                      {v.steps ? ` · ${v.steps} steps` : ''}
                    </p>
                    <p className="mt-0.5 text-[var(--nf-text-muted)]">{v.notes}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteVital(v.id)}
                    aria-label="Delete health record"
                    className="rounded-lg p-1.5 text-[var(--nf-text-muted)] hover:bg-[#F05263]/15 hover:text-[#F05263]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
