import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
	throw new Error('Environment variable GOOGLE_AI_API_KEY is required');
}

export const genAI = new GoogleGenAI({
	apiKey,
});

export const EMBEDDING_MODEL_NAME = 'text-embedding-004';
export const GENERATIVE_MODEL_NAME = 'gemini-1.5-flash';
