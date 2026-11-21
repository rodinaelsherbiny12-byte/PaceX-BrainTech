import type { LanguageCode } from '../types';

export interface UiStrings {
  nav: {
    home: string;
    device: string;
    eeg: string;
    health: string;
    fatigue: string;
    medications: string;
    sos: string;
    voice: string;
    reports: string;
    settings: string;
  };
  demoBanner: string;
  patientModeLabel: string;
  voiceShortcut: string;
  sosShortcut: string;
  welcome: string;
  researchDisclaimer: string;
}

export const TRANSLATIONS: Record<LanguageCode, UiStrings> = {
  en: {
    nav: {
      home: 'Dashboard',
      device: '3D Device',
      eeg: 'EEG Signals',
      health: 'Health Monitor',
      fatigue: 'Fatigue Tracker',
      medications: 'Medications',
      sos: 'Emergency SOS',
      voice: 'Voice Assistant',
      reports: 'Health Reports',
      settings: 'Profile & Settings',
    },
    demoBanner: 'RESEARCH PROTOTYPE · SIMULATED DATA MODE',
    patientModeLabel: 'Patient Mode',
    voiceShortcut: 'Voice',
    sosShortcut: 'SOS',
    welcome: 'Welcome back',
    researchDisclaimer:
      'NEUROFLOW is a research demonstration prototype for Multiple Sclerosis fatigue exploration. All EEG, device connection, and battery metrics are simulated. Do not use for medical diagnosis or treatment decisions.',
  },
  de: {
    nav: {
      home: 'Übersicht',
      device: '3D-Gerät',
      eeg: 'EEG-Signale',
      health: 'Gesundheit',
      fatigue: 'Erschöpfung',
      medications: 'Medikamente',
      sos: 'Notfall-SOS',
      voice: 'Sprachassistent',
      reports: 'Berichte',
      settings: 'Profil & Einstellungen',
    },
    demoBanner: 'FORSCHUNGSPROTOTYP · SIMULIERTE DATEN',
    patientModeLabel: 'Patientenmodus',
    voiceShortcut: 'Sprache',
    sosShortcut: 'SOS',
    welcome: 'Willkommen zurück',
    researchDisclaimer:
      'NEUROFLOW ist ein Forschungsprototyp zur Erforschung von Fatigue bei Multipler Sklerose. Alle EEG-, Verbindungs- und Batteriedaten sind simuliert.',
  },
  es: {
    nav: {
      home: 'Panel Principal',
      device: 'Dispositivo 3D',
      eeg: 'Señales EEG',
      health: 'Salud',
      fatigue: 'Fatiga',
      medications: 'Medicación',
      sos: 'SOS Emergencia',
      voice: 'Asistente Voz',
      reports: 'Informes',
      settings: 'Perfil y Ajustes',
    },
    demoBanner: 'PROTOTIPO DE INVESTIGACIÓN · DATOS SIMULADOS',
    patientModeLabel: 'Modo Paciente',
    voiceShortcut: 'Voz',
    sosShortcut: 'SOS',
    welcome: 'Bienvenido de nuevo',
    researchDisclaimer:
      'NEUROFLOW es un prototipo de investigación para explorar la fatiga en Esclerosis Múltiple. Todos los datos de EEG y dispositivo son simulados.',
  },
  fr: {
    nav: {
      home: 'Tableau de bord',
      device: 'Appareil 3D',
      eeg: 'Signaux EEG',
      health: 'Santé',
      fatigue: 'Fatigue',
      medications: 'Médicaments',
      sos: 'Urgence SOS',
      voice: 'Assistant Vocal',
      reports: 'Rapports',
      settings: 'Profil & Paramètres',
    },
    demoBanner: 'PROTOTYPE DE RECHERCHE · DONNÉES SIMULÉES',
    patientModeLabel: 'Mode Patient',
    voiceShortcut: 'Voix',
    sosShortcut: 'SOS',
    welcome: 'Bon retour',
    researchDisclaimer:
      'NEUROFLOW est un prototype de recherche sur la fatigue liée à la sclérose en plaques. Toutes les données EEG et matérielles sont simulées.',
  },
  ar: {
    nav: {
      home: 'لوحة التحكم',
      device: 'الجهاز ثلاثي الأبعاد',
      eeg: 'إشارات EEG',
      health: 'مراقبة الصحة',
      fatigue: 'متابعة الإرهاق',
      medications: 'الأدوية',
      sos: 'طوارئ SOS',
      voice: 'المساعد الصوتي',
      reports: 'التقارير الصحية',
      settings: 'الملف والإعدادات',
    },
    demoBanner: 'نموذج بحثي · بيانات محاكاة للعرض',
    patientModeLabel: 'وضع المريض',
    voiceShortcut: 'صوت',
    sosShortcut: 'طوارئ',
    welcome: 'مرحباً بعودتك',
    researchDisclaimer:
      'NEUROFLOW هو نموذج بحثي أولي لمتابعة الإرهاق لدى مرضى التصلب المتعدد. جميع إشارات EEG وحالة الجهاز هي محاكاة وليست قياسات طبية فعلية.',
  },
};
