'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CompanyOfficer, escapeCSV } from '@/components/types';

interface Step5ApolloEnrichmentProps {
	enrichedOfficers: CompanyOfficer[];
	isEnrichingContacts: boolean;
	showStep5: boolean;
}

export default function Step5ApolloEnrichment({
	enrichedOfficers,
	isEnrichingContacts,
	showStep5,
}: Step5ApolloEnrichmentProps) {
	const [isOpen, setIsOpen] = useState(true);

	if (!showStep5) {
		return null;
	}

	// Download enriched officers as CSV
	const downloadEnrichedCSV = () => {
		const headers = [
			'Company Name',
			'Company Number',
			'Officer First Name',
			'Officer Last Name',
			'Role',
			'Appointed On',
			'Email',
			'Occupation',
			'Nationality',
			'Country of Residence',
		];

		const rows = enrichedOfficers.map((officer) => {
			// Extract email from enriched data if available
			let email = '';
			if (
				officer.enriched &&
				officer.enrichedData &&
				officer.enrichedData.person
			) {
				email = officer.enrichedData.person.email || '';
			}

			return [
				escapeCSV(officer.companyName || ''),
				escapeCSV(officer.companyNumber || ''),
				escapeCSV(officer.firstName || ''),
				escapeCSV(officer.lastName || ''),
				escapeCSV(officer.role || ''),
				escapeCSV(officer.appointedOn || ''),
				escapeCSV(email),
				escapeCSV(officer.occupation || ''),
				escapeCSV(officer.nationality || ''),
				escapeCSV(officer.countryOfResidence || ''),
			].join(',');
		});

		const csvContent = [headers.join(','), ...rows].join('\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.setAttribute('href', url);
		link.setAttribute('download', 'enriched_officers.csv');
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return (
		<section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 mt-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-2xl font-semibold text-gray-900">
					Step 5: Apollo Contact Enrichment
				</h2>
				<Button variant="ghost" size="sm" onClick={() => setIsOpen((v) => !v)}>
					{isOpen ? 'Close' : 'Open'}
				</Button>
			</div>

			{isEnrichingContacts && (
				<div className="mb-4 text-blue-600 font-medium">
					Enriching contact data with Apollo...
				</div>
			)}

			{isOpen && !isEnrichingContacts && enrichedOfficers.length > 0 && (
				<>
					<div className="space-y-6">
						<div className="border border-gray-200 rounded-lg overflow-hidden">
							<div className="bg-gray-50 px-6 py-4 flex justify-between">
								<h3 className="text-lg font-medium text-gray-900">
									Apollo Results ({enrichedOfficers.length}){' '}
									{enrichedOfficers.filter((o) => o.enrichedData?.person?.email)
										.length > 0 &&
										`- ${
											enrichedOfficers.filter(
												(o) => o.enrichedData?.person?.email
											).length
										} with emails`}
								</h3>
								<div>
									<Button
										onClick={downloadEnrichedCSV}
										variant="secondary"
										size="sm"
									>
										Download CSV
									</Button>
								</div>
							</div>
							<div className="divide-y divide-gray-200">
								{enrichedOfficers.map((officer, index) => (
									<div key={index} className="px-6 py-4">
										<div className="flex justify-between items-start">
											<div>
												<p className="font-medium text-gray-900 flex items-center">
													{officer.firstName} {officer.lastName}
												</p>
												<p className="text-sm text-gray-600">
													{officer.role}{' '}
													{officer.companyName && `at ${officer.companyName}`}
												</p>
												{officer.enrichedData?.person?.email && (
													<p className="text-sm text-blue-600">
														Email: {officer.enrichedData.person.email}
													</p>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</>
			)}

			{isOpen && !isEnrichingContacts && enrichedOfficers.length === 0 && (
				<div className="text-center py-8 text-gray-500">
					No contacts with emails found yet. Try enriching more officers.
				</div>
			)}
		</section>
	);
}
