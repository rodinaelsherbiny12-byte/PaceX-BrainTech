# NEUROFLOW

Interactive 3D Neurotechnology Research Prototype supporting Multiple Sclerosis (MS) personalized fatigue exploration, featuring an interactive 360-degree 8-channel wearable EEG head device concept, simulated EEG visualization, health monitoring, fatigue tracker, medication reminders, hands-free voice assistant, and emergency SOS simulation.

## Important Scientific & Prototype Disclosures

- **Simulated Hardware**: No physical EEG hardware is paired. All EEG signals, electrode impedance/quality metrics, device connection states, and battery levels are **simulated**.
- **External Vitals Provenance**: Heart rate and blood pressure readings are **manually entered** by the user or clearly labeled **demonstration samples**, never presented as measurements from the EEG head device.
- **Not a Medical Device**: NEUROFLOW does not provide medical diagnoses, clinical predictions, or treatment/dosage recommendations.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Three.js (360° interactive 3D wearable model), Recharts, Lucide Icons
- **Backend**: Node.js, Express, SQLite (`better-sqlite3`)
- **Voice & Accessibility**: Web Speech API (`SpeechRecognition` + `speechSynthesis`) with full text-command fallback, Patient Mode, adjustable text scaling, reduced motion, and multi-language UI

## Running Locally

```bash
npm install
npm run dev
```

The application and API server run on `http://localhost:3000`.

### Production Build

```bash
npm run build
npm run start
```
