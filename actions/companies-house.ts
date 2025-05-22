'use server';

const COMPANIES_HOUSE_API_KEY = process.env.COMPANIES_HOUSE_API_KEY || '';
const COMPANIES_HOUSE_API_URL =
	'https://api.company-information.service.gov.uk';
const RATE_LIMIT_DELAY = 100; // 100ms delay between requests

// Helper function to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface CompanySearchResult {
	company_number: string;
	company_name: string;
	company_status: string;
	company_type: string;
	address?: {
		address_line_1?: string;
		address_line_2?: string;
		locality?: string;
		postal_code?: string;
		country?: string;
	};
	registered_office_address?: {
		address_line_1?: string;
		address_line_2?: string;
		locality?: string;
		postal_code?: string;
		region?: string;
		country?: string;
	};
	date_of_creation: string;
	sic_codes?: string[];
}

interface CompanyOfficer {
	name: string;
	officer_role: string;
	appointed_on: string;
	occupation?: string;
	nationality?: string;
	country_of_residence?: string;
	resigned_on?: string;
}

interface SearchCompaniesResponse {
	page_number: number;
	kind: string;
	total_results: number;
	items: CompanySearchResult[];
}

interface OfficersResponse {
	items: CompanyOfficer[];
	total_results: number;
	active_count: number;
	resigned_count: number;
}

export async function searchCompaniesBySicCodes(
	sicCodes: string[],
	page: number = 0,
	maxResults: number = 50000
) {
	try {
		const authHeader = Buffer.from(COMPANIES_HOUSE_API_KEY + ':').toString(
			'base64'
		);
		// Limit maxResults to 50000
		const limitedMaxResults = Math.min(maxResults, 50000);

		const queryParams = new URLSearchParams({
			company_status: 'active',
			size: limitedMaxResults.toString(),
			start_index: (page * limitedMaxResults).toString(),
			sic_codes: sicCodes.join(','),
		});

		const response = await fetch(
			`${COMPANIES_HOUSE_API_URL}/advanced-search/companies?${queryParams}`,
			{
				headers: {
					Authorization: `Basic ${authHeader}`,
					Accept: 'application/json',
				},
				cache: 'no-store',
			}
		);

		if (!response.ok) {
			throw new Error(`Companies House API error: ${response.status}`);
		}

		const data: SearchCompaniesResponse = await response.json();
		const activeCompanies = data.items.filter(
			(company) => company.company_status === 'active'
		);

		return {
			companies: activeCompanies.map((company) => ({
				number: company.company_number,
				name: company.company_name,
				status: company.company_status,
				type: company.company_type,
				address: company.registered_office_address,
				incorporationDate: company.date_of_creation,
				sicCodes: company.sic_codes,
			})),
			totalResults: Math.min(data.total_results || 0, maxResults),
			pageNumber: data.page_number,
		};
	} catch (error) {
		console.error('Error searching companies:', error);
		throw new Error('Failed to search companies');
	}
}

export async function getCompanyOfficers(
	companyNumber: string,
	skipDelay: boolean = false
) {
	if (!skipDelay) {
		await delay(RATE_LIMIT_DELAY);
	}

	try {
		const authHeader = Buffer.from(COMPANIES_HOUSE_API_KEY + ':').toString(
			'base64'
		);

		const response = await fetch(
			`${COMPANIES_HOUSE_API_URL}/company/${companyNumber}/officers`,
			{
				headers: {
					Authorization: `Basic ${authHeader}`,
					Accept: 'application/json',
				},
				cache: 'no-store',
			}
		);

		if (!response.ok) {
			throw new Error(`Companies House API error: ${response.status}`);
		}

		const data: OfficersResponse = await response.json();

		// Filter to only active officers and relevant roles
		const relevantOfficers = data.items
			.filter(
				(officer) =>
					!officer.resigned_on &&
					[
						'director',
						'secretary',
						'managing-director',
						'corporate-director',
					].includes(officer.officer_role.toLowerCase())
			)
			.map((officer) => ({
				name: officer.name,
				role: officer.officer_role,
				appointedOn: officer.appointed_on,
				occupation: officer.occupation,
				nationality: officer.nationality,
				countryOfResidence: officer.country_of_residence,
			}));

		return {
			officers: relevantOfficers,
			totalResults: data.total_results,
			activeCount: data.active_count,
		};
	} catch (error) {
		console.error('Error fetching company officers:', error);
		throw new Error('Failed to fetch company officers');
	}
}
