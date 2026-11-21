import type { DeviceComponentId, DeviceComponentState, SimulationProfile } from '../types.ts';

/**
 * Hardware Abstraction Layer (HAL) for NEUROFLOW EEG Wearable Head Device.
 *
 * All current implementations run strictly in SIMULATION MODE because no physical
 * hardware is paired. Future physical hardware drivers (WebSerial / native BLE bridge)
 * can implement `IEegDeviceAdapter` without altering UI components.
 */
export interface EegChannelSample {
  channelId: string;
  electrodeId: DeviceComponentId;
  position1020: string;
  microVolts: number;
  signalQuality: number;
  isSimulated: true;
}

export interface EegFramePacket {
  timestampMs: number;
  samplingRateHz: 250 | 500;
  samples: EegChannelSample[];
  isSimulated: true;
}

export interface IEegDeviceAdapter {
  readonly isSimulatedHardware: true;
  readonly architectureName: string;
  generateFrame(
    timeSec: number,
    samplingRateHz: 250 | 500,
    profile: SimulationProfile,
    components: Record<DeviceComponentId, DeviceComponentState>,
  ): EegFramePacket;
}

export const ELECTRODE_CHANNEL_IDS: DeviceComponentId[] = [
  'E1',
  'E2',
  'E3',
  'E4',
  'E5',
  'E6',
  'E7',
  'E8',
];

export const DEFAULT_DEVICE_COMPONENTS: Record<DeviceComponentId, DeviceComponentState> = {
  E1: {
    id: 'E1',
    kind: 'electrode',
    label: 'Electrode 1 (Fp1)',
    electrodeNumber: 1,
    channelId: 'CH1',
    position1020: 'Fp1',
    locationLabel: 'Front-Left Prefrontal Arc (11 o’clock)',
    proposedFunction: 'Captures left prefrontal cortical rhythms and blink/attention baseline artifacts.',
    active: true,
    simulatedQuality: 94,
    impedanceKOhm: 14.2,
  },
  E2: {
    id: 'E2',
    kind: 'electrode',
    label: 'Electrode 2 (Fp2)',
    electrodeNumber: 2,
    channelId: 'CH2',
    position1020: 'Fp2',
    locationLabel: 'Front-Right Prefrontal Arc (1 o’clock)',
    proposedFunction: 'Captures right prefrontal cortical rhythms for hemispheric frontal symmetry checks.',
    active: true,
    simulatedQuality: 92,
    impedanceKOhm: 15.8,
  },
  E3: {
    id: 'E3',
    kind: 'electrode',
    label: 'Electrode 3 (F3)',
    electrodeNumber: 3,
    channelId: 'CH3',
    position1020: 'F3',
    locationLabel: 'Left Frontal-Lateral Arc (9:30 position)',
    proposedFunction: 'Proposed monitoring of left dorsolateral frontal cognitive load patterns.',
    active: true,
    simulatedQuality: 89,
    impedanceKOhm: 18.4,
  },
  E4: {
    id: 'E4',
    kind: 'electrode',
    label: 'Electrode 4 (F4)',
    electrodeNumber: 4,
    channelId: 'CH4',
    position1020: 'F4',
    locationLabel: 'Right Frontal-Lateral Arc (2:30 position)',
    proposedFunction: 'Proposed monitoring of right frontal executive rhythm and resting stability.',
    active: true,
    simulatedQuality: 91,
    impedanceKOhm: 16.9,
  },
  E5: {
    id: 'E5',
    kind: 'electrode',
    label: 'Electrode 5 (C3)',
    electrodeNumber: 5,
    channelId: 'CH5',
    position1020: 'C3',
    locationLabel: 'Left Central-Temporal Arc (8:30 position)',
    proposedFunction: 'Positioned near left sensorimotor arch for mu/beta activity exploration.',
    active: true,
    simulatedQuality: 87,
    impedanceKOhm: 21.1,
  },
  E6: {
    id: 'E6',
    kind: 'electrode',
    label: 'Electrode 6 (C4)',
    electrodeNumber: 6,
    channelId: 'CH6',
    position1020: 'C4',
    locationLabel: 'Right Central-Temporal Arc (3:30 position)',
    proposedFunction: 'Positioned near right sensorimotor arch for bilateral central rhythm comparison.',
    active: true,
    simulatedQuality: 90,
    impedanceKOhm: 17.5,
  },
  E7: {
    id: 'E7',
    kind: 'electrode',
    label: 'Electrode 7 (P3)',
    electrodeNumber: 7,
    channelId: 'CH7',
    position1020: 'P3',
    locationLabel: 'Left Parietal-Occipital Arc (7 o’clock)',
    proposedFunction: 'Captures posterior parietal resting alpha band fluctuations during quiet rest.',
    active: true,
    simulatedQuality: 93,
    impedanceKOhm: 14.9,
  },
  E8: {
    id: 'E8',
    kind: 'electrode',
    label: 'Electrode 8 (P4)',
    electrodeNumber: 8,
    channelId: 'CH8',
    position1020: 'P4',
    locationLabel: 'Right Parietal-Occipital Arc (5 o’clock)',
    proposedFunction: 'Captures right parietal resting alpha rhythm for bilateral posterior baseline.',
    active: true,
    simulatedQuality: 95,
    impedanceKOhm: 13.6,
  },
  structure: {
    id: 'structure',
    kind: 'hardware',
    label: 'Circular Blue Wearable Halo Frame',
    locationLabel: '360° Contoured Cranial Chassis',
    proposedFunction: 'Ergonomic lightweight polymer ring distributing balanced gentle pressure around the cranium.',
    active: true,
    simulatedQuality: 100,
    impedanceKOhm: 0,
  },
  holders: {
    id: 'holders',
    kind: 'hardware',
    label: 'Articulated Electrode Holders (×8)',
    locationLabel: 'Radial Spring-Cushioned Mounts',
    proposedFunction: 'Maintain consistent dry-comb contact against hair and scalp without conductive gel.',
    active: true,
    simulatedQuality: 96,
    impedanceKOhm: 0,
  },
  electronics: {
    id: 'electronics',
    kind: 'hardware',
    label: '8-Channel Recording Electronics Module',
    locationLabel: 'Posterior Arc Housing (6 o’clock)',
    proposedFunction: 'Proposed low-noise analog front-end (AFE), 24-bit ADC, and shielded channel routing.',
    active: true,
    simulatedQuality: 98,
    impedanceKOhm: 0,
  },
  battery: {
    id: 'battery',
    kind: 'hardware',
    label: 'Integrated Power & Status Cell',
    locationLabel: 'Balanced Posterior Counterweight Bay',
    proposedFunction: 'Simulated rechargeable power reserve supplying regulated low-voltage rails to 8 channels.',
    active: true,
    simulatedQuality: 100,
    impedanceKOhm: 0,
  },
};

