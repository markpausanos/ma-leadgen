'use client';
import { useState, useEffect } from 'react';
import { getCompanies } from '@/actions/companiesHouse';
import { Company, Officer, SicCode } from '@/lib/types';
import Link from 'next/link';

// Import step components
import Step1SicSearch from '@/components/steps/Step1SicSearch';
import Step2SicSelection from '@/components/steps/Step2SicSelection';
import Step3CompanyResults from '@/components/steps/Step3CompanyResults';

export default function Home() {
	const [sicCodes, setSicCodes] = useState<SicCode[]>([]);
	const [selectedSicCodes, setSelectedSicCodes] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [companies, setCompanies] = useState<Company[]>([]);
	const [currentPage, setCurrentPage] = useState(0);
	const [isFetchingOfficers, setIsFetchingOfficers] = useState(false);
	const [maxResults, setMaxResults] = useState<number>(10);
	const [hasSearched, setHasSearched] = useState(false);

	const handleSicCodesFound = (foundSicCodes: SicCode[]) => {
		setSicCodes(foundSicCodes);
		setCompanies([]);
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
			const result = await getCompanies({
				sic_codes: selectedSicCodes,
				start_index: currentPage * maxResults,
				size: maxResults,
				company_status: 'active',
			});
			setCompanies(() => [...result]);

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

	return (
		<div className="min-h-screen bg-white">
			<div className="max-w-6xl mx-auto px-4 py-8">
				<header className="mb-12 text-center">
					<h1 className="text-4xl font-bold mb-3 text-gray-900">
						Company Contact Finder
					</h1>
					<p className="text-lg text-gray-600 mb-4">
						Find business contacts using SIC codes
					</p>
					<Link
						href="/queries"
						className="text-blue-600 hover:text-blue-800 hover:underline"
					>
						View Enriched Contacts →
					</Link>
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
							maxResults={maxResults}
							hasSearched={hasSearched}
							onMaxResultsChange={setMaxResults}
							onSearchCompanies={fetchCompanies}
							onPageChange={handlePageChange}
							onReset={() => {
								setCompanies([]);
								setCurrentPage(0);
								setHasSearched(false);
							}}
						/>
					)}
				</main>
			</div>
		</div>
	);
}
