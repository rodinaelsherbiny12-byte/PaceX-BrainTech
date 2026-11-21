import React, { useEffect, useRef } from 'react';
import type { DeviceComponentId, DeviceState } from '../types';
import { eegDeviceAdapter, ELECTRODE_CHANNEL_IDS } from '../services/eegDeviceAdapter';

interface EegWaveformCanvasProps {
  device: DeviceState;
  selectedChannel: DeviceComponentId | 'ALL';
  onSelectChannel?: (id: DeviceComponentId) => void;
  gain?: number;
  compact?: boolean;
  reduceMotion?: boolean;
  onLatestSamples?: (samples: Record<string, number>) => void;
}

const CHANNEL_COLORS = [
  '#20C5D8', // CH1 Cyan
  '#38BDF8', // CH2 Sky
  '#7657F6', // CH3 Electric Purple
  '#A78BFA', // CH4 Lavender
  '#20C5D8', // CH5 Cyan
  '#35C98A', // CH6 Mint
  '#7657F6', // CH7 Purple
  '#20C5D8', // CH8 Cyan
];

export const EegWaveformCanvas: React.FC<EegWaveformCanvasProps> = ({
  device,
  selectedChannel,
  onSelectChannel,
  gain = 1,
  compact = false,
  reduceMotion = false,
  onLatestSamples,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const deviceRef = useRef(device);
  const selectedRef = useRef(selectedChannel);
  const gainRef = useRef(gain);
  const reduceMotionRef = useRef(reduceMotion);
  const onLatestRef = useRef(onLatestSamples);

  deviceRef.current = device;
  selectedRef.current = selectedChannel;
  gainRef.current = gain;
  reduceMotionRef.current = reduceMotion;
  onLatestRef.current = onLatestSamples;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLen = 220;
    const buffers: number[][] = Array.from({ length: 8 }, () => Array(bufferLen).fill(0));
    let simTime = 0;
    let lastTimestamp = performance.now();
    let frameId = 0;
    let lastReport = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(Math.floor(rect.width * dpr), 300);
      canvas.height = Math.max(Math.floor(rect.height * dpr), 180);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      const dt = Math.min((now - lastTimestamp) / 1000, 0.08);
      lastTimestamp = now;

      const curDevice = deviceRef.current;
      const curSelected = selectedRef.current;
      const curGain = gainRef.current;
      const isStreaming = curDevice.connected && curDevice.monitoring;

      if (isStreaming && !reduceMotionRef.current) {
        simTime += dt;
        const packet = eegDeviceAdapter.generateFrame(
          simTime,
          curDevice.samplingRateHz,
          curDevice.simulationProfile,
          curDevice.components,
        );
        const latestMap: Record<string, number> = {};
        packet.samples.forEach((s, idx) => {
          buffers[idx].push(s.microVolts);
          if (buffers[idx].length > bufferLen) buffers[idx].shift();
          latestMap[s.channelId] = s.microVolts;
        });
        if (onLatestRef.current && now - lastReport > 220) {
          lastReport = now;
          onLatestRef.current(latestMap);
        }
      } else if (isStreaming && reduceMotionRef.current && simTime === 0) {
        // Seed one static frame when reduce-motion is enabled
        for (let step = 0; step < bufferLen; step++) {
          const packet = eegDeviceAdapter.generateFrame(
            step * 0.015,
            curDevice.samplingRateHz,
            curDevice.simulationProfile,
            curDevice.components,
          );
          packet.samples.forEach((s, idx) => {
            buffers[idx][step] = s.microVolts;
          });
        }
        simTime = 1;
      }

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // Subtle oscilloscope grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.1)';
      ctx.lineWidth = 1;
      const vCols = 10;
      for (let c = 1; c < vCols; c++) {
        const x = (c / vCols) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      const visibleIndices =
        curSelected === 'ALL'
          ? [0, 1, 2, 3, 4, 5, 6, 7]
          : [Math.max(0, ELECTRODE_CHANNEL_IDS.indexOf(curSelected))];

      const rowHeight = h / visibleIndices.length;

      visibleIndices.forEach((chIdx, rowPos) => {
        const eid = ELECTRODE_CHANNEL_IDS[chIdx];
        const comp = curDevice.components[eid];
        const active = comp?.active ?? true;
        const centerY = rowPos * rowHeight + rowHeight / 2;

        // Baseline trace line
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(w, centerY);
        ctx.stroke();

        // Channel label
        ctx.fillStyle = active && curDevice.connected ? '#CBD5E1' : '#64748B';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillText(
          `${comp?.channelId ?? `CH${chIdx + 1}`} · ${comp?.position1020 ?? ''}`,
          10,
          rowPos * rowHeight + 16,
        );

        if (!curDevice.connected || !active) {
          ctx.fillStyle = '#94A3B8';
          ctx.font = '500 10px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(!curDevice.connected ? 'Disconnected' : 'Channel Paused', 96, rowPos * rowHeight + 16);
        }

        // Waveform curve
        const pts = buffers[chIdx];
        const color = !curDevice.connected || !active ? '#475569' : CHANNEL_COLORS[chIdx];
        ctx.strokeStyle = color;
        ctx.lineWidth = visibleIndices.length === 1 ? 2.4 : 1.7;
        ctx.beginPath();

        const ampScale = (rowHeight / 115) * curGain;
        const startX = 76;
        const plotW = Math.max(w - startX - 12, 80);

        for (let i = 0; i < pts.length; i++) {
          const x = startX + (i / (pts.length - 1)) * plotW;
          const val = curDevice.connected && active ? pts[i] : 0;
          const y = centerY - val * ampScale;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      frameId = requestAnimationFrame(draw);
    };

    frameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameId);
      ro.disconnect();
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSelectChannel || selectedChannel !== 'ALL') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const idx = Math.min(7, Math.max(0, Math.floor((relY / rect.height) * 8)));
    onSelectChannel(ELECTRODE_CHANNEL_IDS[idx]);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-[#080E21]">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className={`block w-full ${onSelectChannel && selectedChannel === 'ALL' ? 'cursor-pointer' : ''} ${
          compact ? 'h-[220px]' : 'h-[400px] sm:h-[460px]'
        }`}
      />
    </div>
  );
};
