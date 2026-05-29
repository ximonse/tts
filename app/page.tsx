"use client";

import { useState, useRef, useEffect } from "react";

const VOICES = [
  { id: "nova", label: "Nova", description: "Varm och naturlig (rekommenderas)" },
  { id: "alloy", label: "Alloy", description: "Neutral och tydlig" },
  { id: "echo", label: "Echo", description: "Mjuk och lugn" },
  { id: "fable", label: "Fable", description: "Uttrycksfull" },
  { id: "onyx", label: "Onyx", description: "Djup och auktoritativ" },
  { id: "shimmer", label: "Shimmer", description: "Ljus och energisk" },
] as const;

type VoiceId = (typeof VOICES)[number]["id"];

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<VoiceId>("nova");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("openai_api_key");
    if (saved) setApiKey(saved);
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  async function handleGenerate() {
    if (!apiKey.trim()) {
      setError("Ange din OpenAI API-nyckel först.");
      return;
    }
    if (!text.trim()) {
      setError("Klistra in eller skriv en text först.");
      return;
    }
    localStorage.setItem("openai_api_key", apiKey.trim());
    setLoading(true);
    setError(null);

    // Revoke previous blob URL to free memory
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }
    setAudioUrl(null);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice, apiKey: apiKey.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      prevUrlRef.current = url;
      setAudioUrl(url);
      // Auto-play after a tick to let the audio element mount
      setTimeout(() => audioRef.current?.play(), 50);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  const charCount = text.length;
  const charWarning = charCount > 80_000;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Text till ljud
          </h1>
          <p className="text-slate-500">
            Klistra in en text och generera en ljudfil för dina elever
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          {/* API key */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              OpenAI API-nyckel
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 pr-12 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                {showKey ? "Dölj" : "Visa"}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Sparas lokalt i din webbläsare — skickas aldrig vidare.
            </p>
          </div>

          {/* Textarea */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Klistra in eller skriv din text här…"
              rows={10}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-slate-800 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
            />
            <p
              className={`text-xs mt-1 text-right ${
                charWarning ? "text-amber-500 font-medium" : "text-slate-400"
              }`}
            >
              {charCount.toLocaleString("sv-SE")} tecken
              {charWarning && " — nära gränsen på 100 000"}
            </p>
          </div>

          {/* Voice selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Röst
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVoice(v.id)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    voice === v.id
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className="block text-sm font-semibold">{v.label}</span>
                  <span className="block text-xs mt-0.5 opacity-70">
                    {v.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Genererar ljud…
              </span>
            ) : (
              "Generera ljud"
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
              {error}
            </div>
          )}

          {/* Audio player + download */}
          {audioUrl && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">Lyssna</p>
              <audio
                ref={audioRef}
                src={audioUrl}
                controls
                className="w-full"
              />
              <a
                href={audioUrl}
                download="ljudbok.mp3"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                  />
                </svg>
                Ladda ner MP3
              </a>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Drivs av OpenAI TTS · Texten skickas säkert till OpenAI
        </p>
      </div>
    </main>
  );
}
