/**
 * Download Notification System for Heavy/Large Processing Tasks (50MB+)
 * Allows users to switch tabs or minimize the application while waiting for downloads to finish.
 * Features:
 * - Native Browser Web Notification API with click-to-focus
 * - Web Audio API synthesized high-fidelity completion bell chime
 * - Dynamic Document Title Flashing when tab is hidden/minimized
 * - Safe iframe compatibility and permission fallbacks
 */

let originalDocumentTitle = typeof document !== 'undefined' ? document.title : '';
let titleFlashTimer: ReturnType<typeof setInterval> | null = null;

// Clean Notification Icon SVG Data URI (Download & Film badge)
const NOTIFICATION_ICON_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="%2310b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

/**
 * Checks if Notification API is supported in the current environment
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Returns the current notification permission ('granted', 'denied', or 'default')
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  try {
    return Notification.permission;
  } catch {
    return 'denied';
  }
}

/**
 * Requests browser notification permission safely
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.warn('Notification permission request failed (e.g., iframe security restrictions):', err);
    return 'denied';
  }
}

export type DownloadSoundStyle = 'chime' | 'success' | 'bell';

/**
 * Plays a pleasant completion chime or sound effect using the Web Audio API
 */
export function playNotificationChime(style: DownloadSoundStyle = 'chime'): void {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    if (style === 'success') {
      // 4-Note Upbeat Triad: C5 -> E5 -> G5 -> C6
      const notes = [
        { freq: 523.25, time: 0, dur: 0.22, gain: 0.16, type: 'sine' as OscillatorType },
        { freq: 659.25, time: 0.09, dur: 0.25, gain: 0.18, type: 'sine' as OscillatorType },
        { freq: 783.99, time: 0.18, dur: 0.32, gain: 0.20, type: 'sine' as OscillatorType },
        { freq: 1046.50, time: 0.28, dur: 0.70, gain: 0.24, type: 'triangle' as OscillatorType }
      ];

      notes.forEach(({ freq, time, dur, gain, type }) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now + time);
        g.gain.setValueAtTime(gain, now + time);
        g.gain.exponentialRampToValueAtTime(0.0001, now + time + dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } else if (style === 'bell') {
      // Warm Resonant Acoustic Bell: F5 + C6 dual ring
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(698.46, now);
      gain1.gain.setValueAtTime(0.22, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.9);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1046.50, now);
      gain2.gain.setValueAtTime(0.15, now);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.7);
    } else {
      // Default: Shimmering 3-note Crystal Chime: E5 -> B5 -> E6
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.12);
      gain2.gain.setValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);

      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1318.51, now + 0.24);
      gain3.gain.setValueAtTime(0.22, now + 0.24);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.85);
    }
  } catch (e) {
    // AudioContext blocked by browser policy without user gesture
  }
}

/**
 * Triggers completion sound effect if sound is enabled by the user in Settings
 */
export function playDownloadCompleteSound(options?: {
  enabled?: boolean;
  style?: DownloadSoundStyle;
}): void {
  if (options?.enabled === false) return;
  playNotificationChime(options?.style || 'chime');
}

/**
 * Starts flashing the document title if the tab is hidden or minimized
 */
export function startTabTitleAlert(alertText: string): void {
  if (typeof document === 'undefined') return;

  // Save current title if not saved
  if (!originalDocumentTitle) {
    originalDocumentTitle = document.title;
  }

  stopTabTitleAlert();

  let state = false;
  titleFlashTimer = setInterval(() => {
    document.title = state ? `🔔 ${alertText}` : originalDocumentTitle;
    state = !state;
  }, 1200);

  // Setup auto-clear when window gains focus
  const clearOnFocus = () => {
    stopTabTitleAlert();
    window.removeEventListener('focus', clearOnFocus);
    document.removeEventListener('visibilitychange', handleVisibility);
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      clearOnFocus();
    }
  };

  window.addEventListener('focus', clearOnFocus);
  document.addEventListener('visibilitychange', handleVisibility);
}

/**
 * Stops flashing document title and restores original title
 */
