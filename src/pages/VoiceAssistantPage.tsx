import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react';
import {
  createSpeechRecognition,
  speakText,
  stopSpeaking,
  type SpeechRecognitionLike,
} from '../services/voiceService';

interface VoiceLogEntry {
  id: number;
  heard: string;
  response: string;
  timestamp: string;
}

interface VoiceAssistantPageProps {
  voiceFeedbackEnabled: boolean;
  reduceMotion: boolean;
  onExecuteCommand: (rawText: string) => Promise<string>;
  onToggleVoiceFeedback: (enabled: boolean) => void;
}

const SUPPORTED_COMMANDS = [
  'Open my device',
  'Connect my device',
  'Start monitoring',
  'Stop monitoring',
  'Show my EEG signals',
  'Open fatigue tracker',
  'Add a medication reminder',
  'Read my health report',
  'Show my heart rate',
  'Open emergency contacts',
  'Call my emergency contact',
];

export const VoiceAssistantPage: React.FC<VoiceAssistantPageProps> = ({
  voiceFeedbackEnabled,
  reduceMotion,
  onExecuteCommand,
  onToggleVoiceFeedback,
}) => {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [statusMessage, setStatusMessage] = useState(
    'Tap the microphone button or choose any command below.',
  );
  const [history, setHistory] = useState<VoiceLogEntry[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const rec = createSpeechRecognition();
    if (!rec) {
      setSpeechSupported(false);
    }
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const processCommandText = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setProcessing(true);
    setStatusMessage(`Processing "${trimmed}"...`);
    try {
      const response = await onExecuteCommand(trimmed);
      setStatusMessage(response);
      setHistory((prev) => [
        {
          id: Date.now(),
          heard: trimmed,
          response,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 9),
      ]);
      if (voiceFeedbackEnabled) {
        speakText(response, true);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = createSpeechRecognition();
    if (!rec) {
      setSpeechSupported(false);
      setStatusMessage(
        'Browser speech recognition is unavailable here. Use the text input or 1-tap command buttons below.',
      );
      return;
    }

    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onstart = () => {
      setListening(true);
      setStatusMessage('Listening... Speak a NEUROFLOW command now.');
    };

    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      setListening(false);
      if (transcript) {
        void processCommandText(transcript);
      }
    };

    rec.onerror = (ev) => {
      setListening(false);
      setStatusMessage(
        `Microphone error (${ev.error}). You can type or tap any command below as an accessible alternative.`,
      );
    };

    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setListening(false);
      setStatusMessage('Unable to start microphone. Please use the text command bar below.');
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const cmd = manualInput;
    setManualInput('');
    await processCommandText(cmd);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hands-Free Voice Assistant</h1>
          <p className="mt-1 text-xs text-[var(--nf-text-muted)]">
            Designed for accessibility when hand movement is limited. Supports browser voice recognition, spoken feedback (TTS), and full text-based command alternatives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (voiceFeedbackEnabled) stopSpeaking();
              onToggleVoiceFeedback(!voiceFeedbackEnabled);
            }}
            className={`flex min-h-[42px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold ${
              voiceFeedbackEnabled
                ? 'border-[#20C5D8] bg-[#20C5D8]/15 text-[#20C5D8]'
                : 'border-[var(--nf-border)] text-[var(--nf-text-muted)]'
            }`}
          >
            {voiceFeedbackEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span>Voice Feedback: {voiceFeedbackEnabled ? 'On' : 'Off'}</span>
          </button>
        </div>
      </div>

      {/* Main Microphone Stage + Quick Commands */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="flex flex-col items-center justify-center rounded-2xl border border-[#7657F6]/50 bg-[var(--nf-surface)] p-8 text-center lg:col-span-5">
          <div className="relative flex items-center justify-center">
            {listening && !reduceMotion && (
              <span className="absolute h-44 w-44 animate-ping rounded-full bg-[#20C5D8]/25" />
            )}
            <button
              type="button"
              onClick={handleToggleMic}
              className={`relative flex h-36 w-36 flex-col items-center justify-center rounded-full border-4 transition-colors focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#20C5D8] ${
                listening
                  ? 'border-[#20C5D8] bg-[#20C5D8] text-slate-950'
                  : 'border-[#7657F6]/60 bg-[#7657F6] text-white hover:bg-[#6646eb]'
              }`}
            >
              {listening ? <MicOff className="h-11 w-11" /> : <Mic className="h-11 w-11" />}
              <span className="mt-2 text-xs font-bold uppercase tracking-wider">
                {listening ? 'Listening' : processing ? 'Working' : 'Speak'}
              </span>
            </button>
          </div>

          <p className="mt-6 min-h-[40px] max-w-sm text-sm font-medium">{statusMessage}</p>

          {!speechSupported && (
            <p className="mt-2 text-xs text-[#FFB547]">
              Browser Web Speech API not detected — text and 1-tap commands are fully active.
            </p>
          )}

          {/* Text Command Fallback */}
          <form onSubmit={handleTextSubmit} className="mt-6 flex w-full gap-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder='Type a command (e.g., "Start monitoring")'
              className="min-h-[46px] flex-1 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] px-3.5 text-sm"
            />
            <button
              type="submit"
              className="flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl bg-[#20C5D8] px-4 text-sm font-semibold text-slate-950 hover:bg-[#19b0c2]"
            >
              <Send className="h-4 w-4" />
              <span>Run</span>
            </button>
          </form>
        </section>

        {/* Supported 1-Tap Voice Command Grid + Transcript */}
        <div className="space-y-6 lg:col-span-7">
          <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6">
            <h2 className="mb-3 text-base font-bold">Supported Commands (Speak or Tap)</h2>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SUPPORTED_COMMANDS.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => void processCommandText(cmd)}
                  className={`flex min-h-[46px] items-center justify-between rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                    cmd.toLowerCase().includes('emergency contact') && cmd.toLowerCase().includes('call')
                      ? 'border-[#F05263]/50 bg-[#F05263]/10 text-[#F05263] hover:bg-[#F05263]/20'
                      : 'border-[var(--nf-border)] bg-[var(--nf-surface-alt)] hover:border-[#7657F6]'
                  }`}
                >
                  <span>“{cmd}”</span>
                  <Mic className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6">
            <h2 className="mb-3 text-base font-bold">Assistant Command Log</h2>
            {history.length === 0 ? (
              <p className="text-sm text-[var(--nf-text-muted)]">
                No commands run yet in this session.
              </p>
            ) : (
              <div className="max-h-[220px] space-y-2.5 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface-alt)] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between text-[var(--nf-text-muted)]">
                      <span className="font-semibold text-[#20C5D8]">Command: “{item.heard}”</span>
                      <span className="font-mono-tabular">{item.timestamp}</span>
                    </div>
                    <p className="mt-1 text-sm">{item.response}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
