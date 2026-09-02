// Serverless proxy for the caged narrative model (T6; spec §Stack "one serverless function
// proxies the LLM (key server-side)").
//
// This is the production wiring of the NarrativeGenerator seam. It runs server-side ONLY: the
// Gemini key lives in process.env.GEMINI_API_KEY and is never shipped to the browser. The client
// POSTs the citizen's facts; this route calls Gemini via plain REST fetch (no SDK dependency),
// under the caged prompt (@/engine/narrative), and returns { narrative }.
//
// Caging is enforced upstream by the prompt (the model writes only the English facts paragraph and
// nothing legal). If the key is missing or Gemini errors, this route fails with a clear JSON error
// and a matching status so the UI can fall back to a plain templated narrative — it must never
// wedge the whole flow on a narrative hiccup.

import { NextResponse } from "next/server";
import { buildNarrativePrompt } from "@/engine/narrative";
import type { NarrativeInput } from "@/engine/narrative";

// Node runtime (default): we read a server-only env var and make an outbound fetch.
export const runtime = "nodejs";
// Never cache a generated narrative — it is per-request and store-nothing.
export const dynamic = "force-dynamic";

/** Current fast, cheap model. One-line swap point when a newer flash model ships. */
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    // Configuration problem, not the user's fault. UI falls back to a templated narrative.
    return NextResponse.json(
      { error: "narrative_unavailable", detail: "GEMINI_API_KEY is not configured on the server." },
      { status: 503 }
    );
  }

  let input: NarrativeInput;
  try {
    input = (await req.json()) as NarrativeInput;
  } catch {
    return NextResponse.json(
      { error: "bad_request", detail: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const { system, user } = buildNarrativePrompt(input);

  const body = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      // Low temperature: the facts paragraph should be faithful, not creative.
      temperature: 0.2,
      maxOutputTokens: 400,
    },
  };

  let res: Response;
  try {
    res = await fetch(GEMINI_ENDPOINT(GEMINI_MODEL, apiKey), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "upstream_unreachable",
        detail: err instanceof Error ? err.message : "Failed to reach the narrative provider.",
      },
      { status: 502 }
    );
  }

  if (!res.ok) {
    // Do not leak the key or the full upstream payload; a short status is enough for the UI to fall back.
    return NextResponse.json(
      { error: "upstream_error", detail: `Narrative provider returned ${res.status}.` },
      { status: 502 }
    );
  }

  let data: GeminiResponse;
  try {
    data = (await res.json()) as GeminiResponse;
  } catch {
    return NextResponse.json(
      { error: "upstream_error", detail: "Narrative provider returned a malformed response." },
      { status: 502 }
    );
  }

  const blockReason = data.promptFeedback?.blockReason;
  if (blockReason) {
    return NextResponse.json(
      { error: "narrative_blocked", detail: `Content was blocked upstream (${blockReason}).` },
      { status: 502 }
    );
  }

  const narrative = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();

  if (narrative.length === 0) {
    return NextResponse.json(
      { error: "empty_narrative", detail: "Narrative provider returned no text." },
      { status: 502 }
    );
  }

  return NextResponse.json({ narrative });
}
