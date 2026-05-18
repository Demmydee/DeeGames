export class VoiceAnnouncementService {
  private static isInitialized = false;
  private static enabled = true;

  static initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    
    const saved = localStorage.getItem('game_announcements_enabled');
    if (saved !== null) {
      this.enabled = saved === 'true';
    }
  }

  static setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('game_announcements_enabled', String(enabled));
  }

  static isEnabled() {
    this.initialize();
    return this.enabled;
  }

  static announce(text: string) {
    this.initialize();
    if (!this.enabled || !text) return;

    if (!window.speechSynthesis) {
       console.warn('Speech synthesis not supported');
       return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Optional: pick a specific voice if needed
    // const voices = window.speechSynthesis.getVoices();
    // utterance.voice = voices.find(v => v.lang.startsWith('en')) || null;

    window.speechSynthesis.speak(utterance);
  }
}
