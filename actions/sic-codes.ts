'use server';

import { genAI, GENERATIVE_MODEL_NAME } from '../lib/googleAi';
import * as fs from 'fs';
import * as path from 'path';
import * as csv from 'csv-parse/sync';
import { Type } from '@google/genai';

function getSicCodes() {
	const csvPath = path.join(process.cwd(), 'app/lib/sic-codes.csv');
	const fileContent = fs.readFileSync(csvPath, 'utf-8');
	return csv.parse(fileContent, {
		columns: true,
		skip_empty_lines: true,
	});
}

export async function findRelevantSicCodes(query: string) {
	if (!query || query.length === 0) {
		return { error: 'Query is required.', sicCodes: null };
	}

	try {
		// 1. Get all SIC codes data
		const sicCodes = getSicCodes();

		// 2. Create a context string from SIC codes data
		const sicCodesContext = sicCodes
			.map((code: any) => `${code['SIC Code']}: ${code['Description']}`)
			.join('\n');

		// 3. Create the prompt for Gemini
		const prompt = `You are a helpful assistant that helps find relevant SIC (Standard Industrial Classification) codes based on business descriptions.
    Your task is to analyze the query and find the most relevant SIC codes from the provided list.
    Return ONLY the SIC codes and their descriptions that are most relevant to the query.
    Format your response as a JSON array of objects with 'sic' and 'description' fields. Give me at least 2 relevant SIC codes.
    If no relevant codes are found, return an empty array.

    Available SIC Codes:
    ${sicCodesContext}

    User Query: ${query}`;

		// 4. Generate the answer using Gemini
		const result = await genAI.models.generateContent({
			model: GENERATIVE_MODEL_NAME,
			contents: prompt,
			config: {
				responseMimeType: 'application/json',
				responseSchema: {
					type: Type.OBJECT,
					properties: {
						results: {
							type: Type.ARRAY,
							items: {
								type: Type.OBJECT,
								properties: {
									sic: { type: Type.STRING },
									description: { type: Type.STRING },
								},
							},
						},
					},
					required: ['results'],
				},
			},
		});

		if (!result.text) {
			return { error: 'Failed to generate an answer.', sicCodes: null };
		}

		// 5. Parse the response as JSON
		try {
			const parsedResponse = JSON.parse(result.text);
			console.log(parsedResponse);
			return { sicCodes: parsedResponse.results || [], error: null };
		} catch (parseError) {
			return {
				error: 'Failed to parse the response into valid JSON.',
				sicCodes: null,
			};
		}
	} catch (error: unknown) {
		if (error instanceof Error) {
			console.error('Error in findRelevantSicCodes:', error);
			return {
				error: `An unexpected error occurred: ${error.message}`,
				sicCodes: null,
			};
		} else {
			return {
				error: 'An unexpected error occurred.',
				sicCodes: null,
			};
		}
	}
}
