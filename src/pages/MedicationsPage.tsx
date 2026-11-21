import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Edit3,
  Pill,
  Plus,
  RotateCcw,
  Syringe,
  Trash2,
} from 'lucide-react';
import type { MedicationRecurrence, MedicationReminder, MedicationType } from '../types';

interface MedicationsPageProps {
  medications: MedicationReminder[];
  onAddMedication: (payload: {
    name: string;
    medType: MedicationType;
    dosageNote: string;
    scheduleDate: string;
    reminderTime: string;
    recurrence: MedicationRecurrence;
  }) => Promise<void>;
  onUpdateMedication: (id: number, patch: Partial<MedicationReminder>) => Promise<void>;
  onDeleteMedication: (id: number) => Promise<void>;
}

const MED_TYPES: MedicationType[] = ['Tablet', 'Capsule', 'Injection', 'Infusion', 'Other'];
const RECURRENCES: MedicationRecurrence[] = ['Once', 'Daily', 'Every 2 Days', 'Weekly'];

export const MedicationsPage: React.FC<MedicationsPageProps> = ({
  medications,
  onAddMedication,
  onUpdateMedication,
  onDeleteMedication,
}) => {
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [medType, setMedType] = useState<MedicationType>('Tablet');
  const [dosageNote, setDosageNote] = useState('');
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reminderTime, setReminderTime] = useState('09:00');
  const [recurrence, setRecurrence] = useState<MedicationRecurrence>('Daily');
  const [submitting, setSubmitting] = useState(false);

  const upcomingList = medications.filter((m) => !m.completed);
  const historyList = medications.filter((m) => m.completed);
  const shownList = tab === 'upcoming' ? upcomingList : historyList;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setMedType('Tablet');
    setDosageNote('');
    setScheduleDate(new Date().toISOString().slice(0, 10));
    setReminderTime('09:00');
    setRecurrence('Daily');
  };

  const handleStartEdit = (med: MedicationReminder) => {
    setEditingId(med.id);
    setName(med.name);
    setMedType(med.medType);
    setDosageNote(med.dosageNote);
    setScheduleDate(med.scheduleDate);
    setReminderTime(med.reminderTime);
    setRecurrence(med.recurrence);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (editingId !== null) {
        await onUpdateMedication(editingId, {
          name: name.trim(),
          medType,
          dosageNote: dosageNote.trim(),
          scheduleDate,
          reminderTime,
          recurrence,
        });
      } else {
        await onAddMedication({
          name: name.trim(),
          medType,
          dosageNote: dosageNote.trim() || 'As instructed by physician',
          scheduleDate,
          reminderTime,
          recurrence,
        });
      }
      resetForm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Responsible Clinical Disclaimer */}
      <div className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-[#FFB547]" />
              <h1 className="text-2xl font-bold tracking-tight">Medication & Injection Reminders</h1>
            </div>
            <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
              Enter your existing treatment schedule exactly as prescribed by your healthcare team. NEUROFLOW never recommends medication dosages or treatment adjustments.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-[var(--nf-surface-alt)] px-4 py-2 text-xs">
            <span className="font-mono-tabular font-bold text-[#FFB547]">{upcomingList.length}</span>
            <span>Upcoming</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular font-bold text-[#35C98A]">{historyList.length}</span>
            <span>Completed</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Form (5 cols) */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6 xl:col-span-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {editingId !== null ? 'Edit Medication Reminder' : 'Add Medication Reminder'}
            </h2>
            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-medium text-[var(--nf-text-muted)] hover:text-white"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--nf-text-muted)]">
              Medication Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Prescribed Injection or Vitamin D"
              className="min-h-[44px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--nf-text-muted)]">
              Medication Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {MED_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMedType(t)}
                  className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-colors ${
                    medType === t
                      ? 'border-[#FFB547] bg-[#FFB547] text-slate-950'
                      : 'border-[var(--nf-border)] bg-[var(--nf-surface-alt)] hover:border-[#FFB547]'
                  }`}
                >
                  {t === 'Injection' || t === 'Infusion' ? (
                    <Syringe className="h-3.5 w-3.5" />
                  ) : (
                    <Pill className="h-3.5 w-3.5" />
                  )}
                  <span>{t}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--nf-text-muted)]">
                Schedule Date
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--nf-text-muted)]">
                Reminder Time
              </label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--nf-text-muted)]">
              Recurring Schedule
            </label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as MedicationRecurrence)}
              className="min-h-[44px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
            >
              {RECURRENCES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--nf-text-muted)]">
              Your Physician Instructions / Notes
            </label>
            <input
              type="text"
              value={dosageNote}
              onChange={(e) => setDosageNote(e.target.value)}
              placeholder="e.g., With meal, rotate injection site"
              className="min-h-[44px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3.5 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#FFB547] px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-[#f5a631] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>
              {submitting
                ? 'Saving...'
                : editingId !== null
                  ? 'Update Reminder'
                  : 'Save Medication Reminder'}
            </span>
          </button>
        </form>

        {/* Reminders List (7 cols) */}
        <div className="space-y-4 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6 xl:col-span-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1 rounded-xl bg-[var(--nf-surface-alt)] p-1">
              <button
                type="button"
                onClick={() => setTab('upcoming')}
                className={`min-h-[38px] rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                  tab === 'upcoming' ? 'bg-[#7657F6] text-white' : 'text-[var(--nf-text-muted)]'
                }`}
              >
                Upcoming Schedule ({upcomingList.length})
              </button>
              <button
                type="button"
                onClick={() => setTab('history')}
                className={`min-h-[38px] rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
                  tab === 'history' ? 'bg-[#35C98A] text-slate-950' : 'text-[var(--nf-text-muted)]'
                }`}
              >
                Completed History ({historyList.length})
              </button>
            </div>
          </div>

          {shownList.length === 0 ? (
            <div className="rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] p-8 text-center">
              <p className="text-sm font-medium">
                {tab === 'upcoming'
                  ? 'No upcoming reminders. Add one using the form.'
                  : 'No completed medications recorded yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {shownList.map((med) => (
                <div
                  key={med.id}
                  className="flex flex-col gap-4 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-[#FFB547]">{med.medType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular font-semibold">{med.scheduleDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 font-mono-tabular font-semibold text-[#20C5D8]">
                        <Clock className="h-3.5 w-3.5" />
                        {med.reminderTime}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-[var(--nf-text-muted)]">{med.recurrence}</span>
                    </div>
                    <h3 className="mt-1 text-base font-bold">{med.name}</h3>
                    <p className="mt-0.5 text-xs text-[var(--nf-text-muted)]">{med.dosageNote}</p>
                    {med.completed && med.completedAt && (
                      <p className="mt-1 font-mono-tabular text-[11px] text-[#35C98A]">
                        Completed at {new Date(med.completedAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onUpdateMedication(med.id, { completed: !med.completed })}
                      className={`flex min-h-[42px] items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${
                        med.completed
                          ? 'border border-[var(--nf-border)] hover:border-[#FFB547]'
                          : 'bg-[#35C98A] text-slate-950 hover:bg-[#2db77d]'
                      }`}
                    >
                      {med.completed ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Reopen</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Mark Completed</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(med)}
                      aria-label="Edit reminder"
                      className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-[var(--nf-border)] hover:border-[#7657F6]"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteMedication(med.id)}
                      aria-label="Delete reminder"
                      className="flex min-h-[42px] min-w-[42px] items-center justify-center rounded-xl border border-[var(--nf-border)] hover:border-[#F05263] hover:text-[#F05263]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
