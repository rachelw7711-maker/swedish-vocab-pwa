import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY || process.env.SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || process.env.SPEECH_REGION;
const AZURE_SPEECH_VOICE = process.env.AZURE_SPEECH_VOICE || "sv-SE-SofieNeural";
const AZURE_SPEECH_DIALOGUE_VOICE_A = process.env.AZURE_SPEECH_DIALOGUE_VOICE_A || AZURE_SPEECH_VOICE;
const AZURE_SPEECH_DIALOGUE_VOICE_B = process.env.AZURE_SPEECH_DIALOGUE_VOICE_B || "sv-SE-MattiasNeural";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";
const ELEVENLABS_LANGUAGE_CODE = process.env.ELEVENLABS_LANGUAGE_CODE || "sv";
const SHADOWING_STANDARD_AUDIO_BUCKET = "shadowing-standard-audio";

function clean(value) {
  return String(value || "").trim();
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
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

async function synthesizeWithAzure(text) {
  const turns = dialogueTurns(text);
  const dialogue = turns.length >= 2;
  const audioBuffer = dialogue
    ? Buffer.concat(await Promise.all(turns.map((turn) => synthesizeAzureTurn(turn.text, turn.voice))))
    : await synthesizeAzureTurn(text, AZURE_SPEECH_VOICE);
  return {
    audioBuffer,
    provider: "azure-speech",
    voiceId: dialogue ? `${AZURE_SPEECH_DIALOGUE_VOICE_A}+${AZURE_SPEECH_DIALOGUE_VOICE_B}` : AZURE_SPEECH_VOICE,
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
      return await synthesizeWithAzure(text);
    } catch (error) {
      if (!ELEVENLABS_API_KEY) throw error;
      console.warn("[Shadowing TTS] Azure Speech failed. Falling back to ElevenLabs.", error);
    }
  }
  return synthesizeWithElevenLabs(text, voice);
}

async function readUser(req) {
  const authHeader = clean(req.headers.authorization || req.headers.Authorization);
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return { user: null, supabase: null };
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const { data, error } = await supabase.auth.getUser(authHeader.slice(7).trim());
  if (error || !data?.user?.id) {
    const authError = new Error("Logga in för att generera standardljud.");
    authError.status = 401;
    throw authError;
  }
  return { user: data.user, supabase };
}

async function markFailed(supabase, userId, itemId, message, voiceId = "") {
  await supabase
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

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      sendJson(res, 500, { error: "Supabase is not configured." });
      return;
    }
    if (!AZURE_SPEECH_KEY && !ELEVENLABS_API_KEY) {
      sendJson(res, 500, { error: "AI Voice is not configured." });
      return;
    }

    const { user, supabase } = await readUser(req);
    const { text, voiceId, itemId } = req.body || {};
    const swedishText = clean(text);
    const voice = clean(voiceId);
    const shadowingItemId = clean(itemId);
    if (!swedishText) {
      sendJson(res, 400, { error: "Svensk text saknas." });
      return;
    }
    if (!voice) {
      sendJson(res, 400, { error: "ElevenLabs voiceId saknas." });
      return;
    }
    if (!shadowingItemId) {
      sendJson(res, 400, { error: "Shadowing itemId saknas." });
      return;
    }

    if (user?.id && supabase) {
      const { error: statusError } = await supabase
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
      if (!user?.id || !supabase) {
        sendJson(res, 200, {
          item: null,
          dataUrl: `data:audio/mpeg;base64,${audioBuffer.toString("base64")}`,
          mimeType: "audio/mpeg",
          sizeBytes: audioBuffer.byteLength,
          provider: speech.provider,
          voiceId: speech.voiceId,
          modelId: speech.modelId,
          languageCode: speech.languageCode,
          status: "ready",
        });
        return;
      }

      const storagePath = `${user.id}/${shadowingItemId}/standard.mp3`;
      const { error: uploadError } = await supabase.storage
        .from(SHADOWING_STANDARD_AUDIO_BUCKET)
        .upload(storagePath, audioBuffer, {
          contentType: "audio/mpeg",
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data: item, error: updateError } = await supabase
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

      sendJson(res, 200, {
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
      });
    } catch (error) {
      if (user?.id && supabase) {
        await markFailed(supabase, user.id, shadowingItemId, error.message || "ElevenLabs TTS failed.", voice);
      }
      throw error;
    }
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Server error" });
  }
}
