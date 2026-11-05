/**
 * Web Speech API utility for NIMBO — Natural Feminine Voice Synthesis & Text-to-Speech
 */

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

// Preload voices as soon as browser announces availability
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

/**
 * Finds the most natural, expressive feminine Spanish voice available on this device.
 */
export function getBestFeminineSpanishVoice(): SpeechSynthesisVoice | null {
  const voices = cachedVoices.length > 0 ? cachedVoices : loadVoices();
  if (!voices || voices.length === 0) return null;

  // Tier 1: Premium Neural / Natural feminine Spanish voices
  const tier1 = voices.find(
    (v) =>
      v.lang.startsWith('es') &&
      /dalia|salma|paulina.*enhanced|m[oó]nica.*enhanced/i.test(v.name)
  );
  if (tier1) return tier1;

  // Tier 2: Apple / Google / Microsoft recognized feminine Spanish voices
  const tier2 = voices.find(
    (v) =>
      v.lang.startsWith('es') &&
      /paulina|m[oó]nica|monica|sof[ií]a|sofia|sabina|elena|laura|luciana|google espa[ñn]ol/i.test(v.name)
  );
  if (tier2) return tier2;

  // Tier 3: Any voice marked as female in Spanish
  const tier3 = voices.find(
    (v) => v.lang.startsWith('es') && /female|mujer/i.test(v.name)
  );
  if (tier3) return tier3;

  // Tier 4: Preferred Mexican Spanish (es-MX)
  const tier4 = voices.find((v) => v.lang === 'es-MX' || v.lang.startsWith('es-MX'));
  if (tier4) return tier4;

  // Tier 5: Preferred Latin American Spanish (es-US, es-419)
  const tier5 = voices.find(
    (v) => v.lang.startsWith('es-US') || v.lang.startsWith('es-419')
  );
  if (tier5) return tier5;

  // Tier 6: Any Spanish voice
  const tier6 = voices.find((v) => v.lang.startsWith('es'));
  if (tier6) return tier6;

  return null;
}

/**
 * Cleans markdown, emojis, asterisks and code formatting so the voice sounds 100% natural.
 */
export function cleanTextForSpeech(raw: string): string {
  return raw
    // Remove emojis
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    // Replace markdown links [title](url) -> title
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove markdown symbols: asterisks, hashes, backticks, underscores, tildes
    .replace(/[*_#`~>]/g, ' ')
    // Replace bullet points with pause
    .replace(/^\s*[•\-–]\s*/gm, ' ')
    // Expand 10am / 4pm
    .replace(/\b(\d{1,2})am\b/gi, '$1 de la mañana')
    .replace(/\b(\d{1,2})pm\b/gi, '$1 de la tarde')
    // Clean multiple whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Speaks text using Nimbo's sweet, warm, feminine voice.
 */
export function speakText(
  text: string,
  options?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this environment');
    return;
  }

  try {
    // Cancel any previous speech immediately
    window.speechSynthesis.cancel();

    const clean = cleanTextForSpeech(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'es-MX';
    
    // Natural, warm, feminine acoustic tuning
    utterance.pitch = 1.15; // Slightly higher, friendly feminine warmth
    utterance.rate = 1.02;  // Fluid, natural speaking cadence
    utterance.volume = 1.0;

    const bestVoice = getBestFeminineSpanishVoice();
    if (bestVoice) {
      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
    }

    if (options?.onStart) utterance.onstart = options.onStart;
    if (options?.onEnd) utterance.onend = options.onEnd;
    if (options?.onError) utterance.onerror = options.onError;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    if (options?.onError) options.onError(err);
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

export function speakReminderAlert(title: string, stage: '1_day' | '1_hour' | '10_min' | 'exact'): void {
  let phrase = '';
  switch (stage) {
    case '1_day':
      phrase = `¡Hola! Recuerda que mañana tienes programado: ${title}.`;
      break;
    case '1_hour':
      phrase = `Atención, falta una hora para tu actividad: ${title}.`;
      break;
    case '10_min':
      phrase = `Prepárate, faltan diez minutos para: ${title}.`;
      break;
    case 'exact':
    default:
      phrase = `Es momento de tu actividad: ${title}. ¡Mucho éxito!`;
      break;
  }

  speakText(phrase);
}