class SimulatedEegDeviceAdapter implements IEegDeviceAdapter {
  readonly isSimulatedHardware = true as const;
  readonly architectureName = 'NEUROFLOW 8-Channel Circular Dry-EEG Concept (Simulated)';

  generateFrame(
    timeSec: number,
    samplingRateHz: 250 | 500,
    profile: SimulationProfile,
    components: Record<DeviceComponentId, DeviceComponentState>,
  ): EegFramePacket {
    const samples: EegChannelSample[] = ELECTRODE_CHANNEL_IDS.map((eid, idx) => {
      const comp = components[eid];
      const active = comp?.active ?? true;

      if (!active) {
        return {
          channelId: comp?.channelId ?? `CH${idx + 1}`,
          electrodeId: eid,
          position1020: comp?.position1020 ?? eid,
          microVolts: 0,
          signalQuality: 0,
          isSimulated: true,
        };
      }

      const phaseOffset = idx * 0.78;
      // Synthetic multi-oscillator waveform for visualization only (not clinical EEG)
      let alphaAmp = 18;
      let thetaAmp = 10;
      let betaAmp = 8;
      let noiseAmp = 3.5;

      if (profile === 'resting-alpha') {
        alphaAmp = idx >= 6 ? 26 : 19; // stronger posterior alpha visualization
        thetaAmp = 7;
        betaAmp = 5;
      } else if (profile === 'cognitive-load') {
        alphaAmp = 9;
        thetaAmp = 8;
        betaAmp = idx < 4 ? 19 : 12;
      } else if (profile === 'drowsy-theta') {
        alphaAmp = 11;
        thetaAmp = 24;
        betaAmp = 4;
      } else if (profile === 'mixed-artifact') {
        alphaAmp = 15;
        thetaAmp = 14;
        betaAmp = 12;
        noiseAmp = 10;
      }

      const alpha = Math.sin(2 * Math.PI * 10.2 * timeSec + phaseOffset) * alphaAmp;
      const theta = Math.sin(2 * Math.PI * 5.8 * timeSec + phaseOffset * 1.4) * thetaAmp;
      const beta = Math.sin(2 * Math.PI * 19.5 * timeSec + phaseOffset * 0.6) * betaAmp;
      const slowDrift = Math.sin(2 * Math.PI * 0.45 * timeSec + idx) * 6;
      const pseudoNoise =
        (Math.sin(timeSec * 47.3 + idx * 9.1) + Math.cos(timeSec * 83.7 + idx * 3.7)) *
        0.5 *
        noiseAmp;

      // Occasional synthetic blink deflection on Fp1 / Fp2
      const blinkCycle = timeSec % 4.8;
      const blink =
        idx < 2 && blinkCycle > 0.1 && blinkCycle < 0.35
          ? Math.sin(((blinkCycle - 0.1) / 0.25) * Math.PI) * 38
          : 0;

      const microVolts = Number((alpha + theta + beta + slowDrift + pseudoNoise + blink).toFixed(2));

      return {
        channelId: comp?.channelId ?? `CH${idx + 1}`,
        electrodeId: eid,
        position1020: comp?.position1020 ?? eid,
        microVolts,
        signalQuality: comp?.simulatedQuality ?? 90,
        isSimulated: true,
      };
    });

    return {
      timestampMs: Date.now(),
      samplingRateHz,
      samples,
      isSimulated: true,
    };
  }
}

export const eegDeviceAdapter: IEegDeviceAdapter = new SimulatedEegDeviceAdapter();
