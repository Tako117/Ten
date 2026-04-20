import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { translateAudio, scanImage, speakText, adaptContent, generateLessonSummary } from '../controllers/aiController.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const router = express.Router();

// Configure multer for memory storage handling
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// POST /api/translate
// Accepts an audio blob to be transcribed via OpenAI Whisper
router.post('/translate', upload.single('audio'), translateAudio);

// POST /api/scan
// Accepts an image blob to be scanned via Tesseract.js OCR
router.post('/scan', upload.single('image'), scanImage);

// POST /api/speak
// Accepts text to stream via OpenAI Neural TTS
router.post('/speak', express.json(), speakText);

// POST /api/adapt
// Accepts text and profile to return simplified structures
router.post('/adapt', express.json(), adaptContent);

// POST /api/ai-tutor
// Accepts lessonText and optional userQuestion for summarization and Q&A
router.post('/ai-tutor', express.json(), generateLessonSummary);

// POST /api/translate-vision
// Accepts massive base64 array payloads from CloudVisionTranslator and routes to external inference
router.post('/translate-vision', async (req, res) => {
  try {
    const { frames } = req.body;
    
    if (!frames || frames.length === 0) {
      return res.status(400).json({ error: "No frames provided." });
    }

    const messages = [
      {
        role: "system",
        content: "You are a computerized ASL analysis API. You receive sequences of images and output raw data. Output a valid JSON object with exactly one key: 'translation'. The value must be ONLY the translated English word or the single ASL letter. Absolutely no conversational filler, no apologies, and no explanations. If you cannot determine the sign, output your highest-confidence single-word guess based on the visible hand shapes."
      },
      {
        role: "user",
        // Map the base64 frames into OpenAI's multimodal content array
        content: frames.map(frame => ({
          type: "image_url",
          image_url: { url: frame }
        }))
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: messages,
      response_format: { type: "json_object" },
      max_tokens: 50,
    });

    const aiResponse = response.choices[0].message.content;
    const parsedData = JSON.parse(aiResponse);
    const finalTranslation = parsedData.translation;
    res.json({ text: finalTranslation });

  } catch (error) {
    console.error("OpenAI Vision Pipeline processing failed: ", error);
    res.status(500).json({ error: "Vision API processing failed" });
  }
});

// POST /api/translate-to-en
// Accepts { text: "..." } and returns the English translation.
// Uses native Node fetch to the open GTX endpoint — zero API keys, zero npm dependencies.
// Response key is { englishText } to match data.englishText in Dashboard.jsx.
router.post('/translate-to-en', express.json(), async (req, res) => {
  console.log("=========================================");
  console.log("🚀 NATIVE TRANSLATION ROUTE FIRING");
  console.log("Translating text:", req.body.text);
  console.log("=========================================");

  try {
    const textToTranslate = req.body.text;
    if (!textToTranslate || !textToTranslate.trim()) {
      return res.status(400).json({ error: 'No text provided.' });
    }

    // Native fetch to the open GTX endpoint (Zero API keys required)
    const url =
      `https://translate.googleapis.com/translate_a/single` +
      `?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(textToTranslate.trim())}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Google Translate ${response.status}: ${errBody}`);
    }
    const data = await response.json();

    // Google returns a nested array: data[0] = [[translatedSegment, original, ...], ...]
    // Join all segments to reconstruct the full translated sentence.
    const translatedText = data[0].map(item => item[0]).join('');

    console.log("✅ Translation successful:", translatedText);
    // CRITICAL: key must be { englishText } — matches data.englishText in Dashboard.jsx
    res.json({ englishText: translatedText });
  } catch (error) {
    console.error("❌ Native Fetch Failed:", error);
    res.status(500).json({ error: 'Native translation failed' });
  }
});

// POST /api/translate-to-gloss
// Accepts { text: "Hello, how are you?" } (English) and returns the ASL gloss string.
// ASL gloss is fed to the sign.mt Avatar API so it signs correctly without freezing.
router.post('/translate-to-gloss', express.json(), async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'No text provided.' });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert American Sign Language (ASL) translator. Convert the following English sentence into an ASL gloss. Output ONLY the capitalized root words in the correct ASL grammar structure. Do not use punctuation. Output ONLY the gloss string.',
        },
        { role: 'user', content: text.trim() },
      ],
      max_tokens: 100,
      temperature: 0.1,
    });

    const gloss = response.choices[0].message.content.trim();
    res.json({ gloss });
  } catch (error) {
    console.error('ASL gloss translation error:', error);
    res.status(500).json({ error: 'ASL gloss translation failed.' });
  }
});

// GET /pose-proxy/*
// Proxies sign language pose requests to sign-mt Cloud Functions server-side
// (avoids CORS issues in the browser)
router.get('/pose-proxy/*', async (req, res) => {
  try {
    // req.params[0] = everything after /pose-proxy/, query string preserved via req.url
    const trailingPath = req.params[0];
    const queryString = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetUrl = `https://us-central1-sign-mt.cloudfunctions.net/${trailingPath}${queryString}`;

    const upstream = await fetch(targetUrl);

    // Forward the content-type so the browser receives binary pose data correctly
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');

    // Stream the binary pose data directly to the frontend
    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Pose proxy error:', error);
    res.status(502).json({ error: 'Pose proxy failed' });
  }
});

export default router;
