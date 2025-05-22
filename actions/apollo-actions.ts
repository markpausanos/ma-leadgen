'use server';

import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { escapeCSV } from '@/components/types';

const personSchema = z.object({
	first_name: z.string().min(1, 'First name is required'),
	last_name: z.string().min(1, 'Last name is required'),
	organization_name: z.string().optional(),
});

type PersonInput = z.infer<typeof personSchema>;

export async function enrichPersonData(
	personData: PersonInput,
	csvFileName?: string
) {
	try {
		// Validate input data
		const validatedData = personSchema.parse(personData);

		// Prepare request payload
		const payload = {
			...validatedData,
			reveal_personal_emails: true,
		};

		// Call Apollo API
		const response = await fetch('https://api.apollo.io/api/v1/people/match', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Cache-Control': 'no-cache',
				Accept: 'application/json',
				'x-api-key': process.env.APOLLO_API_KEY || '',
			},
			body: JSON.stringify(payload),
		});

		// Check for successful response
		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Apollo API error: ${response.status} ${errorText}`);

			// Log error to CSV if filename provided
			if (csvFileName) {
				await appendToCsv(csvFileName, {
					first_name: personData.first_name,
					last_name: personData.last_name,
					company_name: personData.organization_name || '',
					email: '',
					error: `API error: ${response.status}`,
				});
			}

			return { data: null, error: `API error: ${response.status}` };
		}

		// Parse the response data
		const data = await response.json();

		// Log to CSV if filename provided
		if (csvFileName) {
			await appendToCsv(csvFileName, {
				first_name: personData.first_name,
				last_name: personData.last_name,
				company_name: personData.organization_name || '',
				email: data.person?.email || '',
				error: '',
			});
		}

		// Check if we have a person with an email
		if (!data.person?.email) {
			console.log('No email found');
			return { data: null, error: null };
		}

		return { data, error: null };
	} catch (error) {
		console.error('Error enriching person data:', error);

		// Log error to CSV if filename provided
		if (csvFileName) {
			await appendToCsv(csvFileName, {
				first_name: personData.first_name,
				last_name: personData.last_name,
				company_name: personData.organization_name || '',
				email: '',
				error:
					error instanceof Error
						? error.message
						: 'An unexpected error occurred',
			});
		}

		return {
			data: null,
			error:
				error instanceof Error ? error.message : 'An unexpected error occurred',
		};
	}
}

// Helper function to append data to CSV file
async function appendToCsv(
	filePath: string,
	data: {
		first_name: string;
		last_name: string;
		company_name: string;
		email: string;
		error: string;
	}
) {
	try {
		// Make sure the directory exists
		const dir = path.dirname(filePath);
		try {
			await fs.access(dir);
		} catch {
			await fs.mkdir(dir, { recursive: true });
		}

		// Check if file exists
		let fileExists = false;
		try {
			await fs.access(filePath);
			fileExists = true;
		} catch {
			// File doesn't exist, will create it
		}

		// Create CSV line
		const csvLine =
			[
				escapeCSV(data.company_name),
				escapeCSV(data.first_name),
				escapeCSV(data.last_name),
				escapeCSV(data.email),
				escapeCSV(data.error),
			].join(',') + '\n';

		// If file doesn't exist, add headers
		if (!fileExists) {
			const headers =
				['Company Name', 'First Name', 'Last Name', 'Email', 'Error'].join(
					','
				) + '\n';

			await fs.writeFile(filePath, headers + csvLine);
		} else {
			// Append to existing file
			await fs.appendFile(filePath, csvLine);
		}
	} catch (error) {
		console.error('Error writing to CSV:', error);
	}
}

export async function enrichBulkPersonData(personsData: PersonInput[]) {
	// Create a set to track unique combinations to avoid duplicates
	const uniquePersons = new Map<string, PersonInput>();

	// Filter out duplicates based on name and organization
	personsData.forEach((person) => {
		const key = `${person.first_name.toLowerCase()}-${person.last_name.toLowerCase()}-${(
			person.organization_name || ''
		).toLowerCase()}`;
		uniquePersons.set(key, person);
	});

	// Convert back to array
	const uniquePersonsArray = Array.from(uniquePersons.values());

	// Process in batches with rate limit consideration (50 requests per minute)
	const batchSize = 5; // Smaller batch size to avoid hitting rate limits
	const results = [];

	// Calculate delay based on rate limit (50 per minute = 1200ms between requests)
	const delayBetweenRequests = 1200;

	for (let i = 0; i < uniquePersonsArray.length; i += batchSize) {
		const batch = uniquePersonsArray.slice(i, i + batchSize);

		// Process batch items with delay between each request
		const batchResults = [];
		for (const person of batch) {
			const result = await enrichPersonData(person);

			if (result.data) {
				batchResults.push(result);
			}

			// Add delay between individual requests
			if (batch.indexOf(person) < batch.length - 1) {
				await new Promise((resolve) =>
					setTimeout(resolve, delayBetweenRequests)
				);
			}
		}

		results.push(...batchResults);

		// Add a longer delay between batches
		if (i + batchSize < uniquePersonsArray.length) {
			await new Promise((resolve) =>
				setTimeout(resolve, delayBetweenRequests * 2)
			);
		}
	}

	// Filter out nulls and errors
	return results.filter((result) => result.data !== null && !result.error);
}
