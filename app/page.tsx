'use client';
import { useState, useEffect } from 'react';
import { findRelevantSicCodes } from './actions/sic-codes';
import {
	searchCompaniesBySicCodes,
	getCompanyOfficers,
} from './actions/companies-house';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface SicCode {
	sic: string;
	description: string;
}

interface CompanyContact {
	name: string;
	position: string;
	email: string;
	confidence: number;
}

interface CompanyResult {
	name: string;
	sic: string;
	registered: string;
	contacts: CompanyContact[];
	status: 'pending' | 'searching' | 'found' | 'not_found';
}

interface CompanyOfficer {
	name: string;
	role: string;
	appointedOn: string;
	occupation?: string;
	nationality?: string;
	countryOfResidence?: string;
}

interface Company {
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
function escapeCSV(value: string) {
	if (value == null) return '';
	const str = String(value);
	if (/[",\n]/.test(str)) {
		return '"' + str.replace(/"/g, '""') + '"';
	}
	return str;
}

export default function Home() {
	const [prompt, setPrompt] = useState('');
	const [sicCodes, setSicCodes] = useState<SicCode[]>([]);
	const [selectedSicCodes, setSelectedSicCodes] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [results, setResults] = useState<CompanyResult[]>([]);
	const [emailSearchProgress, setEmailSearchProgress] = useState(0);
	const [companies, setCompanies] = useState<Company[]>([]);
	const [currentPage, setCurrentPage] = useState(0);
	const [totalResults, setTotalResults] = useState(0);
	const [loadingOfficers, setLoadingOfficers] = useState<string[]>([]);
	const [showStep3, setShowStep3] = useState(true);
	const [showStep4, setShowStep4] = useState(false);
	const [isFetchingOfficers, setIsFetchingOfficers] = useState(false);
	const [maxResults, setMaxResults] = useState<number>(100);
	const [hasSearched, setHasSearched] = useState(false);

	const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);
		setHasSearched(false);
		setCompanies([]);
		setTotalResults(0);
		setCurrentPage(0);

		try {
			const result = await findRelevantSicCodes(prompt);
			if (result.error) {
				console.error(result.error);
				setSicCodes([]);
			} else {
				setSicCodes(result.sicCodes || []);
			}
		} catch (error) {
			console.error('Error searching SIC codes:', error);
			setSicCodes([]);
		} finally {
			setIsLoading(false);
		}
	};

	const toggleSicCode = (code: string) => {
		if (selectedSicCodes.includes(code)) {
			setSelectedSicCodes(selectedSicCodes.filter((c) => c !== code));
		} else {
			setSelectedSicCodes([...selectedSicCodes, code]);
		}
	};

	const fetchCompanies = async () => {
		if (selectedSicCodes.length === 0) return;

		setIsLoading(true);
		try {
			const result = await searchCompaniesBySicCodes(
				selectedSicCodes,
				currentPage,
				maxResults
			);
			setCompanies(result.companies);
			setTotalResults(result.totalResults);
			setHasSearched(true);
		} catch (error) {
			console.error('Error fetching companies:', error);
			// Handle error appropriately
		} finally {
			setIsLoading(false);
		}
	};

	const fetchOfficers = async (companyNumber: string) => {
		if (loadingOfficers.includes(companyNumber)) return;

		setLoadingOfficers((prev) => [...prev, companyNumber]);
		try {
			const result = await getCompanyOfficers(companyNumber);
			setCompanies((prev) =>
				prev.map((company) =>
					company.number === companyNumber
						? { ...company, officers: result.officers }
						: company
				)
			);
		} catch (error) {
			console.error('Error fetching officers:', error);
			// Handle error appropriately
		} finally {
			setLoadingOfficers((prev) => prev.filter((num) => num !== companyNumber));
		}
	};

	const findEmails = async () => {
		// Mock email finding process using Seamless.ai
		setEmailSearchProgress(0);
		const totalCompanies = results.length;

		for (let i = 0; i < results.length; i++) {
			setResults((prev) =>
				prev.map((company, index) =>
					index === i ? { ...company, status: 'searching' } : company
				)
			);

			// Simulate API call delay
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// Mock finding contacts
			setResults((prev) =>
				prev.map((company, index) => {
					if (index === i) {
						return {
							...company,
							status: 'found',
							contacts: [
								{
									name: 'John Smith',
									position: 'CEO',
									email:
										'j.smith@' +
										company.name.toLowerCase().replace(/ /g, '') +
										'.com',
									confidence: 85,
								},
								{
									name: 'Sarah Johnson',
									position: 'CTO',
									email:
										's.johnson@' +
										company.name.toLowerCase().replace(/ /g, '') +
										'.com',
									confidence: 75,
								},
							],
						};
					}
					return company;
				})
			);

			setEmailSearchProgress(((i + 1) / totalCompanies) * 100);
		}
	};

	const downloadCSV = () => {
		if (results.length === 0) return;

		// Create CSV content with contact information
		const headers = [
			'Company Name',
			'SIC Code',
			'Registration Date',
			'Contact Name',
			'Position',
			'Email',
			'Confidence Score',
		];
		const rows = results.flatMap((company) =>
			company.contacts.length > 0
				? company.contacts.map((contact) =>
						[
							company.name,
							company.sic,
							company.registered,
							contact.name,
							contact.position,
							contact.email,
							contact.confidence + '%',
						].join(',')
				  )
				: [
						[
							company.name,
							company.sic,
							company.registered,
							'No contacts found',
							'',
							'',
							'',
						].join(','),
				  ]
		);

		const csvContent = [headers.join(','), ...rows].join('\n');

		// Create download link
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', 'company_contacts.csv');
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	// Fetch all officers for companies in the current page
	const fetchAllOfficers = async () => {
		setIsFetchingOfficers(true);
		setShowStep4(true);
		const companiesToFetch = companies.filter(
			(company) =>
				!company.officers && !loadingOfficers.includes(company.number)
		);

		try {
			for (let i = 0; i < companiesToFetch.length; i++) {
				const company = companiesToFetch[i];
				setLoadingOfficers((prev) => [...prev, company.number]);
				try {
					// First company doesn't need a delay
					const result = await getCompanyOfficers(company.number, i === 0);
					setCompanies((prev) =>
						prev.map((c) =>
							c.number === company.number
								? { ...c, officers: result.officers }
								: c
						)
					);
				} catch (error) {
					console.error('Error fetching officers:', error);
				} finally {
					setLoadingOfficers((prev) =>
						prev.filter((num) => num !== company.number)
					);
				}
			}
		} finally {
			setIsFetchingOfficers(false);
		}
	};

	// Download officers as CSV
	const downloadOfficersCSV = () => {
		const headers = [
			'Company Name',
			'Company Number',
			'Officer First Name',
			'Officer Last Name',
			'Role',
			'Appointed On',
			'Occupation',
			'Nationality',
			'Country of Residence',
		];
		const rows = companies.flatMap((company) =>
			company.officers && company.officers.length > 0
				? company.officers.map((officer) => {
						let firstName = '';
						let lastName = '';
						if (officer.name && officer.name.includes(',')) {
							const [last, first] = officer.name.split(',');
							lastName = last.trim();
							firstName = (first || '').trim();
						} else if (officer.name) {
							const [first, ...rest] = officer.name.split(' ');
							firstName = first;
							lastName = rest.join(' ');
						}
						return [
							escapeCSV(company.name),
							escapeCSV(company.number),
							escapeCSV(firstName),
							escapeCSV(lastName),
							escapeCSV(officer.role),
							escapeCSV(officer.appointedOn),
							escapeCSV(officer.occupation || ''),
							escapeCSV(officer.nationality || ''),
							escapeCSV(officer.countryOfResidence || ''),
						].join(',');
				  })
				: []
		);
		const csvContent = [headers.join(','), ...rows].join('\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', 'company_officers.csv');
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return (
		<div className="min-h-screen bg-white">
			<div className="max-w-6xl mx-auto px-4 py-8">
				<header className="mb-12 text-center">
					<h1 className="text-4xl font-bold mb-3 text-gray-900">
						Company Contact Finder
					</h1>
					<p className="text-lg text-gray-600">
						Find business contacts using SIC codes
					</p>
				</header>

				<main className="space-y-6">
					{/* Step 1: SIC Code Search */}
					<section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
						<h2 className="text-2xl font-semibold mb-4 text-gray-900">
							Step 1: Find SIC Codes
						</h2>
						<form onSubmit={handleSearch} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="prompt">
									Describe the business activity or industry:
								</Label>
								<Input
									id="prompt"
									type="text"
									value={prompt}
									onChange={(e) => setPrompt(e.target.value)}
									placeholder="e.g. Software development for financial services"
									required
								/>
							</div>
							<Button
								type="submit"
								disabled={isLoading}
								className="w-full sm:w-auto"
							>
								{isLoading ? 'Searching...' : 'Search SIC Codes'}
							</Button>
						</form>
					</section>

					{/* Step 2: SIC Code Selection */}
					{sicCodes.length > 0 && (
						<section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
							<h2 className="text-2xl font-semibold mb-4 text-gray-900">
								Step 2: Select Relevant SIC Codes
							</h2>
							<div className="space-y-3">
								{sicCodes.map((sic) => (
									<div
										key={sic.sic}
										className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
										onClick={() => toggleSicCode(sic.sic)}
									>
										<Checkbox
											id={`sic-${sic.sic}`}
											checked={selectedSicCodes.includes(sic.sic)}
											onCheckedChange={() => toggleSicCode(sic.sic)}
										/>
										<div className="ml-4">
											<span className="font-medium text-gray-900">
												{sic.sic}
											</span>
											<span className="mx-2 text-gray-400">-</span>
											<span className="text-gray-600">{sic.description}</span>
										</div>
									</div>
								))}
							</div>
							<div className="mt-6">
								<Button
									onClick={fetchCompanies}
									disabled={selectedSicCodes.length === 0 || isLoading}
									className="w-full sm:w-auto"
								>
									{isLoading ? 'Fetching...' : 'Find Companies'}
								</Button>
							</div>
						</section>
					)}

					{/* Step 3: Company Results */}
					{selectedSicCodes.length > 0 && (
						<section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-2xl font-semibold text-gray-900">
									Step 3: Company Results
								</h2>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setShowStep3((v) => !v)}
								>
									{showStep3 ? 'Close' : 'Open'}
								</Button>
							</div>
							{showStep3 && (
								<>
									<div className="mb-4 space-y-2">
										<Label htmlFor="maxResults">
											Maximum number of companies to search (max 5000):
										</Label>
										<div className="flex gap-2">
											<Input
												id="maxResults"
												type="number"
												min="1"
												max="5000"
												value={maxResults}
												onChange={(e) =>
													setMaxResults(
														Math.min(
															5000,
															Math.max(1, parseInt(e.target.value) || 1)
														)
													)
												}
												required
											/>
											<Button
												onClick={fetchCompanies}
												disabled={isLoading || selectedSicCodes.length === 0}
												className="whitespace-nowrap"
											>
												{isLoading ? 'Searching...' : 'Search Companies'}
											</Button>
										</div>
									</div>
									{hasSearched && (
										<>
											<div className="overflow-x-auto border border-gray-200 rounded-lg">
												<table className="min-w-full divide-y divide-gray-200">
													<thead className="bg-gray-50">
														<tr>
															<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Company
															</th>
															<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Number
															</th>
															<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Location
															</th>
															<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Incorporated
															</th>
															<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
																Actions
															</th>
														</tr>
													</thead>
													<tbody className="bg-white divide-y divide-gray-200">
														{companies.map((company) => (
															<tr
																key={company.number}
																className="hover:bg-gray-50"
															>
																<td className="px-6 py-4 whitespace-nowrap">
																	<div className="text-sm font-medium text-gray-900">
																		{company.name}
																	</div>
																</td>
																<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
																	{company.number}
																</td>
																<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
																	{company.address?.locality ||
																		company.address?.postal_code}
																</td>
																<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
																	{new Date(
																		company.incorporationDate
																	).toLocaleDateString()}
																</td>
																<td className="px-6 py-4 whitespace-nowrap text-sm">
																	{/* Officer button removed */}
																</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
											{/* Pagination */}
											<div className="mt-4 flex justify-between items-center">
												<div className="flex gap-2">
													<Button
														onClick={() => {
															setCurrentPage((prev) => Math.max(0, prev - 1));
															fetchCompanies();
														}}
														disabled={
															currentPage === 0 ||
															isLoading ||
															isFetchingOfficers
														}
														variant="outline"
														size="sm"
													>
														Previous
													</Button>
													<Button
														onClick={() => {
															setCurrentPage((prev) => prev + 1);
															fetchCompanies();
														}}
														disabled={isLoading || isFetchingOfficers}
														variant="outline"
														size="sm"
													>
														Next
													</Button>
												</div>
											</div>
											{/* Fetch contacts button */}
											<div className="mt-6 flex justify-start">
												<Button
													onClick={fetchAllOfficers}
													disabled={isFetchingOfficers}
													variant="default"
												>
													{isFetchingOfficers
														? 'Fetching contacts...'
														: 'Fetch the contacts'}
												</Button>
											</div>
										</>
									)}
								</>
							)}
						</section>
					)}

					{/* Step 4: Company Officers */}
					{showStep4 &&
						companies.some(
							(company) => company.officers && company.officers.length > 0
						) && (
							<section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mt-6">
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-2xl font-semibold text-gray-900">
										Step 4: Company Officers
									</h2>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setShowStep4((v) => !v)}
									>
										{showStep4 ? 'Close' : 'Open'}
									</Button>
								</div>
								{isFetchingOfficers && (
									<div className="mb-4 text-blue-600 font-medium">
										Fetching officers for all companies...
									</div>
								)}
								<div className="space-y-6">
									{companies
										.filter(
											(company) =>
												company.officers && company.officers.length > 0
										)
										.map((company) => (
											<div
												key={company.number}
												className="border border-gray-200 rounded-lg overflow-hidden"
											>
												<div className="bg-gray-50 px-6 py-4">
													<h3 className="text-lg font-medium text-gray-900">
														{company.name}
													</h3>
												</div>
												<div className="divide-y divide-gray-200">
													{company.officers?.map((officer, index) => (
														<div key={index} className="px-6 py-4">
															<div className="flex justify-between items-start">
																<div>
																	<p className="font-medium text-gray-900">
																		{officer.name}
																	</p>
																	<p className="text-sm text-gray-600">
																		{officer.role}
																		{officer.occupation &&
																			` - ${officer.occupation}`}
																	</p>
																	{officer.nationality && (
																		<p className="text-sm text-gray-500">
																			{officer.nationality}
																			{officer.countryOfResidence &&
																				` (Resident in ${officer.countryOfResidence})`}
																		</p>
																	)}
																</div>
																<div className="text-sm text-gray-500">
																	Appointed:{' '}
																	{new Date(
																		officer.appointedOn
																	).toLocaleDateString()}
																</div>
															</div>
														</div>
													))}
												</div>
											</div>
										))}
								</div>
								{/* Download CSV button */}
								<div className="mt-6 flex justify-end">
									<Button onClick={downloadOfficersCSV} variant="secondary">
										Download CSV
									</Button>
								</div>
							</section>
						)}

					{/* Step 5: Seamless Integration will go here */}
				</main>
			</div>
		</div>
	);
}
