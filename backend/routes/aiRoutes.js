import express from 'express';
import multer from 'multer';
import OpenAI from 'openai';
import { translateAudio, scanImage, speakText, adaptContent } from '../controllers/aiController.js';

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

export default router;
