// Shared Shadowing TTS synthesis logic, used by both server.mjs (local
// dev router) and api/shadowing/tts.js (the real Vercel function) — mirrors
// the server-reading.mjs/server-words.mjs split so the two environments
// can never drift out of sync again (SprakLab-Audit-Report.md §4.1; the
// duplication this replaces is also why the §3.2 auth/length-cap fix had
// to be written twice before this refactor).
//
// Callers do their own request parsing and bearer-token auth extraction
// (that part stays per-environment, same as every other api/*.js file) and
// pass in the already-resolved user/client; this module only knows about
// the actual synthesis + shadowing_items bookkeeping.

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY || process.env.SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || process.env.SPEECH_REGION;
const AZURE_SPEECH_VOICE = process.env.AZURE_SPEECH_VOICE || "sv-SE-SofieNeural";
const AZURE_SPEECH_DIALOGUE_VOICE_A = process.env.AZURE_SPEECH_DIALOGUE_VOICE_A || AZURE_SPEECH_VOICE;
const AZURE_SPEECH_DIALOGUE_VOICE_B = process.env.AZURE_SPEECH_DIALOGUE_VOICE_B || "sv-SE-MattiasNeural";
const AZURE_SPEECH_VOICES = new Set([
  "sv-SE-SofieNeural",
  "sv-SE-MattiasNeural",
  "sv-SE-HilleviNeural",
  "en-US-AvaMultilingualNeural",
  "en-US-AndrewMultilingualNeural",
  "en-US-EmmaMultilingualNeural",
  "en-US-BrianMultilingualNeural",
]);
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";
const ELEVENLABS_LANGUAGE_CODE = process.env.ELEVENLABS_LANGUAGE_CODE || "sv";
const SHADOWING_STANDARD_AUDIO_BUCKET = "shadowing-standard-audio";
const MAX_TTS_TEXT_LENGTH = 20000;

function clean(value) {
  return String(value || "").trim();
}

function escapeXml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function dialogueTurns(text) {
  const lines = String(text || "").split(/\n+/).map((line) => clean(line)).filter(Boolean);
  if (lines.length < 2) return [];
  const speakerVoices = new Map();
  let markedLines = 0;
  const turns = lines.map((line, index) => {
    const speakerMatch = line.match(/^([^:：]{1,32})[:：]\s*(.+)$/u);
    const dashMatch = line.match(/^[-–—]\s*(.+)$/u);
    if (speakerMatch?.[2]) {
      markedLines += 1;
      const speaker = clean(speakerMatch[1]).toLocaleLowerCase("sv-SE");
      if (!speakerVoices.has(speaker)) {
        speakerVoices.set(speaker, speakerVoices.size % 2 === 0 ? AZURE_SPEECH_DIALOGUE_VOICE_A : AZURE_SPEECH_DIALOGUE_VOICE_B);
      }
      return { text: clean(speakerMatch[2]), voice: speakerVoices.get(speaker) };
    }
    if (dashMatch?.[1]) {
      markedLines += 1;
      return { text: clean(dashMatch[1]), voice: index % 2 === 0 ? AZURE_SPEECH_DIALOGUE_VOICE_A : AZURE_SPEECH_DIALOGUE_VOICE_B };
    }
    return { text: line, voice: index % 2 === 0 ? AZURE_SPEECH_DIALOGUE_VOICE_A : AZURE_SPEECH_DIALOGUE_VOICE_B };
  });
  return markedLines >= 2 ? turns.filter((turn) => turn.text) : [];
}

function azureSpeechSsml(text, voice = AZURE_SPEECH_VOICE) {
  return `<speak version="1.0" xml:lang="sv-SE"><voice xml:lang="sv-SE" name="${escapeXml(voice)}">${escapeXml(text)}</voice></speak>`;
}

function elevenLabsSpeechPayload(text) {
  const payload = {
    text,
    model_id: ELEVENLABS_MODEL_ID,
    voice_settings: {
      stability: 0.6,
      similarity_boost: 0.8,
      style: 0,
      use_speaker_boost: true,
    },
  };
  if (ELEVENLABS_LANGUAGE_CODE && ELEVENLABS_MODEL_ID !== "eleven_multilingual_v2") {
    payload.language_code = ELEVENLABS_LANGUAGE_CODE;
  }
  return payload;
}

async function synthesizeAzureTurn(text, voice) {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    const error = new Error("Azure Speech is not configured.");
    error.status = 500;
    throw error;
  }
  const response = await fetch(`https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": AZURE_SPEECH_KEY,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-160kbitrate-mono-mp3",
      "User-Agent": "swedish-vocab-pwa",
    },
    body: azureSpeechSsml(text, voice),
  });
  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    const error = new Error(payload || `Azure Speech TTS failed with ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return Buffer.from(await response.arrayBuffer());
}

async function synthesizeWithAzure(text, requestedVoice = "") {
  const turns = dialogueTurns(text);
  const dialogue = turns.length >= 2;
  const selectedVoice = AZURE_SPEECH_VOICES.has(requestedVoice) ? requestedVoice : AZURE_SPEECH_VOICE;
  const audioBuffer = dialogue
    ? Buffer.concat(await Promise.all(turns.map((turn) => synthesizeAzureTurn(turn.text, turn.voice))))
    : await synthesizeAzureTurn(text, selectedVoice);
  return {
    audioBuffer,
    provider: "azure-speech",
    voiceId: dialogue ? `${AZURE_SPEECH_DIALOGUE_VOICE_A}+${AZURE_SPEECH_DIALOGUE_VOICE_B}` : selectedVoice,
    modelId: "azure-speech-tts",
    languageCode: "sv-SE",
  };
}

