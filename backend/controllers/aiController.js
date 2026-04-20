import OpenAI, { toFile } from 'openai';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize OpenAI conditionally
let openai;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Initialize Gemini conditionally
let genAI;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    apiVersion: 'v1'
  });
}

/**
 * Handles Audio Translation (Speech to Text) using OpenAI Whisper
 */
export const translateAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    if (!openai) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const audioFile = await toFile(req.file.buffer, 'audio.webm', { type: req.file.mimetype });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    res.status(200).json({ text: transcription.text });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Failed to translate audio', details: error.message });
  }
};

/**
 * Handles local OCR using OpenAI Vision API
 */
export const scanImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    if (!openai) {
      return res.status(500).json({ error: 'OpenAI API key not configured for Vision usage.' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    res.setHeader('Content-Type', 'application/json-lines');
    res.setHeader('Transfer-Encoding', 'chunked');

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Extract the educational text from this image exactly in its original language. Do NOT translate it. You must return the output as a strict JSON object with two properties: `languageCode` (a valid BCP 47 language tag) and `text` (the extracted text)."
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ]
    });

    const parsedData = JSON.parse(aiResponse.choices[0].message.content);

    res.write(JSON.stringify({ progress: 100 }) + '\n');
    res.write(JSON.stringify({ 
      text: parsedData.text || "", 
      languageCode: parsedData.languageCode || 'en-US' 
    }) + '\n');
    res.end();
  } catch (error) {
    console.error('Vision OCR error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to scan image via Vision AI. ' + error.message });
    } else {
      res.write(JSON.stringify({ error: 'Failed to scan image via Vision AI. ' + error.message }) + '\n');
      res.end();
    }
  }
};

/**
 * Handles Neural TTS using OpenAI Audio API
 */
export const speakText = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });
    if (!openai) return res.status(500).json({ error: 'OpenAI API key not configured' });

    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: text
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.end(buffer);
  } catch (error) {
    console.error('Neural TTS error:', error);
    res.status(500).json({ error: 'Failed to generate audio' });
  }
};

/**
 * Handles Text Adaptation using OpenAI
 */
export const adaptContent = async (req, res) => {
  try {
    const { text, profile } = req.body;
    if (!text || !profile || !openai) return res.status(400).json({ error: 'Missing requirements' });

    if (profile !== 'dyslexia' && profile !== 'adhd') {
      return res.status(200).json({ adaptedText: text, chunks: [] });
    }

    const systemPrompt = profile === 'dyslexia' 
      ? "Rewrite into short, clear sentences for Dyslexia. Output JSON key 'adaptedText'." 
      : "Fragment into logical bullet points for ADHD. Output JSON key 'chunks' as an array.";

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ]
    });

    const parsedData = JSON.parse(aiResponse.choices[0].message.content);
    res.status(200).json(parsedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Handles Lesson Summarization and Student Q&A using Google Gemini
 */
export const generateLessonSummary = async (req, res) => {
  const { lessonText, userQuestion } = req.body;
  const modelCandidates = ['models/gemini-2.0-flash', 'models/gemini-2.5-flash', 'models/gemini-flash-latest'];

  // Primary Debugging Traces
  console.log("📡 Request received at /api/ai-tutor");
  console.log("📝 Lesson Text Received:", lessonText ? (lessonText.substring(0, 50) + "...") : "MISSING");
  console.log("🔑 Using API Key:", process.env.GEMINI_API_KEY ? "EXISTS" : "MISSING");

  if (!lessonText) return res.status(400).json({ error: 'Lesson text is required' });
  if (!genAI) return res.status(500).json({ error: 'Gemini API key not configured' });

  const promptText = !userQuestion 
    ? `You are an encouraging educational tutor. Provide a 2-3 sentence summary and a section titled "Key Takeaways" with 3-5 bullet points. Lesson: ${lessonText}`
    : `Using ONLY this lesson text: "${lessonText}", answer this question: ${userQuestion}. If the answer isn't there, say it isn't covered.`;

  let lastError = null;

  for (const modelId of modelCandidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      console.log(`💎 SDK Request formatted, sending now to ${modelId}...`);

      const response = await genAI.models.generateContent({
        model: modelId,
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        config: { signal: controller.signal } 
      });

      clearTimeout(timeoutId);
      const aiText = response.text;
      console.log(`🎉 Success! Model: ${modelId}, Text length: ${aiText.length}`);
      return res.json({ result: aiText });

    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      const errorMessage = error.name === 'AbortError' ? 'timeout' : error.message;
      
      // Handle Quota or Not Found by falling back
      if (errorMessage.includes('429') || errorMessage.includes('404') || errorMessage === 'timeout') {
        console.log(`⚠️ Fallback: Model ${modelId} failed (${errorMessage}). Trying next...`);
        continue;
      }

      // For other critical errors, break and return
      break;
    }
  }

  // Final catch-all if all fallbacks fail
  const isQuota = lastError?.message?.includes('429');
  const responseStatus = isQuota ? 429 : 500;
  const responseMessage = isQuota 
    ? "The AI Tutor is currently over-capacity. Please wait 60 seconds and try again."
    : `AI Tutor failed: ${lastError?.message}`;

  console.log("❌ [BACKEND] All Gemini fallbacks exhausted.");
  res.status(responseStatus).json({ error: "Gemini API Error", details: responseMessage });
};