export function stopTabTitleAlert(): void {
  if (titleFlashTimer) {
    clearInterval(titleFlashTimer);
    titleFlashTimer = null;
  }
  if (originalDocumentTitle && typeof document !== 'undefined') {
    document.title = originalDocumentTitle;
  }
}

export interface DownloadNotificationOptions {
  title: string;
  filename: string;
  fileSizeBytes: number;
  format?: string;
  quality?: string;
  isKm?: boolean;
  minSizeMB?: number; // default 50
  enabled?: boolean;
  playSound?: boolean;
  soundStyle?: DownloadSoundStyle;
  onlyWhenHidden?: boolean;
}

/**
 * Evaluates and triggers a browser notification when a large video finishes downloading
 */
export function notifyLargeDownloadComplete(options: DownloadNotificationOptions): boolean {
  const {
    title,
    filename,
    fileSizeBytes,
    format = 'mp4',
    quality = '1080p',
    isKm = false,
    minSizeMB = 50,
    enabled = true,
    playSound = true,
    soundStyle = 'chime',
    onlyWhenHidden = false
  } = options;

  if (!enabled) return false;

  const sizeMB = fileSizeBytes / (1024 * 1024);
  const isLargeVideo = sizeMB >= minSizeMB;

  // If file is below the minimum threshold (e.g. < 50MB), skip heavy notification
  if (!isLargeVideo) return false;

  const isTabHidden = typeof document !== 'undefined' && document.hidden;
  if (onlyWhenHidden && !isTabHidden) return false;

  const formattedSize = `${sizeMB.toFixed(1)} MB`;
  const notificationTitle = isKm
    ? `🎬 ទាញយកវីដេអូធំរួចរាល់ (${formattedSize})!`
    : `🎬 Large Video Download Complete (${formattedSize})!`;

  const notificationBody = isKm
    ? `ឯកសារ "${filename || title}" [${quality.toUpperCase()}] ត្រូវបានទាញយកចប់ ១០០%។ ចុចដើម្បីត្រឡប់មកកម្មវិធី។`
    : `File "${filename || title}" [${quality.toUpperCase()}] is 100% ready. Click to switch back.`;

  // 1. Play auditory chime
  if (playSound) {
    playNotificationChime(soundStyle);
  }

  // 2. Alert tab title if minimized/in background
  if (isTabHidden) {
    startTabTitleAlert(`(${formattedSize}) ${isKm ? 'ទាញយកចប់!' : 'Download Complete!'}`);
  }

  // 3. Dispatch native browser notification
  if (isNotificationSupported() && getNotificationPermission() === 'granted') {
    try {
      const notif = new Notification(notificationTitle, {
        body: notificationBody,
        icon: NOTIFICATION_ICON_SVG,
        badge: NOTIFICATION_ICON_SVG,
        tag: `download-${Date.now()}`,
        requireInteraction: false
      });

      notif.onclick = () => {
        try {
          window.focus();
        } catch {}
        try {
          if (window.parent && window.parent !== window) {
            window.parent.focus();
          }
        } catch {}
        stopTabTitleAlert();
        notif.close();
      };

      // Auto close after 10s
      setTimeout(() => notif.close(), 10000);
      return true;
    } catch (err) {
      console.warn('Native notification instantiation error (iframe sandbox):', err);
    }
  }

  return true;
}

/**
 * Triggers an instant sample notification for users to test their browser and audio setup
 */
export async function testDownloadNotification(
  isKm = false,
  playSound = true,
  soundStyle: DownloadSoundStyle = 'chime'
): Promise<'granted' | 'denied' | 'default'> {
  let perm = getNotificationPermission();

  if (perm === 'default') {
    perm = await requestNotificationPermission();
  }

  notifyLargeDownloadComplete({
    title: isKm ? 'តេស្តការជូនដំណឹង (Test 50MB+)' : 'Test Download Alert (50MB+)',
    filename: 'Test_Large_Drama_1080p_68MB.mp4',
    fileSizeBytes: 68 * 1024 * 1024,
    format: 'mp4',
    quality: '1080p',
    isKm,
    minSizeMB: 50,
    enabled: true,
    playSound,
    soundStyle,
    onlyWhenHidden: false
  });

  return perm;
}