async function synthesizeWithElevenLabs(text, voice) {
  if (!ELEVENLABS_API_KEY) {
    const error = new Error("ElevenLabs is not configured.");
    error.status = 500;
    throw error;
  }
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      accept: "audio/mpeg",
      "content-type": "application/json",
    },
    body: JSON.stringify(elevenLabsSpeechPayload(text)),
  });
  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    const error = new Error(payload || `ElevenLabs TTS failed with ${response.status}.`);
    error.status = response.status;
    throw error;
  }
  return {
    audioBuffer: Buffer.from(await response.arrayBuffer()),
    provider: "elevenlabs",
    voiceId: voice,
    modelId: ELEVENLABS_MODEL_ID,
    languageCode: ELEVENLABS_LANGUAGE_CODE,
  };
}

async function synthesizeSwedishSpeech(text, voice) {
  if (AZURE_SPEECH_KEY && AZURE_SPEECH_REGION) {
    try {
      return await synthesizeWithAzure(text, voice);
    } catch (error) {
      if (!ELEVENLABS_API_KEY) throw error;
      console.warn("[Shadowing TTS] Azure Speech failed. Falling back to ElevenLabs.", error);
    }
  }
  return synthesizeWithElevenLabs(text, voice);
}

async function markFailed(userSupabaseClient, userId, itemId, message, voiceId = "") {
  if (!userSupabaseClient || !userId || !itemId) return;
  await userSupabaseClient
    .from("shadowing_items")
    .update({
      tts_voice_id: clean(voiceId),
      tts_status: "failed",
      tts_error: clean(message).slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("id", itemId);
}

// user/userSupabaseClient are both null for an anonymous caller (e.g.
// speakSwedish's word-pronunciation "Lyssna" button, which by design never
// sends a token) — that path returns an ephemeral dataUrl and never
// touches the database. A logged-in caller with a real shadowing_items row
// gets it persisted to storage + updated.
export async function generateShadowingAudio({ user, userSupabaseClient, text, voiceId, itemId }) {
  if (!AZURE_SPEECH_KEY && !ELEVENLABS_API_KEY) {
    const error = new Error("AI Voice is not configured.");
    error.status = 500;
    throw error;
  }
  const swedishText = clean(text);
  const voice = clean(voiceId);
  const shadowingItemId = clean(itemId);
  if (!swedishText) {
    const error = new Error("Svensk text saknas.");
    error.status = 400;
    throw error;
  }
  if (swedishText.length > MAX_TTS_TEXT_LENGTH) {
    const error = new Error(`Texten är för lång (max ${MAX_TTS_TEXT_LENGTH} tecken).`);
    error.status = 400;
    throw error;
  }
  if (!voice) {
    const error = new Error("ElevenLabs voiceId saknas.");
    error.status = 400;
    throw error;
  }
  if (!shadowingItemId) {
    const error = new Error("Shadowing itemId saknas.");
    error.status = 400;
    throw error;
  }

  if (user?.id && userSupabaseClient) {
    const { error: statusError } = await userSupabaseClient
      .from("shadowing_items")
      .update({
        tts_provider: AZURE_SPEECH_KEY && AZURE_SPEECH_REGION ? "azure-speech" : "elevenlabs",
        tts_voice_id: AZURE_SPEECH_KEY && AZURE_SPEECH_REGION ? AZURE_SPEECH_VOICE : voice,
        tts_model_id: AZURE_SPEECH_KEY && AZURE_SPEECH_REGION ? "azure-speech-tts" : ELEVENLABS_MODEL_ID,
        tts_status: "generating",
        tts_error: "",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("id", shadowingItemId);
    if (statusError) throw statusError;
  }

  try {
    const speech = await synthesizeSwedishSpeech(swedishText, voice);
    const { audioBuffer } = speech;
    if (!user?.id || !userSupabaseClient) {
      return {
        item: null,
        dataUrl: `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`,
        mimeType: "audio/mpeg",
        sizeBytes: audioBuffer.byteLength,
        provider: speech.provider,
        voiceId: speech.voiceId,
        modelId: speech.modelId,
        languageCode: speech.languageCode,
        status: "ready",
      };
    }

    const storagePath = `${user.id}/${shadowingItemId}/standard.mp3`;
    const { error: uploadError } = await userSupabaseClient.storage
      .from(SHADOWING_STANDARD_AUDIO_BUCKET)
      .upload(storagePath, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: item, error: updateError } = await userSupabaseClient
      .from("shadowing_items")
      .update({
        standard_audio_bucket: SHADOWING_STANDARD_AUDIO_BUCKET,
        standard_audio_path: storagePath,
        standard_audio_mime_type: "audio/mpeg",
        standard_audio_size_bytes: audioBuffer.byteLength,
        tts_provider: speech.provider,
        tts_voice_id: speech.voiceId,
        tts_model_id: speech.modelId,
        tts_status: "ready",
        tts_error: "",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("id", shadowingItemId)
      .select()
      .single();
    if (updateError) throw updateError;

    return {
      item,
      bucket: SHADOWING_STANDARD_AUDIO_BUCKET,
      path: storagePath,
      mimeType: "audio/mpeg",
      sizeBytes: audioBuffer.byteLength,
      provider: speech.provider,
      voiceId: speech.voiceId,
      modelId: speech.modelId,
      languageCode: speech.languageCode,
      status: "ready",
    };
  } catch (error) {
    if (user?.id && userSupabaseClient) {
      await markFailed(userSupabaseClient, user.id, shadowingItemId, error.message || "Shadowing TTS failed.", voice);
    }
    throw error;
  }
}
