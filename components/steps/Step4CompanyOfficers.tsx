'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Company } from '@/lib/types';

interface Step4CompanyOfficersProps {
	companies: Company[];
	isFetchingOfficers: boolean;
	onEnrichOfficerData: () => void;
	isEnrichingContacts: boolean;
	showStep4: boolean;
}

export default function Step4CompanyOfficers({
	companies,
	isFetchingOfficers,
	onEnrichOfficerData,
	isEnrichingContacts,
	showStep4,
}: Step4CompanyOfficersProps) {
	const [isOpen, setIsOpen] = useState(true);

	// Only show this component if there are companies with officers and showStep4 is true
	if (
		!showStep4 ||
		!companies.some(
			(company) => company.officers && company.officers.length > 0
		)
	) {
		return null;
	}

	return (
		<section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mt-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-2xl font-semibold text-gray-900">
					Step 4: Company Officers
				</h2>
				<Button variant="ghost" size="sm" onClick={() => setIsOpen((v) => !v)}>
					{isOpen ? 'Close' : 'Open'}
				</Button>
			</div>

			{isFetchingOfficers && (
				<div className="mb-4 text-blue-600 font-medium">
					Fetching officers for all companies...
				</div>
			)}

			{isOpen && !isFetchingOfficers && (
				<>
					<div className="space-y-6">
						{companies
							.filter(
								(company) => company.officers && company.officers.length > 0
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
															{officer.officer_type}
															{officer.occupation && ` - ${officer.occupation}`}
														</p>
														{officer.nationality && (
															<p className="text-sm text-gray-500">
																{officer.nationality}
																{officer.country_of_residence &&
																	` (Resident in ${officer.country_of_residence})`}
															</p>
														)}
													</div>
													<div className="text-sm text-gray-500">
														Appointed:{' '}
														{new Date(
															officer.appointed_on
														).toLocaleDateString()}
													</div>
												</div>
											</div>
										))}
									</div>
								</div>
							))}
					</div>

					{/* Move to Apollo enrichment step */}
					<div className="mt-6 flex justify-end">
						<Button
							onClick={onEnrichOfficerData}
							variant="secondary"
							disabled={isEnrichingContacts}
						>
							{isEnrichingContacts ? 'Enriching data...' : 'Enrich with Apollo'}
						</Button>
					</div>
				</>
			)}
		</section>
	);
}
