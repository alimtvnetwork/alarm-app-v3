/**
 * AlarmAudio — Plays alarm sounds using Web Audio API oscillators.
 * Supports gradual volume ramp-up and looping until stopped.
 */

type SoundGenerator = (ctx: AudioContext, gain: GainNode) => OscillatorNode[];

const BEEP_INTERVAL_MS = 800;
const BEEP_DURATION_MS = 300;
const CLASSIC_BEEP_FREQ = 880;
const CHIME_FREQ = 523.25;
const BIRD_BASE_FREQ = 1200;
const BIRD_LFO_FREQ = 6;
const BIRD_LFO_DEPTH = 300;
const PULSE_FREQ = 440;
const DEFAULT_VOLUME = 0.8;
const GRADUAL_START_VOLUME = 0.01;

function classicBeep(ctx: AudioContext, gain: GainNode): OscillatorNode[] {
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.value = CLASSIC_BEEP_FREQ;
  osc.connect(gain);
  return [osc];
}

function gentleChime(ctx: AudioContext, gain: GainNode): OscillatorNode[] {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = CHIME_FREQ;
  osc.connect(gain);
  return [osc];
}

function natureBirds(ctx: AudioContext, gain: GainNode): OscillatorNode[] {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = BIRD_BASE_FREQ;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = BIRD_LFO_FREQ;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = BIRD_LFO_DEPTH;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(gain);
  lfo.start();
  return [osc, lfo];
}

function digitalPulse(ctx: AudioContext, gain: GainNode): OscillatorNode[] {
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = PULSE_FREQ;
  osc.connect(gain);
  return [osc];
}

const SOUND_MAP: Record<string, SoundGenerator> = {
  "classic-beep": classicBeep,
  "gentle-chime": gentleChime,
  "nature-birds": natureBirds,
  "digital-pulse": digitalPulse,
};

interface AlarmAudioHandle {
  stop: () => void;
}

export function playAlarmSound(
  soundFile: string,
  isGradualVolume: boolean,
  gradualDurationSec: number,
): AlarmAudioHandle {
  const ctx = new AudioContext();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);

  const startVolume = isGradualVolume ? GRADUAL_START_VOLUME : DEFAULT_VOLUME;
  const endVolume = DEFAULT_VOLUME;
  masterGain.gain.value = startVolume;

  if (isGradualVolume) {
    masterGain.gain.linearRampToValueAtTime(
      endVolume,
      ctx.currentTime + gradualDurationSec,
    );
  }

  const generator = SOUND_MAP[soundFile] ?? SOUND_MAP["classic-beep"];
  let oscillators: OscillatorNode[] = [];
  let isPlaying = true;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const playBurst = () => {
    if (!isPlaying) return;

    oscillators = generator(ctx, masterGain);
    oscillators.forEach((osc) => osc.start());

    setTimeout(() => {
      oscillators.forEach((osc) => {
        try { osc.stop(); } catch { /* already stopped */ }
      });
    }, BEEP_DURATION_MS);

    timeoutId = setTimeout(playBurst, BEEP_INTERVAL_MS);
  };

  playBurst();

  return {
    stop: () => {
      isPlaying = false;
      if (timeoutId) clearTimeout(timeoutId);
      oscillators.forEach((osc) => {
        try { osc.stop(); } catch { /* already stopped */ }
      });
      ctx.close();
    },
  };
}