import React, { useMemo, useState } from 'react';
import { Download, FileText, Printer, Volume2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BootstrapPayload } from '../types';
import { speakText } from '../services/voiceService';

interface HealthReportsPageProps {
  data: BootstrapPayload;
}

export const HealthReportsPage: React.FC<HealthReportsPageProps> = ({ data }) => {
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [category, setCategory] = useState<'all' | 'fatigue' | 'eeg' | 'medications' | 'vitals'>(
    'all',
  );

  const cutoffMs = useMemo(() => {
    const now = Date.now();
    if (range === '7d') return now - 7 * 86400 * 1000;
    if (range === '30d') return now - 30 * 86400 * 1000;
    return 0;
  }, [range]);

  const filteredFatigue = useMemo(
    () =>
      data.fatigueLogs.filter((f) => new Date(f.recordedAt).getTime() >= cutoffMs),
    [data.fatigueLogs, cutoffMs],
  );

  const filteredVitals = useMemo(
    () =>
      data.healthVitals.filter((v) => new Date(v.recordedAt).getTime() >= cutoffMs),
    [data.healthVitals, cutoffMs],
  );

  const filteredEeg = useMemo(
    () =>
      data.eegSessions.filter((s) => new Date(s.startedAt).getTime() >= cutoffMs),
    [data.eegSessions, cutoffMs],
  );

  const avgFatigue = useMemo(() => {
    if (filteredFatigue.length === 0) return '—';
    const avg = filteredFatigue.reduce((s, f) => s + f.level, 0) / filteredFatigue.length;
    return `${avg.toFixed(1)} / 10`;
  }, [filteredFatigue]);

  const avgHr = useMemo(() => {
    const hrs = filteredVitals.map((v) => v.heartRate).filter((n): n is number => n !== null);
    if (hrs.length === 0) return '—';
    return `${Math.round(hrs.reduce((s, n) => s + n, 0) / hrs.length)} bpm`;
  }, [filteredVitals]);

  const completedMedsCount = data.medications.filter((m) => m.completed).length;

  const combinedChartData = useMemo(() => {
    const byDate: Record<
      string,
      { date: string; fatigue?: number; heartRate?: number; systolic?: number }
    > = {};
    for (const f of [...filteredFatigue].reverse()) {
      const d = new Date(f.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      byDate[d] = { ...(byDate[d] ?? { date: d }), fatigue: f.level };
    }
    for (const v of [...filteredVitals].reverse()) {
      const d = new Date(v.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      byDate[d] = {
        ...(byDate[d] ?? { date: d }),
        heartRate: v.heartRate ?? undefined,
        systolic: v.systolic ?? undefined,
      };
    }
    return Object.values(byDate);
  }, [filteredFatigue, filteredVitals]);

  const eegChartData = useMemo(
    () =>
      [...filteredEeg].reverse().map((s) => ({
        date: new Date(s.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        quality: s.avgSignalQuality,
        durationMin: Number((s.durationSec / 60).toFixed(1)),
      })),
    [filteredEeg],
  );

  const handleReadSummary = () => {
    const summary = `Health report summary for ${data.profile.name}. Average reported fatigue is ${avgFatigue} across ${filteredFatigue.length} entries. Average logged heart rate is ${avgHr}. ${completedMedsCount} of ${data.medications.length} medication reminders are completed. ${filteredEeg.length} simulated EEG sessions are recorded.`;
    speakText(summary, true);
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      disclaimer:
        'NEUROFLOW Research Prototype Export. EEG and demo entries are simulated; manual vitals are user-entered.',
      profile: data.profile.name,
      range,
      fatigueLogs: filteredFatigue,
      healthVitals: filteredVitals,
      medications: data.medications,
      simulatedEegSessions: filteredEeg,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neuroflow-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#20C5D8]" />
            <h1 className="text-2xl font-bold tracking-tight">Health Reports & History</h1>
          </div>
          <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
            Daily & weekly summaries clearly distinguishing <strong className="text-[#FFB547]">[Simulated]</strong> device data from <strong className="text-[#35C98A]">[User Entered]</strong> logs.
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as '7d' | '30d' | 'all')}
            className="min-h-[40px] rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-xs font-medium"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Records</option>
          </select>

          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as 'all' | 'fatigue' | 'eeg' | 'medications' | 'vitals')
            }
            className="min-h-[40px] rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-xs font-medium"
          >
            <option value="all">All Sections</option>
            <option value="fatigue">Fatigue History</option>
            <option value="eeg">Simulated EEG Activity</option>
            <option value="medications">Medication History</option>
            <option value="vitals">Heart Rate & BP</option>
          </select>

          <button
            type="button"
            onClick={handleReadSummary}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#20C5D8]/50 bg-[#20C5D8]/10 px-3 py-2 text-xs font-semibold text-[#20C5D8]"
          >
            <Volume2 className="h-4 w-4" />
            <span>Read Aloud</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-[#7657F6] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#6646eb]"
          >
            <Printer className="h-4 w-4" />
            <span>Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3.5 py-2 text-xs font-semibold"
          >
            <Download className="h-4 w-4" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Daily & Weekly Summary KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-4">
          <p className="text-xs text-[var(--nf-text-muted)]">Weekly Fatigue Average</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#7657F6]">{avgFatigue}</p>
          <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
            {filteredFatigue.length} self-reported / demo logs
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-4">
          <p className="text-xs text-[var(--nf-text-muted)]">Simulated EEG Sessions</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#20C5D8]">
            {filteredEeg.length}
          </p>
          <p className="mt-1 text-xs text-[#FFB547]">Simulated Device Activity</p>
        </div>

        <div className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-4">
          <p className="text-xs text-[var(--nf-text-muted)]">Medication Completion</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#35C98A]">
            {completedMedsCount} / {data.medications.length}
          </p>
          <p className="mt-1 text-xs text-[var(--nf-text-muted)]">User-entered treatment schedule</p>
        </div>

        <div className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-4">
          <p className="text-xs text-[var(--nf-text-muted)]">Avg. External Heart Rate</p>
          <p className="mt-1 font-mono-tabular text-2xl font-bold text-[#F05263]">{avgHr}</p>
          <p className="mt-1 text-xs text-[var(--nf-text-muted)]">Manual / demo external cuff logs</p>
        </div>
      </div>

      {/* Charts Row */}
      {(category === 'all' || category === 'fatigue' || category === 'vitals') && (
        <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6">
          <h2 className="mb-1 text-base font-bold">
            Fatigue vs. External Vitals Comparison ({range.toUpperCase()})
          </h2>
          <p className="mb-4 text-xs text-[var(--nf-text-muted)]">
            Visualizing self-reported fatigue alongside manually entered / demo external heart rate & systolic BP.
          </p>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis yAxisId="left" domain={[0, 10]} stroke="#7657F6" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="#F05263" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111B3A',
                    borderColor: 'rgba(148,163,184,0.3)',
                    borderRadius: '12px',
                    color: '#f1f5f9',
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="fatigue"
                  name="Fatigue (1-10)"
                  stroke="#7657F6"
                  strokeWidth={2.5}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="heartRate"
                  name="Heart Rate (bpm, External)"
                  stroke="#F05263"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="systolic"
                  name="Systolic BP (mmHg, External)"
                  stroke="#20C5D8"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {(category === 'all' || category === 'eeg') && (
        <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6">
          <h2 className="mb-1 text-base font-bold">Simulated EEG Session Quality & Duration</h2>
          <p className="mb-4 text-xs text-[#FFB547]">
            SIMULATED DEVICE ACTIVITY — NOT REAL CLINICAL EEG MEASUREMENTS
          </p>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eegChartData}>
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
                <Bar dataKey="quality" name="Sim. Quality (%)" fill="#20C5D8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="durationMin" name="Duration (min)" fill="#7657F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Structured Provenance History Table */}
      <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6">
        <h2 className="mb-4 text-base font-bold">Detailed History Ledger</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--nf-border)] text-[var(--nf-text-muted)]">
                <th className="py-2.5 pr-4">Date</th>
                <th className="py-2.5 pr-4">Category</th>
                <th className="py-2.5 pr-4">Data Source</th>
                <th className="py-2.5 pr-4">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--nf-border)]">
              {(category === 'all' || category === 'fatigue') &&
                filteredFatigue.map((f) => (
                  <tr key={`f-${f.id}`}>
                    <td className="py-2.5 pr-4 font-mono-tabular">
                      {new Date(f.recordedAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold">Fatigue Log</td>
                    <td className="py-2.5 pr-4">
                      <span className={f.isSimulated ? 'text-[#FFB547]' : 'text-[#35C98A]'}>
                        {f.isSimulated ? 'Demo Sample' : 'User Entered'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      Level {f.level}/10 · {f.activity} — {f.notes}
                    </td>
                  </tr>
                ))}

              {(category === 'all' || category === 'vitals') &&
                filteredVitals.map((v) => (
                  <tr key={`v-${v.id}`}>
                    <td className="py-2.5 pr-4 font-mono-tabular">
                      {new Date(v.recordedAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold">Vitals & Activity</td>
                    <td className="py-2.5 pr-4">
                      <span className={v.sourceType === 'simulated' ? 'text-[#FFB547]' : 'text-[#35C98A]'}>
                        {v.sourceType === 'simulated' ? 'Demo Sample' : 'User Entered'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      {v.heartRate ? `HR ${v.heartRate} bpm ` : ''}
                      {v.systolic && v.diastolic ? `· BP ${v.systolic}/${v.diastolic} ` : ''}
                      {v.steps ? `· ${v.steps} steps ` : ''}— {v.notes}
                    </td>
                  </tr>
                ))}

              {(category === 'all' || category === 'medications') &&
                data.medications.map((m) => (
                  <tr key={`m-${m.id}`}>
                    <td className="py-2.5 pr-4 font-mono-tabular">
                      {m.scheduleDate} {m.reminderTime}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold">Medication</td>
                    <td className="py-2.5 pr-4">
                      <span className={m.isSimulated ? 'text-[#FFB547]' : 'text-[#35C98A]'}>
                        {m.isSimulated ? 'Demo Sample' : 'User Entered'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      {m.name} ({m.medType}) · {m.completed ? 'Completed' : 'Scheduled'}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
