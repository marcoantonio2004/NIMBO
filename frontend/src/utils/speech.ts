/**
 * Web Speech API utility for Spanish voice narration of reminder alerts.
 */

export function speakText(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported in this environment');
    return;
  }

  try {
    // Cancel any previous speech to avoid overlapping
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-MX';
    utterance.rate = 0.95; // Natural, clear speaking rate
    utterance.pitch = 1.0;

    // Pick best available Spanish voice
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(
      (v) => v.lang.startsWith('es-MX') || v.lang.startsWith('es-') || v.lang.includes('Spanish')
    );
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

export function speakReminderAlert(title: string, stage: '1_day' | '1_hour' | '10_min' | 'exact'): void {
  let phrase = '';
  switch (stage) {
    case '1_day':
      phrase = `Atención. Falta un día para tu evento: ${title}.`;
      break;
    case '1_hour':
      phrase = `Atención. Falta una hora para: ${title}.`;
      break;
    case '10_min':
      phrase = `Atención. Faltan diez minutos para: ${title}.`;
      break;
    case 'exact':
    default:
      phrase = `Es momento de tu actividad: ${title}.`;
      break;
  }

  speakText(phrase);
}
