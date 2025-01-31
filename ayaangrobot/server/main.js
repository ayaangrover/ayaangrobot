import express from 'express';
import path from 'path';
import OpenAI from 'openai';
import bodyParser from 'body-parser';
import cors from 'cors';
import { pipeline } from 'stream/promises';
import { PassThrough } from 'stream';

const app = express();
const port = 3002;

const openai = new OpenAI({
  apiKey: "API_KEY",
});

app.use(cors());
app.use(bodyParser.json());

const activeStreams = new Map();

app.post('/api/tts', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    console.log('Request received for TTS');
    
    const streamId = Date.now().toString();
    const passThrough = new PassThrough();
    activeStreams.set(streamId, passThrough);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Stream-ID', streamId);

    const mp3Stream = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: message,
      response_format: "mp3",
    });

    console.log('TTS stream created, beginning streaming');

    mp3Stream.body.pipe(res);

    mp3Stream.body.on('end', () => {
      console.log('Streaming completed');
      activeStreams.delete(streamId);
    });

  } catch (error) {
    console.error("Error generating audio:", error);
    res.status(500).json({ error: "Error generating audio" });
  }
});

app.post('/api/tts/cancel', (req, res) => {
  const { streamId } = req.body;
  
  if (streamId && activeStreams.has(streamId)) {
    const stream = activeStreams.get(streamId);
    stream.destroy();
    activeStreams.delete(streamId);
    res.status(200).json({ message: "Stream cancelled" });
  } else {
    res.status(404).json({ error: "Stream not found" });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!" });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});