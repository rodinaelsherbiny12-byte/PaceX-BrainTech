import React, { useMemo, useState } from 'react';
import { Activity, Calendar, Plus, Trash2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FatigueLog } from '../types';

interface FatigueTrackerPageProps {
  logs: FatigueLog[];
  onAddFatigue: (payload: {
    level: number;
    activity: string;
    notes: string;
    recordedAt?: string;
  }) => Promise<void>;
  onDeleteFatigue: (id: number) => Promise<void>;
}

const ACTIVITIES = [
  'Morning Rest',
  'Reading',
  'Light Walk',
  'Screen Work',
  'Physical Therapy',
  'Household Tasks',
  'Socializing',
  'Medical Appointment',
];

function fatigueColor(level: number): string {
  if (level <= 3) return '#35C98A';
  if (level <= 6) return '#FFB547';
  return '#F05263';
}

function fatigueLabel(level: number): string {
  if (level <= 2) return 'Minimal Fatigue';
  if (level <= 4) return 'Mild Fatigue';
  if (level <= 6) return 'Moderate Fatigue';
  if (level <= 8) return 'High Fatigue';
  return 'Severe Fatigue';
}

export const FatigueTrackerPage: React.FC<FatigueTrackerPageProps> = ({
  logs,
  onAddFatigue,
  onDeleteFatigue,
}) => {
  const [level, setLevel] = useState(4);
  const [activity, setActivity] = useState(ACTIVITIES[0]);
  const [notes, setNotes] = useState('');
  const [recordedAt, setRecordedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [submitting, setSubmitting] = useState(false);
  const [activityFilter, setActivityFilter] = useState('ALL');

  const filteredLogs = useMemo(() => {
    if (activityFilter === 'ALL') return logs;
    return logs.filter((l) => l.activity === activityFilter);
  }, [logs, activityFilter]);

  const trendData = useMemo(() => {
    return [...filteredLogs]
      .reverse()
      .map((l) => ({
        date: new Date(l.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        level: l.level,
        activity: l.activity,
      }));
  }, [filteredLogs]);

  const activityPatternData = useMemo(() => {
    const groups: Record<string, { sum: number; count: number }> = {};
    for (const l of logs) {
      if (!groups[l.activity]) groups[l.activity] = { sum: 0, count: 0 };
      groups[l.activity].sum += l.level;
      groups[l.activity].count += 1;
    }
    return Object.entries(groups).map(([name, val]) => ({
      activity: name,
      avgFatigue: Number((val.sum / val.count).toFixed(1)),
      entries: val.count,
    }));
  }, [logs]);

  const avgFatigue = useMemo(() => {
    if (logs.length === 0) return 0;
    return Number((logs.reduce((s, l) => s + l.level, 0) / logs.length).toFixed(1));
  }, [logs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onAddFatigue({
        level,
        activity,
        notes: notes.trim() || `Logged during ${activity}`,
        recordedAt: new Date(recordedAt).toISOString(),
      });
      setNotes('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#7657F6]" />
            <h1 className="text-2xl font-bold tracking-tight">Personalized Fatigue Tracker</h1>
          </div>
          <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
            Track daily fatigue levels alongside activities to explore personal patterns. Exploratory self-reporting only — does not diagnose or predict clinical outcomes.
          </p>
        </div>
        <div className="rounded-xl bg-[var(--nf-surface-alt)] px-4 py-2.5 text-right">
          <p className="text-[11px] text-[var(--nf-text-muted)]">Average Logged Level</p>
          <p className="font-mono-tabular text-lg font-bold text-[#7657F6]">{avgFatigue} / 10</p>
        </div>
      </div>

      {/* Main Split: Log Form + Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6 xl:col-span-5"
        >
          <div>
            <h2 className="text-lg font-bold">Record Fatigue Entry</h2>
            <p className="text-xs text-[var(--nf-text-muted)]">
              Tap a number from 1 (well-rested) to 10 (severe fatigue).
            </p>
          </div>

          {/* Accessible 1-10 Visual Scale */}
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Fatigue Scale</span>
              <span className="font-mono-tabular font-bold" style={{ color: fatigueColor(level) }}>
                {level} / 10 · {fatigueLabel(level)}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const selected = level === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setLevel(num)}
                    className={`min-h-[46px] rounded-xl border font-mono-tabular text-sm font-bold transition-colors ${
                      selected
                        ? 'border-white text-slate-950 shadow-md'
                        : 'border-[var(--nf-border)] bg-[var(--nf-surface-alt)] hover:border-[#7657F6]'
                    }`}
                    style={selected ? { backgroundColor: fatigueColor(num) } : undefined}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity Selection */}
          <div>
            <label className="mb-2 block text-sm font-medium">Activity Performed</label>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITIES.map((act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => setActivity(act)}
                  className={`min-h-[42px] rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${
                    activity === act
                      ? 'border-[#7657F6] bg-[#7657F6] text-white'
                      : 'border-[var(--nf-border)] bg-[var(--nf-surface-alt)] hover:border-[#20C5D8]'
                  }`}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--nf-text-muted)]">
              <Calendar className="h-3.5 w-3.5" />
              <span>Date & Time</span>
            </label>
            <input
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              className="min-h-[42px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--nf-text-muted)]">
              Personal Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did temperature, rest, or pacing affect this moment?"
              className="w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] p-3 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#7657F6] px-4 py-3 text-sm font-semibold text-white hover:bg-[#6646eb] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>{submitting ? 'Saving Entry...' : 'Save Fatigue Entry'}</span>
          </button>
        </form>

        {/* Right 7 cols: Trend & Activity Pattern Charts */}
        <div className="space-y-6 xl:col-span-7">
          <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold">Daily & Weekly Fatigue Timeline</h2>
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="min-h-[36px] rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-xs"
              >
                <option value="ALL">All Activities</option>
                {ACTIVITIES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                  <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111B3A',
                      borderColor: 'rgba(148,163,184,0.3)',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="level"
                    name="Fatigue (1-10)"
                    stroke="#7657F6"
                    strokeWidth={2.5}
                    dot={{ fill: '#20C5D8', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5">
            <h2 className="mb-1 text-base font-bold">Activity vs. Reported Fatigue Patterns</h2>
            <p className="mb-4 text-xs text-[var(--nf-text-muted)]">
              Descriptive average across your logged entries to help spot personal pacing insights.
            </p>
            <div className="h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityPatternData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
                  <XAxis dataKey="activity" stroke="#94a3b8" fontSize={10} />
                  <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111B3A',
                      borderColor: 'rgba(148,163,184,0.3)',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                    }}
                  />
                  <Bar dataKey="avgFatigue" name="Avg Fatigue" fill="#20C5D8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>

      {/* Previous Entries Table */}
      <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5">
        <h2 className="mb-4 text-base font-bold">Previous Fatigue Records ({filteredLogs.length})</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] p-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className="font-mono-tabular font-bold"
                    style={{ color: fatigueColor(log.level) }}
                  >
                    Level {log.level}/10
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold">{log.activity}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-[var(--nf-text-muted)]">
                    {new Date(log.recordedAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-[var(--nf-text-muted)]">{log.notes}</p>
              </div>
              <button
                type="button"
                onClick={() => onDeleteFatigue(log.id)}
                aria-label="Delete fatigue record"
                className="rounded-lg p-1.5 text-[var(--nf-text-muted)] hover:bg-[#F05263]/15 hover:text-[#F05263]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
