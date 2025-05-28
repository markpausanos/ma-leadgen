'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Company } from '@/lib/types';
import { enrichPersonData } from '@/actions/leads';
import { toast } from 'sonner';

interface Step3CompanyResultsProps {
	companies: Company[];
	selectedSicCodes: string[];
	isLoading: boolean;
	isFetchingOfficers: boolean;
	currentPage: number;
	maxResults: number;
	hasSearched: boolean;
	onMaxResultsChange: (value: number) => void;
	onSearchCompanies: () => void;
	onPageChange: (newPage: number) => void;
	onReset: () => void;
}

export default function Step3CompanyResults({
	companies,
	selectedSicCodes,
	isLoading,
	isFetchingOfficers,
	currentPage,
	maxResults,
	hasSearched,
	onMaxResultsChange,
	onSearchCompanies,
	onPageChange,
	onReset,
}: Step3CompanyResultsProps) {
	const [showStep3, setShowStep3] = useState(true);
	const [isEnriching, setIsEnriching] = useState(false);

	const handleEnrichment = async () => {
		setIsEnriching(true);
		try {
			await enrichPersonData({
				sic_codes: selectedSicCodes,
				companies: companies,
			});

			toast(
				"Queued enrichment, please come back later to the 'queries' to check results."
			);

			onReset();
		} catch (error) {
			toast.error('Failed to enrich data. Please try again.');
		} finally {
			setIsEnriching(false);
		}
	};

	return (
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
							Maximum number of companies to search (max 50000):
						</Label>
						<div className="flex gap-2">
							<Input
								id="maxResults"
								type="number"
								min="1"
								max="50000"
								value={maxResults}
								onChange={(e) =>
									onMaxResultsChange(
										Math.min(50000, Math.max(1, parseInt(e.target.value) || 1))
									)
								}
								required
							/>
							<Button
								onClick={onSearchCompanies}
								disabled={isLoading || selectedSicCodes.length === 0}
								className="whitespace-nowrap"
							>
								{isLoading ? 'Searching...' : 'Search Companies'}
							</Button>
							{hasSearched && companies.length > 0 && (
								<Button
									onClick={handleEnrichment}
									disabled={isEnriching}
									className="whitespace-nowrap"
								>
									{isEnriching ? 'Enriching...' : 'Enrich Data'}
								</Button>
							)}
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
												Country
											</th>
										</tr>
									</thead>
									<tbody className="bg-white divide-y divide-gray-200">
										{companies.map((company) => (
											<tr key={company.number} className="hover:bg-gray-50">
												<td className="px-6 py-4 whitespace-nowrap">
													<div className="text-sm font-medium text-gray-900">
														{company.name}
													</div>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{company.number}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{company.addressLine1}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{new Date(company.dateOfCreation).toLocaleDateString(
														'en-GB'
													)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{company.country}
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
										onClick={() => onPageChange(Math.max(0, currentPage - 1))}
										disabled={
											currentPage === 0 || isLoading || isFetchingOfficers
										}
										variant="outline"
										size="sm"
									>
										Previous
									</Button>
									<Button
										onClick={() => onPageChange(currentPage + 1)}
										disabled={isLoading || isFetchingOfficers}
										variant="outline"
										size="sm"
									>
										Next
									</Button>
								</div>
							</div>
						</>
					)}
				</>
			)}
		</section>
	);
}
