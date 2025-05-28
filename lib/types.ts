export interface Company {
	id: string;
	name: string;
	number: string;
	type: string;
	sicCodes: string[];
	source: string;
	status: string;
	dateOfCreation: string;
	addressLine1: string;
	addressLine2: string;
	locality: string;
	postalCode: string;
	region: string;
	country: string;
}

export interface Officer {
	id: string;
	name: string;
	birthDay: string;
	birthMonth: string;
	birthYear: string;
	addressLine1: string;
	addressLine2: string;
	locality: string;
	postalCode: string;
	region: string;
	country: string;
	email: string;
	nationality: string;
	countryOfResidence: string;
	occupation: string;
	officerType: string;
	appointedOn: string;
	source: string;
	companyName: string;
	queryId: string;
}

export type SicCode = {
	code: string;
	description: string;
};

export type Query = {
	id: string;
	createdAt: Date;
	finishedAt: Date;
	status: string;
	sicCodes: string[];
};
