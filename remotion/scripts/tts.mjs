// Generate VO with ElevenLabs (American female).
import fs from "fs";

const VOICE_ID = "cgSgspJ2msm6clMCkdW9"; // Jessica — American female
const TEXT = [
  "EaseOps. Built for operators.",
  "First, we eliminate the manual work that slows your team down.",
  "Then we connect your tools, so your data flows where it should.",
  "And we give you real-time visibility into the operations that matter.",
  "Run on systems that scale. EaseOps dot c-a.",
].join(" ... ");

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY missing");

const res = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
  {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: TEXT,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true, speed: 1.0 },
    }),
  }
);
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
fs.writeFileSync("remotion/public/audio/vo.mp3", buf);
console.log("wrote vo.mp3", buf.length);
