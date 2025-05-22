export interface SicCode {
	sic: string;
	description: string;
}

export interface CompanyContact {
	name: string;
	position: string;
	email: string;
	confidence: number;
}

export interface CompanyResult {
	name: string;
	sic: string;
	registered: string;
	contacts: CompanyContact[];
	status: 'pending' | 'searching' | 'found' | 'not_found';
}

export interface CompanyOfficer {
	name: string;
	role: string;
	appointedOn: string;
	occupation?: string;
	nationality?: string;
	countryOfResidence?: string;
	firstName?: string;
	lastName?: string;
	enriched?: boolean;
	enrichedData?: any;
	companyName?: string;
	companyNumber?: string;
}

export interface Company {
	number: string;
	name: string;
	status: string;
	type: string;
	address?: {
		address_line_1?: string;
		address_line_2?: string;
		locality?: string;
		postal_code?: string;
		region?: string;
		country?: string;
	};
	incorporationDate: string;
	sicCodes?: string[];
	officers?: CompanyOfficer[];
}

// Utility to escape CSV fields
export function escapeCSV(value: string) {
	if (value == null) return '';
	const str = String(value);
	if (/[",\n]/.test(str)) {
		return '"' + str.replace(/"/g, '""') + '"';
	}
	return str;
}
