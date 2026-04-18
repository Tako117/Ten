import OpenAI, { toFile } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize OpenAI conditionally. Will throw if used without key, but won't crash on startup.
let openai;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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

    // Convert buffer to file for OpenAI SDK
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

    console.log('Sending image to OpenAI Vision API for OCR...');
    
    // Construct Base64 URI for OpenAI Image Upload
    const base64Image = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;
    const targetLanguage = req.body.targetLanguage || 'en';

    // Note: The frontend is currently expecting a JSON-lines response block layout,
    // sending a single final packet using the expected { text } chunk format works cleanly
    // without breaking the fetch decode loop.
    res.setHeader('Content-Type', 'application/json-lines');
    res.setHeader('Transfer-Encoding', 'chunked');

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Extract the educational text from this image exactly in its original language. Do NOT translate it. You must return the output as a strict JSON object with two properties: `languageCode` (a valid BCP 47 language tag like 'en-US', 'kk-KZ', or 'ru-RU') and `text` (the extracted text)."
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
    const { text, languageCode } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided for TTS' });
    }

    if (!openai) {
      return res.status(500).json({ error: 'OpenAI API key not configured for TTS usage.' });
    }

    console.log('Sending text to OpenAI TTS API...');

    const mp3Response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: text
    });

    const buffer = Buffer.from(await mp3Response.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
    
  } catch (error) {
    console.error('Neural TTS error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate audio via Neural TTS. ' + error.message });
    }
  }
};

/**
 * Handles Text Adaptation for specific accessibility profiles using OpenAI
 */
export const adaptContent = async (req, res) => {
  try {
    const { text, profile } = req.body;

    if (!text || !profile) {
      return res.status(400).json({ error: 'Text and profile are required.' });
    }

    if (!openai) {
      return res.status(500).json({ error: 'OpenAI API key not configured.' });
    }

    // Only process if it's dyslexia or adhd, otherwise return original
    if (profile !== 'dyslexia' && profile !== 'adhd') {
      return res.status(200).json({ adaptedText: text, chunks: [] });
    }

    let systemPrompt = '';
    
    if (profile === 'dyslexia') {
      systemPrompt = "You are an accessibility aide. The user will provide text. Rewrite it into simple, short sentences that are easy to read for someone with Dyslexia. Keep the meaning exactly the same, but use extremely clear vocabulary. Output a JSON object with a single key 'adaptedText' containing your rewritten document as a single string.";
    } else if (profile === 'adhd') {
      systemPrompt = "You are an accessibility aide. The user will provide text. Fragment it into a step-by-step logical sequence of short, actionable bullet points optimized for someone with ADHD. Keep the meaning exactly the same. Output a JSON object with a single key 'chunks' containing an array of strings, where each string is one step or concept.";
    }

    console.log(`Sending text to OpenAI for adaptation (${profile})...`);

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ]
    });

    const parsedData = JSON.parse(aiResponse.choices[0].message.content);

    if (profile === 'dyslexia') {
      res.status(200).json({ adaptedText: parsedData.adaptedText, chunks: [] });
    } else {
      res.status(200).json({ adaptedText: text, chunks: parsedData.chunks });
    }

  } catch (error) {
    console.error('Adaptation error:', error);
    res.status(500).json({ error: 'Failed to adapt content. ' + error.message });
  }
};
