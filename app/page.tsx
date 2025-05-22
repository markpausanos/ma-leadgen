'use client';
import { useState, useEffect } from 'react';
import {
	searchCompaniesBySicCodes,
	getCompanyOfficers,
} from '@/actions/companies-house';
import { enrichPersonData } from '@/actions/apollo-actions';
import {
	SicCode,
	Company,
	CompanyOfficer,
	escapeCSV,
} from '@/components/types';

// Import step components
import Step1SicSearch from '@/components/steps/Step1SicSearch';
import Step2SicSelection from '@/components/steps/Step2SicSelection';
import Step3CompanyResults from '@/components/steps/Step3CompanyResults';
import Step4CompanyOfficers from '@/components/steps/Step4CompanyOfficers';
import Step5ApolloEnrichment from '@/components/steps/Step5ApolloEnrichment';

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

export default function Home() {
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
	const [maxResults, setMaxResults] = useState<number>(10);
	const [hasSearched, setHasSearched] = useState(false);
	const [isEnrichingContacts, setIsEnrichingContacts] = useState(false);
	const [showStep5, setShowStep5] = useState(false);
	const [enrichedOfficers, setEnrichedOfficers] = useState<CompanyOfficer[]>(
		[]
	);

	const handleSicCodesFound = (foundSicCodes: SicCode[]) => {
		setSicCodes(foundSicCodes);
		setCompanies([]);
		setTotalResults(0);
		setCurrentPage(0);
		setHasSearched(false);
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

	// Handle page change in Step 3
	const handlePageChange = (newPage: number) => {
		setCurrentPage(newPage);
		// We'll trigger the fetch in the useEffect below
	};

	// Re-fetch companies when page changes
	useEffect(() => {
		if (hasSearched && selectedSicCodes.length > 0) {
			fetchCompanies();
		}
	}, [currentPage]);

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

					// Parse officer names into first and last name
					const parsedOfficers = result.officers.map((officer) => {
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

						return {
							...officer,
							firstName,
							lastName,
							enriched: false,
						};
					});

					setCompanies((prev) =>
						prev.map((c) =>
							c.number === company.number
								? { ...c, officers: parsedOfficers }
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

	// Get unique officers across all companies
	const getUniqueOfficers = () => {
		// Create a map to track unique officers
		const uniqueOfficers = new Map();

		companies.forEach((company) => {
			if (company.officers && company.officers.length > 0) {
				company.officers.forEach((officer) => {
					if (officer.firstName && officer.lastName) {
						const key = `${officer.firstName.toLowerCase()}-${officer.lastName.toLowerCase()}`;

						// Only add if not already in the map
						if (!uniqueOfficers.has(key)) {
							uniqueOfficers.set(key, {
								...officer,
								companyName: company.name,
								companyNumber: company.number,
							});
						}
					}
				});
			}
		});

		return Array.from(uniqueOfficers.values());
	};

	// Enrich officer data using Apollo
	const enrichOfficerData = async () => {
		setIsEnrichingContacts(true);
		setShowStep5(true);
		setEnrichedOfficers([]); // Reset the list

		const uniqueOfficers = getUniqueOfficers();
		console.log(`Processing ${uniqueOfficers.length} unique officers`);

		try {
			// Process one by one
			for (let i = 0; i < uniqueOfficers.length; i++) {
				const officer = uniqueOfficers[i];

				console.log(
					`Processing officer ${i + 1}/${uniqueOfficers.length}: ${
						officer.firstName
					} ${officer.lastName}`
				);

				const personData = {
					first_name: officer.firstName || '',
					last_name: officer.lastName || '',
					organization_name: officer.companyName,
				};

				// Call Apollo API with CSV file path
				const result = await enrichPersonData(personData);

				// Skip if no person data
				if (!result.data?.person) {
					console.log(
						`No data returned for ${personData.first_name} ${personData.last_name}`
					);
					continue;
				}

				const apolloPerson = result.data.person;
				const email = apolloPerson.email || '';

				console.log(
					`Got data for ${apolloPerson.first_name} ${
						apolloPerson.last_name
					}, email: ${email || 'none'}`
				);

				// Create enriched officer
				const enrichedOfficer = {
					...officer,
					enriched: true,
					enrichedData: result.data,
				};

				// Add to list immediately
				setEnrichedOfficers((prev) => [...prev, enrichedOfficer]);

				// Add a small delay to avoid rate limiting
				if (i < uniqueOfficers.length - 1) {
					await new Promise((resolve) => setTimeout(resolve, 5000));
				}
			}
		} catch (error) {
			console.error('Error enriching officer data:', error);
		} finally {
			setIsEnrichingContacts(false);
		}
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
					<Step1SicSearch onSicCodesFound={handleSicCodesFound} />

					{/* Step 2: SIC Code Selection */}
					{sicCodes.length > 0 && (
						<Step2SicSelection
							sicCodes={sicCodes}
							selectedSicCodes={selectedSicCodes}
							onToggleSicCode={toggleSicCode}
							onFindCompanies={fetchCompanies}
							isLoading={isLoading}
						/>
					)}

					{/* Step 3: Company Results */}
					{selectedSicCodes.length > 0 && (
						<Step3CompanyResults
							companies={companies}
							selectedSicCodes={selectedSicCodes}
							isLoading={isLoading}
							isFetchingOfficers={isFetchingOfficers}
							currentPage={currentPage}
							totalResults={totalResults}
							maxResults={maxResults}
							hasSearched={hasSearched}
							onMaxResultsChange={setMaxResults}
							onSearchCompanies={fetchCompanies}
							onPageChange={handlePageChange}
							onFetchAllOfficers={fetchAllOfficers}
						/>
					)}

					{/* Step 4: Company Officers */}
					<Step4CompanyOfficers
						companies={companies}
						isFetchingOfficers={isFetchingOfficers}
						onEnrichOfficerData={enrichOfficerData}
						isEnrichingContacts={isEnrichingContacts}
						showStep4={showStep4}
					/>

					{/* Step 5: Apollo Enrichment */}
					<Step5ApolloEnrichment
						enrichedOfficers={enrichedOfficers}
						isEnrichingContacts={isEnrichingContacts}
						showStep5={showStep5}
					/>
				</main>
			</div>
		</div>
	);
}
