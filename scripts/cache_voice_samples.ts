import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('No GEMINI_API_KEY found');
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

const SAMPLES: Record<string, { text: string; style: string }> = {
  Kore: {
    text: 'Halo! Saya Kore, narator wanita profesional dan elegan. Artikulasi jernih dan tenang untuk briefing eksekutif pabrik.',
    style: 'Warm, clear, articulate, professional and elegant Indonesian female broadcast narrator'
  },
  Puck: {
    text: 'Halo! Saya Puck, narator pria hangat dan percaya diri. Suara alami dan bersahabat untuk pemantauan harian gudang.',
    style: 'Warm, friendly, confident and natural Indonesian male speaker'
  },
  Zephyr: {
    text: 'Halo! Saya Zephyr, narator wanita ceria dan dinamis. Intonasi bersemangat untuk pengingat operasional yang tanggap.',
    style: 'Energetic, cheerful, bright and dynamic Indonesian female speaker'
  },
  Fenrir: {
    text: 'Halo! Saya Fenrir, narator pria mantap dan berwibawa. Karakter tegas dan kuat untuk peringatan audit dan batas minimum stok.',
    style: 'Authoritative, deep baritone, commanding and disciplined Indonesian male speaker'
  },
  Charon: {
    text: 'Halo! Saya Charon, narator pria tenang bertempo santai dengan bass mendalam, sangat nyaman untuk mendengarkan laporan panjang.',
    style: 'Deep bass, calm, measured, polite and soothing Indonesian male speaker'
  }
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const outPath = path.resolve('src/services/precomputedVoiceSamples.json');
  let result: Record<string, { audioBase64: string; text: string; mimeType: string }> = {};
  if (fs.existsSync(outPath)) {
    try {
      result = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    } catch {}
  }

  for (const [voiceName, config] of Object.entries(SAMPLES)) {
    if (result[voiceName]?.audioBase64) {
      console.log(`- Skipping ${voiceName}, already cached.`);
      continue;
    }
    console.log(`Generating sample for ${voiceName}...`);
    await sleep(4000);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: config.text,
                speechMetadata: {
                  style: config.style
                }
              }
            ]
          }
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName }
            }
          }
        }
      });

      const audioBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioBase64) {
        result[voiceName] = {
          audioBase64,
          text: config.text,
          mimeType: 'audio/wav'
        };
        console.log(`✓ Successfully generated sample for ${voiceName} (${audioBase64.length} chars)`);
      } else {
        console.error(`✗ No audio for ${voiceName}`);
      }
    } catch (err: any) {
      console.error(`✗ Error generating ${voiceName}:`, err.message);
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(`Done! Saved samples to ${outPath}`);
}

main();
