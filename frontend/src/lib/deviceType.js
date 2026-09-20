// Screen detection, mirroring backend/device_types.py.
// "Soundbox None LED Screen (4G only)" is a no-screen product, so negations win over the screen words.

const NO_SCREEN_WORDS = ['none led', 'no led', 'non led', 'non-led', 'nled', 'without screen', 'no screen', 'none screen'];
const SCREEN_WORDS = ['display', 'lcd', 'screen', 'disp'];

/** True when the device type / model describes a soundbox with an LED screen. */
export function hasScreen(...texts) {
  const blob = texts.filter(Boolean).join(' ').toLowerCase();
  if (!blob) return false;
  if (NO_SCREEN_WORDS.some((w) => blob.includes(w))) return false;
  return SCREEN_WORDS.some((w) => blob.includes(w));
}
