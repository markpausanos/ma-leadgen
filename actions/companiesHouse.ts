'use server';

import { Company, Officer } from '@/lib/types';

const BASE_URL = `${process.env.NEXT_PUBLIC_API_URL}/companies`;

export interface GetCompaniesRequest {
	company_status?: string;
	size?: number;
	sic_codes?: string[];
	start_index?: number;
}

export async function getCompanies(params: GetCompaniesRequest) {
	try {
		const { company_status, size = 500, start_index = 0, sic_codes } = params;

		const url = `${BASE_URL}?company_status=${company_status}&size=${size}&start_index=${start_index}&sic_codes=${sic_codes?.join(
			','
		)}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			},
		});

		const data = await response.json();


		const companies = data as Company[];

		return companies;
	} catch (error) {
		console.error(error);
		throw error;
	}
}
