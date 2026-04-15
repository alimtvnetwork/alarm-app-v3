/**
 * AmbientPlayer — Play ambient sounds with a sleep timer.
 * Uses Web Audio API with oscillator-based sound generation.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Headphones, Play, Square, Timer } from "lucide-react";

interface AmbientSound {
  id: string;
  labelKey: string;
  emoji: string;
  generate: (ctx: AudioContext) => AudioNode;
}

function createNoiseSource(ctx: AudioContext, type: "white" | "pink" | "brown"): AudioNode {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    if (type === "white") {
      data[i] = white * 0.3;
    } else if (type === "pink") {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
      b6 = white * 0.115926;
    } else {
      b0 = (b0 + (0.02 * white)) / 1.02;
      data[i] = b0 * 2.5;
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  return source;
}

const SOUNDS: AmbientSound[] = [
  {
    id: "white-noise",
    labelKey: "ambient.whiteNoise",
    emoji: "🌫️",
    generate: (ctx) => createNoiseSource(ctx, "white"),
  },
  {
    id: "rain",
    labelKey: "ambient.rain",
    emoji: "🌧️",
    generate: (ctx) => createNoiseSource(ctx, "pink"),
  },
  {
    id: "ocean",
    labelKey: "ambient.ocean",
    emoji: "🌊",
    generate: (ctx) => createNoiseSource(ctx, "brown"),
  },
  {
    id: "forest",
    labelKey: "ambient.forest",
    emoji: "🌲",
    generate: (ctx) => {
      // Brown noise with slight filter for forest ambience
      const source = createNoiseSource(ctx, "brown") as AudioBufferSourceNode;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 800;
      source.connect(filter);
      source.start();
      return filter;
    },
  },
];

const TIMER_OPTIONS = [
  { value: "0", labelKey: "ambient.noTimer" },
  { value: "15", labelKey: "ambient.min15" },
  { value: "30", labelKey: "ambient.min30" },
  { value: "60", labelKey: "ambient.min60" },
  { value: "90", labelKey: "ambient.min90" },
];

const AmbientPlayer = () => {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState("rain");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [timerMin, setTimerMin] = useState("0");
  const [remaining, setRemaining] = useState<number | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (sourceRef.current && "stop" in sourceRef.current) {
      (sourceRef.current as AudioBufferSourceNode).stop();
    }
    ctxRef.current?.close();
    ctxRef.current = null;
    sourceRef.current = null;
    gainRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsPlaying(false);
    setRemaining(null);
  }, []);

  const play = useCallback(() => {
    stop();
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = volume / 100;
    gain.connect(ctx.destination);

    const sound = SOUNDS.find((s) => s.id === selectedId);
    if (!sound) return;

    const node = sound.generate(ctx);
    node.connect(gain);
    if ("start" in node) {
      (node as AudioBufferSourceNode).start();
    }

    ctxRef.current = ctx;
    sourceRef.current = node;
    gainRef.current = gain;
    setIsPlaying(true);

    const mins = parseInt(timerMin);
    if (mins > 0) {
      let secs = mins * 60;
      setRemaining(secs);
      timerRef.current = setInterval(() => {
        secs -= 1;
        if (secs <= 0) {
          stop();
        } else {
          setRemaining(secs);
        }
      }, 1000);
    }
  }, [selectedId, volume, timerMin, stop]);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume / 100;
    }
  }, [volume]);

  useEffect(() => stop, [stop]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-heading">
          <Headphones className="h-4 w-4 text-primary" />
          {t("ambient.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {/* Sound selector */}
        <div className="grid grid-cols-4 gap-2">
          {SOUNDS.map((sound) => (
            <button
              key={sound.id}
              onClick={() => { setSelectedId(sound.id); if (isPlaying) { stop(); } }}
              className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-colors ${
                selectedId === sound.id
                  ? "bg-primary/15 ring-1 ring-primary"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              <span className="text-lg">{sound.emoji}</span>
              <span className="text-[10px] font-body text-muted-foreground">
                {t(sound.labelKey)}
              </span>
            </button>
          ))}
        </div>

        {/* Volume */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-body">
            <span>{t("ambient.volume")}</span>
            <span>{volume}%</span>
          </div>
          <Slider
            value={[volume]}
            onValueChange={([v]) => setVolume(v)}
            min={5}
            max={100}
            step={5}
          />
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <Select value={timerMin} onValueChange={setTimerMin}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Play/Stop + remaining */}
        <div className="flex items-center gap-3">
          <Button
            onClick={isPlaying ? stop : play}
            className="flex-1 gap-2"
            variant={isPlaying ? "destructive" : "default"}
          >
            {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? t("ambient.stop") : t("ambient.play")}
          </Button>
          {remaining !== null && (
            <span className="text-xs font-body text-muted-foreground">
              {formatTime(remaining)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AmbientPlayer;
