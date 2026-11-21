import React, { useState } from 'react';
import {
  BatteryCharging,
  CheckCircle2,
  Cpu,
  Layers,
  Play,
  Power,
  Settings2,
  Sliders,
  Square,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import type { DeviceComponentId, DeviceState, SimulationProfile } from '../types';
import { WearableDevice3D } from '../components/WearableDevice3D';
import { ELECTRODE_CHANNEL_IDS } from '../services/eegDeviceAdapter';

interface DeviceControllerPageProps {
  device: DeviceState;
  reduceMotion: boolean;
  onUpdateDevice: (patch: Partial<DeviceState>) => Promise<void>;
}

const HARDWARE_IDS: DeviceComponentId[] = ['structure', 'holders', 'electronics', 'battery'];

export const DeviceControllerPage: React.FC<DeviceControllerPageProps> = ({
  device,
  reduceMotion,
  onUpdateDevice,
}) => {
  const [selectedComponent, setSelectedComponent] = useState<DeviceComponentId>('E1');
  const [busy, setBusy] = useState(false);

  const selectedData = device.components[selectedComponent];

  const handleToggleConnect = async () => {
    setBusy(true);
    try {
      await onUpdateDevice({
        connected: !device.connected,
        monitoring: !device.connected ? device.monitoring : false,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleMonitoring = async (nextState: boolean) => {
    if (!device.connected && nextState) return;
    setBusy(true);
    try {
      await onUpdateDevice({ monitoring: nextState });
    } finally {
      setBusy(false);
    }
  };

  const handleToggleComponentActive = async (compId: DeviceComponentId) => {
    const comp = device.components[compId];
    if (!comp) return;
    const nextActive = !comp.active;
    await onUpdateDevice({
      components: {
        ...device.components,
        [compId]: {
          ...comp,
          active: nextActive,
          simulatedQuality: nextActive ? Math.max(comp.simulatedQuality, 88) : 0,
        },
      },
    });
  };

  const handleResetAllElectrodes = async () => {
    const next = { ...device.components };
    ELECTRODE_CHANNEL_IDS.forEach((id, idx) => {
      next[id] = {
        ...next[id],
        active: true,
        simulatedQuality: 88 + ((idx * 3) % 9),
      };
    });
    await onUpdateDevice({ components: next });
  };

  return (
    <div className="space-y-6">
      {/* Header & Simulated Hardware Banner */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-[#20C5D8]" />
            <h1 className="text-2xl font-bold tracking-tight">3D Wearable EEG Device Controller</h1>
          </div>
          <p className="mt-1 text-xs font-semibold text-[#FFB547]">
            SIMULATED HARDWARE CONTROLS — 3D CONCEPT MODEL ONLY (NO PHYSICAL DEVICE PAIRED)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3.5 py-2 text-xs">
            {device.connected ? (
              <Wifi className="h-4 w-4 text-[#35C98A]" />
            ) : (
              <WifiOff className="h-4 w-4 text-slate-400" />
            )}
            <span className="font-semibold">
              {device.connected ? 'Simulated Link Active' : 'Disconnected'}
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3.5 py-2 text-xs">
            <BatteryCharging className="h-4 w-4 text-[#35C98A]" />
            <span className="font-mono-tabular font-semibold">{device.batteryLevel}%</span>
            <span className="text-[var(--nf-text-muted)]">(Sim)</span>
          </div>
        </div>
      </div>

      {/* Main Split: 3D Centerpiece + Right Control & Component Inspector */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* 3D Viewport (7 cols) */}
        <div className="space-y-4 xl:col-span-7">
          <WearableDevice3D
            device={device}
            selectedComponent={selectedComponent}
            onSelectComponent={setSelectedComponent}
            reduceMotion={reduceMotion}
          />

          {/* Quick 8-Electrode & Structural Selector Strip */}
          <div className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--nf-text-muted)]">
                Interactive Component Selector (Click 3D Model or Select Below)
              </p>
              <button
                type="button"
                onClick={handleResetAllElectrodes}
                className="text-xs font-semibold text-[#20C5D8] hover:underline"
              >
                Activate All 8 Electrodes
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {ELECTRODE_CHANNEL_IDS.map((eid) => {
                const comp = device.components[eid];
                const isSel = selectedComponent === eid;
                return (
                  <button
                    key={eid}
                    type="button"
                    onClick={() => setSelectedComponent(eid)}
                    className={`flex min-h-[46px] flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-xs transition-colors ${
                      isSel
                        ? 'border-[#7657F6] bg-[#7657F6] text-white'
                        : comp.active
                          ? 'border-[var(--nf-border)] bg-[var(--nf-surface-alt)] hover:border-[#20C5D8]'
                          : 'border-[#FFB547]/50 bg-[#FFB547]/10 text-[#FFB547]'
                    }`}
                  >
                    <span className="font-mono-tabular font-bold">{eid}</span>
                    <span className="text-[10px] opacity-85">{comp.position1020}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {HARDWARE_IDS.map((hid) => {
                const comp = device.components[hid];
                const isSel = selectedComponent === hid;
                return (
                  <button
                    key={hid}
                    type="button"
                    onClick={() => setSelectedComponent(hid)}
                    className={`flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                      isSel
                        ? 'border-[#7657F6] bg-[#7657F6] text-white'
                        : 'border-[var(--nf-border)] bg-[var(--nf-surface-alt)] hover:border-[#20C5D8]'
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{comp.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Side Control Panel & Selected Component Inspector (5 cols) */}
        <div className="space-y-5 xl:col-span-5">
          {/* Selected Component Detailed Panel */}
          <section className="rounded-2xl border border-[#7657F6]/50 bg-[var(--nf-surface)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#20C5D8]">
                  {selectedData.kind === 'electrode'
                    ? `Dry EEG Electrode #${selectedData.electrodeNumber} · ${selectedData.channelId}`
                    : 'Device Structural Assembly'}
                </p>
                <h2 className="mt-1 text-xl font-bold">{selectedData.label}</h2>
              </div>
              <span
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                  !device.connected
                    ? 'bg-slate-700/50 text-slate-300'
                    : selectedData.active
                      ? 'bg-[#35C98A]/15 text-[#35C98A]'
                      : 'bg-[#FFB547]/15 text-[#FFB547]'
                }`}
              >
                {!device.connected ? 'Offline' : selectedData.active ? 'Simulated Active' : 'Deactivated'}
              </span>
            </div>

            <dl className="mt-4 space-y-3 border-t border-[var(--nf-border)] pt-4 text-sm">
              <div>
                <dt className="text-xs font-medium text-[var(--nf-text-muted)]">Position on Device</dt>
                <dd className="mt-0.5 font-medium">{selectedData.locationLabel}</dd>
              </div>
              {selectedData.kind === 'electrode' && (
                <div className="grid grid-cols-3 gap-3 rounded-xl bg-[var(--nf-surface-alt)] p-3">
                  <div>
                    <dt className="text-[11px] text-[var(--nf-text-muted)]">Channel ID</dt>
                    <dd className="font-mono-tabular font-semibold">{selectedData.channelId}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-[var(--nf-text-muted)]">10-20 Site</dt>
                    <dd className="font-mono-tabular font-semibold">{selectedData.position1020}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-[var(--nf-text-muted)]">Sim. Quality</dt>
                    <dd className="font-mono-tabular font-semibold text-[#20C5D8]">
                      {selectedData.active && device.connected ? `${selectedData.simulatedQuality}%` : '0%'}
                    </dd>
                  </div>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-[var(--nf-text-muted)]">Proposed Function</dt>
                <dd className="mt-0.5 leading-relaxed text-[var(--nf-text-muted)]">
                  {selectedData.proposedFunction}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleToggleComponentActive(selectedComponent)}
                className={`flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  selectedData.active
                    ? 'border border-[#FFB547]/60 bg-[#FFB547]/15 text-[#FFB547] hover:bg-[#FFB547]/25'
                    : 'bg-[#35C98A] text-slate-950 hover:bg-[#2db87d]'
                }`}
              >
                <Power className="h-4 w-4" />
                <span>{selectedData.active ? 'Deactivate Component (Sim)' : 'Activate Component (Sim)'}</span>
              </button>
            </div>
          </section>

          {/* Device Simulation Actions */}
          <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[#7657F6]" />
              <h2 className="text-base font-bold">Simulation Controls</h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleToggleConnect}
                className={`flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  device.connected
                    ? 'border border-slate-600 bg-[var(--nf-surface-alt)] hover:border-[#F05263] hover:text-[#F05263]'
                    : 'bg-[#35C98A] text-slate-950 hover:bg-[#2cb87c]'
                }`}
              >
                {device.connected ? <WifiOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
                <span>{device.connected ? 'Disconnect Device' : 'Connect Device'}</span>
              </button>

              {device.monitoring ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleToggleMonitoring(false)}
                  className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[#FFB547]/60 bg-[#FFB547]/15 px-4 py-2.5 text-sm font-semibold text-[#FFB547] transition-colors hover:bg-[#FFB547]/25"
                >
                  <Square className="h-4 w-4" />
                  <span>Stop Monitoring</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || !device.connected}
                  onClick={() => handleToggleMonitoring(true)}
                  className="flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[#20C5D8] px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-[#19b0c2] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Play className="h-4 w-4" />
                  <span>Start Monitoring</span>
                </button>
              )}
            </div>

            {/* Device Settings */}
            <div className="mt-5 space-y-4 border-t border-[var(--nf-border)] pt-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--nf-text-muted)]">
                <Settings2 className="h-3.5 w-3.5" />
                <span>Simulated Device Settings</span>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span>Simulated Battery Level</span>
                  <span className="font-mono-tabular font-semibold text-[#35C98A]">
                    {device.batteryLevel}%
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  value={device.batteryLevel}
                  onChange={(e) => onUpdateDevice({ batteryLevel: Number(e.target.value) })}
                  className="w-full accent-[#35C98A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">
                    Sampling Rate (Sim)
                  </label>
                  <select
                    value={device.samplingRateHz}
                    onChange={(e) =>
                      onUpdateDevice({ samplingRateHz: Number(e.target.value) === 500 ? 500 : 250 })
                    }
                    className="min-h-[42px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
                  >
                    <option value={250}>250 Hz</option>
                    <option value={500}>500 Hz</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">
                    Notch Filter (Sim)
                  </label>
                  <select
                    value={device.notchFilterHz}
                    onChange={(e) =>
                      onUpdateDevice({ notchFilterHz: Number(e.target.value) === 60 ? 60 : 50 })
                    }
                    className="min-h-[42px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
                  >
                    <option value={50}>50 Hz (EU/Intl)</option>
                    <option value={60}>60 Hz (US)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-[var(--nf-text-muted)]">
                  Simulated Signal Profile
                </label>
                <select
                  value={device.simulationProfile}
                  onChange={(e) =>
                    onUpdateDevice({ simulationProfile: e.target.value as SimulationProfile })
                  }
                  className="min-h-[42px] w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3 text-sm"
                >
                  <option value="resting-alpha">Resting Eyes-Closed Baseline (Alpha-rich)</option>
                  <option value="cognitive-load">Active Cognitive Task (Beta-weighted)</option>
                  <option value="drowsy-theta">Quiet Drowsy State (Theta-weighted)</option>
                  <option value="mixed-artifact">Movement & Blink Artifact Demo</option>
                </select>
              </div>
            </div>
          </section>

          {/* Future Hardware Integration Readiness Note */}
          <div className="flex items-start gap-3 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-4 text-xs text-[var(--nf-text-muted)]">
            <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[#7657F6]" />
            <p>
              <strong className="text-[var(--nf-text)]">Architecture Note:</strong> Hardware controls
              communicate through a decoupled device adapter interface (`IEegDeviceAdapter`), allowing
              future physical hardware drivers to replace the simulation engine without redesigning the UI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
