import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
const SHADOWING_STANDARD_AUDIO_BUCKET = "shadowing-standard-audio";

function clean(value) {
  return String(value || "").trim();
}

function sendJson(res, status, payload) {
  res.status(status).json(payload);
}

async function readUser(req) {
  const authHeader = clean(req.headers.authorization || req.headers.Authorization);
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    const error = new Error("Logga in för att generera standardljud.");
    error.status = 401;
    throw error;
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
    if (!ELEVENLABS_API_KEY) {
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

    const { error: statusError } = await supabase
      .from("shadowing_items")
      .update({
        tts_provider: "elevenlabs",
        tts_voice_id: voice,
        tts_model_id: ELEVENLABS_MODEL_ID,
        tts_status: "generating",
        tts_error: "",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("id", shadowingItemId);
    if (statusError) throw statusError;

    try {
      const elevenResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}`, {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          accept: "audio/mpeg",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          text: swedishText,
          model_id: ELEVENLABS_MODEL_ID,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true,
          },
        }),
      });
      if (!elevenResponse.ok) {
        const payload = await elevenResponse.text().catch(() => "");
        const error = new Error(payload || `ElevenLabs TTS failed with ${elevenResponse.status}.`);
        error.status = elevenResponse.status;
        throw error;
      }

      const audioBuffer = Buffer.from(await elevenResponse.arrayBuffer());
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
          tts_provider: "elevenlabs",
          tts_voice_id: voice,
          tts_model_id: ELEVENLABS_MODEL_ID,
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
        provider: "elevenlabs",
        voiceId: voice,
        status: "ready",
      });
    } catch (error) {
      await markFailed(supabase, user.id, shadowingItemId, error.message || "ElevenLabs TTS failed.", voice);
      throw error;
    }
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Server error" });
  }
}
