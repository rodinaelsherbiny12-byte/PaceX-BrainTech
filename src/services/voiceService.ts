export function speakText(text: string, enabled = true, lang = 'en-US'): void {
  if (!enabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.98;
    utter.pitch = 1.0;
    window.speechSynthesis.speak(utter);
  } catch {
    // Graceful no-op if speech synthesis is blocked
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function createSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

export type VoiceActionType =
  | 'open_device'
  | 'connect_device'
  | 'start_monitoring'
  | 'stop_monitoring'
  | 'show_eeg'
  | 'open_fatigue'
  | 'add_medication'
  | 'read_report'
  | 'show_heart_rate'
  | 'open_contacts'
  | 'call_emergency'
  | 'unknown';

export interface ParsedVoiceIntent {
  action: VoiceActionType;
  normalizedText: string;
  responseText: string;
}

export function parseVoiceCommand(rawInput: string): ParsedVoiceIntent {
  const q = rawInput.trim().toLowerCase();

  if (q.includes('emergency contact') && (q.includes('call') || q.includes('dial') || q.includes('sos'))) {
    return {
      action: 'call_emergency',
      normalizedText: rawInput,
      responseText:
        'Opening Emergency SOS confirmation. Please confirm before simulating an alert to your primary contact.',
    };
  }
  if (q.includes('emergency') || q.includes('contacts') || q.includes('sos')) {
    return {
      action: 'open_contacts',
      normalizedText: rawInput,
      responseText: 'Opening your Emergency SOS and trusted contacts panel.',
    };
  }
  if (q.includes('connect') && q.includes('device')) {
    return {
      action: 'connect_device',
      normalizedText: rawInput,
      responseText: 'Connecting to your simulated NEUROFLOW wearable EEG head device.',
    };
  }
  if (q.includes('open') && q.includes('device')) {
    return {
      action: 'open_device',
      normalizedText: rawInput,
      responseText: 'Opening the 3D Wearable Device Controller.',
    };
  }
  if (q.includes('start') && (q.includes('monitor') || q.includes('eeg') || q.includes('record'))) {
    return {
      action: 'start_monitoring',
      normalizedText: rawInput,
      responseText: 'Starting simulated 8-channel EEG monitoring.',
    };
  }
  if (q.includes('stop') && (q.includes('monitor') || q.includes('eeg') || q.includes('record'))) {
    return {
      action: 'stop_monitoring',
      normalizedText: rawInput,
      responseText: 'Stopping simulated EEG monitoring.',
    };
  }
  if (q.includes('eeg') || q.includes('signal') || q.includes('brain')) {
    return {
      action: 'show_eeg',
      normalizedText: rawInput,
      responseText: 'Opening the 8-channel simulated EEG brain signal monitor.',
    };
  }
  if (q.includes('fatigue')) {
    return {
      action: 'open_fatigue',
      normalizedText: rawInput,
      responseText: 'Opening the Personalized Fatigue Tracker.',
    };
  }
  if (q.includes('medication') || q.includes('reminder') || q.includes('injection') || q.includes('pill')) {
    return {
      action: 'add_medication',
      normalizedText: rawInput,
      responseText: 'Opening Medication and Injection Reminders so you can add or review schedules.',
    };
  }
  if (q.includes('report') || q.includes('summary')) {
    return {
      action: 'read_report',
      normalizedText: rawInput,
      responseText: 'Opening Health Reports and reading your latest summary aloud.',
    };
  }
  if (q.includes('heart') || q.includes('blood pressure') || q.includes('health')) {
    return {
      action: 'show_heart_rate',
      normalizedText: rawInput,
      responseText: 'Opening Health Monitoring to display your manually entered and demo heart rate records.',
    };
  }

  return {
    action: 'unknown',
    normalizedText: rawInput,
    responseText:
      'Command not recognized. Try saying "Open my device", "Start monitoring", "Show my EEG signals", "Open fatigue tracker", or "Open emergency contacts".',
  };
}
