'use server';

import { Company, Officer, Query } from '@/lib/types';

const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL}`;

export type GetLeadsRequest = {
	sic_codes: string[];
	companies: Company[];
};

export async function enrichPersonData(params: GetLeadsRequest) {
	try {
		console.log(params);

		const response = await fetch(`${BASE_URL}/leads`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				sic_codes: params.sic_codes,
				companies: params.companies,
			}),
		});

		if (!response.ok) {
			console.error(await response.text()); // See what the backend actually returns
			throw new Error('Failed to enrich');
		}

		return true;
	} catch (error) {
		console.error(error);
		return false;
	}
}

export async function getQueries() {
	try {
		const response = await fetch(`${BASE_URL}/queries`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
			cache: 'no-store',
		});

		const data = await response.json();

		return data.queries ?? [];
	} catch (error) {
		console.error(error);
		return [];
	}
}

export async function getLeadsByQueryId(queryId: string) {
	try {
		const response = await fetch(`${BASE_URL}/leads/${queryId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			console.error(await response.text());
			throw new Error('Failed to get leads');
		}

		const data = await response.json();

		if (!data.leads) {
			return [];
		}

		return data.leads;
	} catch (error) {
		console.error(error);
		return [];
	}
}
