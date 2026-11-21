import React, { useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Phone,
  Plus,
  ShieldAlert,
  Star,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { EmergencyContact, UserProfile } from '../types';

interface EmergencySosPageProps {
  profile: UserProfile;
  contacts: EmergencyContact[];
  onAddContact: (payload: {
    name: string;
    relationship: string;
    phone: string;
    email: string;
    priority: number;
    messageTemplate: string;
    isPrimary: boolean;
  }) => Promise<void>;
  onUpdateContact: (id: number, patch: Partial<EmergencyContact>) => Promise<void>;
  onDeleteContact: (id: number) => Promise<void>;
  onLogSimulatedSos: (contact: EmergencyContact | null) => Promise<void>;
  sosModalOpen: boolean;
  setSosModalOpen: (open: boolean) => void;
}

export const EmergencySosPage: React.FC<EmergencySosPageProps> = ({
  profile,
  contacts,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onLogSimulatedSos,
  sosModalOpen,
  setSosModalOpen,
}) => {
  const [selectedContact, setSelectedContact] = useState<EmergencyContact | null>(
    contacts[0] ?? null,
  );
  const [simResultBanner, setSimResultBanner] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [messageTemplate, setMessageTemplate] = useState(
    'NEUROFLOW Alert: I am experiencing high fatigue or need immediate assistance. Please call me back.',
  );
  const [isPrimary, setIsPrimary] = useState(false);

  const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0] ?? null;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setRelationship('');
    setPhone('');
    setEmail('');
    setMessageTemplate(
      'NEUROFLOW Alert: I am experiencing high fatigue or need immediate assistance. Please call me back.',
    );
    setIsPrimary(false);
  };

  const handleEdit = (c: EmergencyContact) => {
    setEditingId(c.id);
    setName(c.name);
    setRelationship(c.relationship);
    setPhone(c.phone);
    setEmail(c.email);
    setMessageTemplate(c.messageTemplate);
    setIsPrimary(c.isPrimary);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    if (editingId !== null) {
      await onUpdateContact(editingId, {
        name: name.trim(),
        relationship: relationship.trim() || 'Trusted Contact',
        phone: phone.trim(),
        email: email.trim(),
        messageTemplate: messageTemplate.trim(),
        isPrimary,
      });
    } else {
      await onAddContact({
        name: name.trim(),
        relationship: relationship.trim() || 'Trusted Contact',
        phone: phone.trim(),
        email: email.trim(),
        priority: contacts.length + 1,
        messageTemplate: messageTemplate.trim(),
        isPrimary,
      });
    }
    resetForm();
  };

  const triggerSosConfirmation = (contact: EmergencyContact | null) => {
    setSelectedContact(contact ?? primaryContact);
    setSosModalOpen(true);
  };

  const handleConfirmSimulatedSos = async () => {
    const target = selectedContact ?? primaryContact;
    await onLogSimulatedSos(target);
    setSosModalOpen(false);
    setSimResultBanner(
      target
        ? `SIMULATED SOS LOGGED FOR ${target.name} (${target.phone}). Because this is a research prototype without external telephony integration, no real call or SMS was placed.`
        : 'SIMULATED SOS LOGGED LOCALLY. No real emergency call or SMS was placed.',
    );
  };

  return (
    <div className="space-y-6">
      {/* Prototype Responsibility Notice */}
      <div className="rounded-2xl border border-[#F05263]/50 bg-[#F05263]/10 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-[#F05263]" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Emergency SOS Assistance</h1>
              <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
                Accessible large-target interface designed for motor or hand-movement challenges. Prototype Mode: calls and alert dispatches are simulated with explicit confirmation and never claim to reach real emergency services.
              </p>
            </div>
          </div>
        </div>
      </div>

      {simResultBanner && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-[#FFB547] bg-[#FFB547]/15 p-4 text-sm">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#FFB547]" />
            <p className="font-medium">{simResultBanner}</p>
          </div>
          <button
            type="button"
            onClick={() => setSimResultBanner(null)}
            className="shrink-0 text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Large Accessible SOS Trigger + Quick Shortcuts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="flex flex-col items-center justify-center rounded-2xl border border-[#F05263]/50 bg-[var(--nf-surface)] p-8 text-center lg:col-span-5">
          <button
            type="button"
            onClick={() => triggerSosConfirmation(primaryContact)}
            className="flex h-52 w-52 flex-col items-center justify-center rounded-full border-4 border-[#F05263]/40 bg-[#F05263] text-white shadow-2xl transition-transform active:scale-95 hover:bg-[#e14153] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <ShieldAlert className="h-14 w-14" />
            <span className="mt-2 text-2xl font-extrabold tracking-wider">SOS</span>
            <span className="mt-1 text-xs font-medium opacity-90">Tap to Confirm Alert</span>
          </button>

          <p className="mt-5 max-w-xs text-sm text-[var(--nf-text-muted)]">
            {primaryContact
              ? `Primary Contact: ${primaryContact.name} (${primaryContact.phone})`
              : 'Add a primary emergency contact on the right.'}
          </p>
          <p className="mt-1 text-xs font-medium text-[#FFB547]">
            Confirmation step required before simulation
          </p>
        </section>

        {/* Quick Contact Shortcuts & Emergency Card */}
        <div className="space-y-5 lg:col-span-7">
          <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6">
            <h2 className="mb-3 text-lg font-bold">Quick Contact Shortcuts</h2>
            {contacts.length === 0 ? (
              <p className="text-sm text-[var(--nf-text-muted)]">No emergency contacts added yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {contacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => triggerSosConfirmation(c)}
                    className="flex min-h-[74px] items-center justify-between gap-3 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] p-4 text-left transition-colors hover:border-[#F05263]"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-bold">
                        {c.isPrimary && <Star className="h-3.5 w-3.5 shrink-0 text-[#FFB547]" />}
                        <span>{c.name}</span>
                      </p>
                      <p className="truncate text-xs text-[var(--nf-text-muted)]">{c.relationship}</p>
                      <p className="mt-0.5 font-mono-tabular text-xs text-[#20C5D8]">{c.phone}</p>
                    </div>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F05263]/15 text-[#F05263]">
                      <Phone className="h-5 w-5" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6">
            <h2 className="mb-2 text-base font-bold">Emergency Reference Information</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-[var(--nf-surface-alt)] p-3">
                <dt className="text-xs text-[var(--nf-text-muted)]">Profile Name</dt>
                <dd className="mt-0.5 font-semibold">{profile.name}</dd>
              </div>
              <div className="rounded-xl bg-[var(--nf-surface-alt)] p-3">
                <dt className="text-xs text-[var(--nf-text-muted)]">Care Note</dt>
                <dd className="mt-0.5 font-medium">{profile.conditionNote}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      {/* Contact Manager: Form + Full List */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <form
          onSubmit={handleSaveContact}
          className="space-y-4 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6 xl:col-span-5"
        >
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <UserPlus className="h-5 w-5 text-[#7657F6]" />
              <span>{editingId !== null ? 'Edit Emergency Contact' : 'Add Family / Trusted Contact'}</span>
            </h2>
            {editingId !== null && (
              <button type="button" onClick={resetForm} className="text-xs underline">
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Marcus Vance"
                className="min-h-[44px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">Relationship</label>
              <input
                type="text"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="Family / Care Partner"
                className="min-h-[44px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 234-8910"
                className="min-h-[44px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">Email (Optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@example.org"
                className="min-h-[44px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">
              Emergency Message Template
            </label>
            <textarea
              rows={2}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] p-3 text-sm"
            />
          </div>

          <label className="flex min-h-[40px] cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 accent-[#F05263]"
            />
            <span>Set as Primary SOS Contact</span>
          </label>

          <button
            type="submit"
            className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-[#7657F6] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6646eb]"
          >
            <Plus className="h-4 w-4" />
            <span>{editingId !== null ? 'Update Contact' : 'Save Contact'}</span>
          </button>
        </form>

        <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6 xl:col-span-7">
          <h2 className="mb-4 text-lg font-bold">Saved Emergency Contacts & Templates</h2>
          <div className="space-y-3">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold">{c.name}</h3>
                      {c.isPrimary && (
                        <span className="text-xs font-semibold text-[#FFB547]">Primary Contact</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--nf-text-muted)]">
                      {c.relationship} · <span className="font-mono-tabular">{c.phone}</span>
                      {c.email ? ` · ${c.email}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(c)}
                      aria-label="Edit contact"
                      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-[var(--nf-border)] hover:border-[#7657F6]"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteContact(c.id)}
                      aria-label="Delete contact"
                      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-[var(--nf-border)] hover:border-[#F05263] hover:text-[#F05263]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 rounded-lg bg-black/15 p-2.5 text-xs text-[var(--nf-text-muted)]">
                  Template: “{c.messageTemplate}”
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Mandatory Confirmation Modal */}
      {sosModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sos-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#F05263] bg-[#111B3A] p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center gap-3 text-[#F05263]">
              <ShieldAlert className="h-7 w-7" />
              <h2 id="sos-confirm-title" className="text-xl font-bold">
                Confirm Simulated SOS Alert
              </h2>
            </div>

            <p className="mt-3 text-sm text-slate-300">
              Are you sure you want to trigger a simulated emergency assistance log
              {selectedContact ? ` for ${selectedContact.name} (${selectedContact.phone})` : ''}?
            </p>

            {selectedContact && (
              <div className="mt-3 rounded-xl bg-slate-900/80 p-3 text-xs text-slate-300">
                Message Preview: “{selectedContact.messageTemplate}”
              </div>
            )}

            <p className="mt-3 text-xs text-[#FFB547]">
              Prototype Disclosure: No real telephone call or SMS is sent by this research demonstration.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setSosModalOpen(false)}
                className="min-h-[48px] flex-1 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSimulatedSos}
                className="min-h-[48px] flex-1 rounded-xl bg-[#F05263] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#dc3f51]"
              >
                Confirm Simulated SOS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
