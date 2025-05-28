'use server';

import { Company, Officer, Query } from '@/lib/types';
import { createServerClient } from '@/lib/supabase';

const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL}/leads`;

export type GetLeadsRequest = {
	sic_codes: string[];
	companies: Company[];
};

export async function enrichPersonData(params: GetLeadsRequest) {
	try {
		console.log(params);

		const response = await fetch(`${BASE_URL}`, {
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
	const supabase = await createServerClient();

	const { data, error } = await supabase.from('Query').select('*');

	if (error) {
		console.error(error);
	}

	return data as Query[];
}

export async function getLeadsByQueryId(queryId: string) {
	const supabase = await createServerClient();

	const { data, error } = await supabase
		.from('Officer')
		.select('*')
		.eq('queryId', queryId);

	if (error) {
		console.error(error);
	}

	return data as Officer[];
}
