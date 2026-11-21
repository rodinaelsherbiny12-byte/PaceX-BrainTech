import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Brain,
  Clock,
  Play,
  Save,
  Sliders,
  Square,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  DeviceComponentId,
  DeviceState,
  EegSessionRecord,
  SimulationProfile,
} from '../types';
import { EegWaveformCanvas } from '../components/EegWaveformCanvas';
import { eegDeviceAdapter, ELECTRODE_CHANNEL_IDS } from '../services/eegDeviceAdapter';

interface EegMonitoringPageProps {
  device: DeviceState;
  sessions: EegSessionRecord[];
  reduceMotion: boolean;
  onUpdateDevice: (patch: Partial<DeviceState>) => Promise<void>;
  onSaveSession: (payload: {
    startedAt: string;
    durationSec: number;
    activeChannels: string[];
    avgSignalQuality: number;
    notes: string;
    waveformSnapshot: Record<string, number[]>;
  }) => Promise<void>;
}

export const EegMonitoringPage: React.FC<EegMonitoringPageProps> = ({
  device,
  sessions,
  reduceMotion,
  onUpdateDevice,
  onSaveSession,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<DeviceComponentId | 'ALL'>('ALL');
  const [gain, setGain] = useState(1.1);
  const [durationSec, setDurationSec] = useState(0);
  const [latestSamples, setLatestSamples] = useState<Record<string, number>>({});
  const [sessionNotes, setSessionNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [compareSessionA, setCompareSessionA] = useState<number | ''>(sessions[0]?.id ?? '');
  const [compareSessionB, setCompareSessionB] = useState<number | ''>(sessions[1]?.id ?? '');
  const [compareChannel, setCompareChannel] = useState('CH1');

  useEffect(() => {
    if (!device.connected || !device.monitoring) return;
    const timer = setInterval(() => {
      setDurationSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [device.connected, device.monitoring]);

  useEffect(() => {
    if (sessions.length > 0 && compareSessionA === '') setCompareSessionA(sessions[0].id);
    if (sessions.length > 1 && compareSessionB === '') setCompareSessionB(sessions[1].id);
  }, [sessions, compareSessionA, compareSessionB]);

  const activeElectrodes = ELECTRODE_CHANNEL_IDS.filter((id) => device.components[id]?.active);
  const avgSignalQuality = useMemo(() => {
    if (!device.connected || activeElectrodes.length === 0) return 0;
    const sum = activeElectrodes.reduce(
      (acc, id) => acc + (device.components[id]?.simulatedQuality ?? 0),
      0,
    );
    return Math.round(sum / activeElectrodes.length);
  }, [device.connected, device.components, activeElectrodes]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSaveSnapshot = async () => {
    setSaving(true);
    try {
      const snapshot: Record<string, number[]> = {};
      ELECTRODE_CHANNEL_IDS.forEach((eid, idx) => {
        snapshot[`CH${idx + 1}`] = [];
      });
      for (let step = 0; step < 36; step++) {
        const pkt = eegDeviceAdapter.generateFrame(
          step * 0.04,
          device.samplingRateHz,
          device.simulationProfile,
          device.components,
        );
        pkt.samples.forEach((s) => {
          snapshot[s.channelId]?.push(s.microVolts);
        });
      }
      await onSaveSession({
        startedAt: new Date().toISOString(),
        durationSec: Math.max(durationSec, 15),
        activeChannels: activeElectrodes.map((eid) => device.components[eid].channelId || eid),
        avgSignalQuality,
        notes:
          sessionNotes.trim() ||
          `Simulated ${device.simulationProfile} recording (${activeElectrodes.length} active channels)`,
        waveformSnapshot: snapshot,
      });
      setSessionNotes('');
    } finally {
      setSaving(false);
    }
  };

  const comparisonChartData = useMemo(() => {
    const sA = sessions.find((s) => s.id === Number(compareSessionA));
    const sB = sessions.find((s) => s.id === Number(compareSessionB));
    const arrA = sA?.waveformSnapshot?.[compareChannel] ?? [];
    const arrB = sB?.waveformSnapshot?.[compareChannel] ?? [];
    const len = Math.max(arrA.length, arrB.length, 0);
    return Array.from({ length: len }, (_, i) => ({
      sample: i + 1,
      sessionA: arrA[i] ?? null,
      sessionB: arrB[i] ?? null,
    }));
  }, [sessions, compareSessionA, compareSessionB, compareChannel]);

  return (
    <div className="space-y-6">
      {/* Prominent Scientific Simulation Disclaimer */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#FFB547]/50 bg-[#FFB547]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 shrink-0 text-[#FFB547]" />
          <div>
            <p className="text-sm font-bold tracking-wide text-[#FFB547]">
              SIMULATED EEG DATA — NOT REAL SENSOR MEASUREMENTS
            </p>
            <p className="text-xs text-[var(--nf-text-muted)]">
              Waveforms below are synthetic signals generated for research demonstration. They do not represent clinical diagnostics or automated fatigue detection.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!device.connected && (
            <button
              type="button"
              onClick={() => onUpdateDevice({ connected: true, monitoring: true })}
              className="min-h-[42px] rounded-xl bg-[#35C98A] px-4 py-2 text-xs font-semibold text-slate-950"
            >
              Connect & Start Sim
            </button>
          )}
          {device.connected && (
            <button
              type="button"
              onClick={() => onUpdateDevice({ monitoring: !device.monitoring })}
              className={`flex min-h-[42px] items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${
                device.monitoring
                  ? 'border border-[#FFB547]/60 bg-[#FFB547]/20 text-[#FFB547]'
                  : 'bg-[#20C5D8] text-slate-950'
              }`}
            >
              {device.monitoring ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              <span>{device.monitoring ? 'Stop Simulation' : 'Start Simulation'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-4">
          <p className="text-xs text-[var(--nf-text-muted)]">Recording Status (Sim)</p>
          <p className="mt-1 text-lg font-bold text-[#20C5D8]">
            {!device.connected ? 'Disconnected' : device.monitoring ? 'Streaming Live' : 'Paused'}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-4">
          <p className="flex items-center gap-1.5 text-xs text-[var(--nf-text-muted)]">
            <Clock className="h-3.5 w-3.5" />
            <span>Monitoring Duration</span>
          </p>
          <p className="mt-1 font-mono-tabular text-lg font-bold">{formatTimer(durationSec)}</p>
        </div>
        <div className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-4">
          <p className="text-xs text-[var(--nf-text-muted)]">Avg. Signal Quality (Sim)</p>
          <p className="mt-1 font-mono-tabular text-lg font-bold text-[#35C98A]">
            {avgSignalQuality}%
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-4">
          <p className="text-xs text-[var(--nf-text-muted)]">Sampling & Notch (Sim)</p>
          <p className="mt-1 font-mono-tabular text-lg font-bold">
            {device.samplingRateHz} Hz · {device.notchFilterHz} Hz
          </p>
        </div>
      </div>

      {/* Main Oscilloscope & Channel Inspector */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="space-y-4 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5 xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">8-Channel Simulated EEG Oscilloscope</h2>
              <p className="text-xs text-[var(--nf-text-muted)]">
                Click any waveform row or channel button below to isolate and inspect a single channel.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-[var(--nf-text-muted)]">
                <Sliders className="h-3.5 w-3.5 text-[#7657F6]" />
                <span>Gain</span>
                <input
                  type="range"
                  min={0.5}
                  max={2.2}
                  step={0.1}
                  value={gain}
                  onChange={(e) => setGain(Number(e.target.value))}
                  className="w-20 accent-[#7657F6]"
                />
              </label>

              <select
                value={device.simulationProfile}
                onChange={(e) =>
                  onUpdateDevice({ simulationProfile: e.target.value as SimulationProfile })
                }
                className="min-h-[38px] rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-xs"
              >
                <option value="resting-alpha">Profile: Resting Alpha</option>
                <option value="cognitive-load">Profile: Cognitive Task</option>
                <option value="drowsy-theta">Profile: Quiet Theta</option>
                <option value="mixed-artifact">Profile: Artifact Demo</option>
              </select>
            </div>
          </div>

          {/* Channel Filter Buttons */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedChannel('ALL')}
              className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedChannel === 'ALL'
                  ? 'bg-[#7657F6] text-white'
                  : 'bg-[var(--nf-surface-alt)] text-[var(--nf-text-muted)] hover:text-[var(--nf-text)]'
              }`}
            >
              All 8 Channels
            </button>
            {ELECTRODE_CHANNEL_IDS.map((eid) => {
              const comp = device.components[eid];
              const isSel = selectedChannel === eid;
              return (
                <button
                  key={eid}
                  type="button"
                  onClick={() => setSelectedChannel(eid)}
                  className={`min-h-[36px] rounded-lg px-2.5 py-1.5 font-mono-tabular text-xs font-semibold transition-colors ${
                    isSel
                      ? 'bg-[#20C5D8] text-slate-950'
                      : 'bg-[var(--nf-surface-alt)] text-[var(--nf-text-muted)] hover:text-[var(--nf-text)]'
                  }`}
                >
                  {comp.channelId} ({comp.position1020})
                </button>
              );
            })}
          </div>

          <EegWaveformCanvas
            device={device}
            selectedChannel={selectedChannel}
            onSelectChannel={(id) => setSelectedChannel(id)}
            gain={gain}
            reduceMotion={reduceMotion}
            onLatestSamples={setLatestSamples}
          />

          {/* Save Snapshot Form */}
          <div className="flex flex-col gap-3 border-t border-[var(--nf-border)] pt-4 sm:flex-row">
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Optional note for this simulated EEG snapshot (e.g., quiet rest session)..."
              className="min-h-[42px] flex-1 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3.5 text-sm"
            />
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveSnapshot}
              className="flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#7657F6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6646eb] disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Sim. Snapshot'}</span>
            </button>
          </div>
        </div>

        {/* Right 4 cols: Per-Channel Signal Quality & Live Readout */}
        <div className="space-y-4 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5 xl:col-span-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#20C5D8]" />
            <h2 className="text-lg font-bold">Channel Quality Matrix (Sim)</h2>
          </div>

          <div className="space-y-2.5">
            {ELECTRODE_CHANNEL_IDS.map((eid) => {
              const comp = device.components[eid];
              const chId = comp.channelId || eid;
              const uV = latestSamples[chId] ?? 0;
              const quality = device.connected && comp.active ? comp.simulatedQuality : 0;
              return (
                <button
                  key={eid}
                  type="button"
                  onClick={() => setSelectedChannel(selectedChannel === eid ? 'ALL' : eid)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    selectedChannel === eid
                      ? 'border-[#7657F6] bg-[#7657F6]/10'
                      : 'border-[var(--nf-border)] bg-[var(--nf-surface-alt)] hover:border-[#20C5D8]/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-tabular font-bold">
                      {chId} · {comp.position1020}
                    </span>
                    <span className="font-mono-tabular text-[#20C5D8]">
                      {device.connected && comp.active ? `${uV.toFixed(1)} µV` : 'Paused'}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${quality}%`,
                          backgroundColor: quality >= 80 ? '#35C98A' : quality > 0 ? '#FFB547' : '#475569',
                        }}
                      />
                    </div>
                    <span className="font-mono-tabular w-9 text-right text-xs text-[var(--nf-text-muted)]">
                      {quality}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Historical Simulated Session Comparison */}
      <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold">Historical Simulated Signal Comparison</h2>
            <p className="text-xs text-[var(--nf-text-muted)]">
              Compare saved simulated EEG waveform snapshots across sessions (research visualization only).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={compareSessionA}
              onChange={(e) => setCompareSessionA(Number(e.target.value))}
              className="min-h-[38px] rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-xs"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  Session A: {new Date(s.startedAt).toLocaleDateString()} ({s.avgSignalQuality}%)
                </option>
              ))}
            </select>
            <select
              value={compareSessionB}
              onChange={(e) => setCompareSessionB(Number(e.target.value))}
              className="min-h-[38px] rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-xs"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  Session B: {new Date(s.startedAt).toLocaleDateString()} ({s.avgSignalQuality}%)
                </option>
              ))}
            </select>
            <select
              value={compareChannel}
              onChange={(e) => setCompareChannel(e.target.value)}
              className="min-h-[38px] rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 font-mono-tabular text-xs"
            >
              {['CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6', 'CH7', 'CH8'].map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={comparisonChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.14)" />
              <XAxis dataKey="sample" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} unit=" µV" />
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
                type="monotone"
                dataKey="sessionA"
                name="Session A (Simulated µV)"
                stroke="#20C5D8"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="sessionB"
                name="Session B (Simulated µV)"
                stroke="#7657F6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};
