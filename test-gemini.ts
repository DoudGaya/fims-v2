import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Missing GEMINI_API_KEY in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function listModels() {
  try {
    console.log("Testing gemini-flash-latest...");
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: 'Hello',
    });
    console.log("Response:", response.text);
  } catch (error) {
    console.error("Gemini test failed:", error);
  }
}

listModels();
