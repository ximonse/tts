import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const CHUNK_LIMIT = 4000;

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = (typeof VOICES)[number];

function splitIntoChunks(text: string): string[] {
  const chunks: string[] = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= CHUNK_LIMIT) {
      chunks.push(remaining);
      break;
    }

    // Find last sentence boundary within limit
    const slice = remaining.slice(0, CHUNK_LIMIT);
    const lastBoundary = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("! "),
      slice.lastIndexOf("? "),
      slice.lastIndexOf(".\n"),
      slice.lastIndexOf("!\n"),
      slice.lastIndexOf("?\n")
    );

    const cutAt = lastBoundary > 0 ? lastBoundary + 1 : CHUNK_LIMIT;
    chunks.push(remaining.slice(0, cutAt).trim());
    remaining = remaining.slice(cutAt).trim();
  }

  return chunks.filter((c) => c.length > 0);
}

export async function POST(req: NextRequest) {
  let body: { text?: string; voice?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig JSON." }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim() || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Ingen API-nyckel angiven." },
      { status: 400 }
    );
  }

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Text saknas." }, { status: 400 });
  }
  if (text.length > 100_000) {
    return NextResponse.json(
      { error: "Texten är för lång (max 100 000 tecken)." },
      { status: 400 }
    );
  }

  const voice: Voice = VOICES.includes(body.voice as Voice)
    ? (body.voice as Voice)
    : "nova";

  const openai = new OpenAI({ apiKey });
  const chunks = splitIntoChunks(text);

  if (chunks.length === 0) {
    return NextResponse.json(
      { error: "Texten innehåller ingen meningsfull text." },
      { status: 400 }
    );
  }

  try {
    const audioBuffers = await Promise.all(
      chunks.map(async (chunk) => {
        const response = await openai.audio.speech.create({
          model: "tts-1",
          voice,
          input: chunk,
          response_format: "mp3",
        });
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      })
    );

    const combined = Buffer.concat(audioBuffers);

    return new NextResponse(combined, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'attachment; filename="ljudbok.mp3"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Okänt fel från OpenAI.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
