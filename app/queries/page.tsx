'use client';

import { useState, useEffect } from 'react';
import { getQueries, getLeadsByQueryId } from '@/actions/leads';
import { Query, Officer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';

export default function QueriesPage() {
	const [queries, setQueries] = useState<Query[]>([]);
	const [selectedQuery, setSelectedQuery] = useState<Query | null>(null);
	const [officers, setOfficers] = useState<Officer[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isLoadingResults, setIsLoadingResults] = useState(false);

	useEffect(() => {
		fetchQueries();
		setInterval(() => {
			fetchQueries();
		}, 10000);
	}, []);

	const fetchQueries = async () => {
		setIsLoading(true);
		try {
			const data = await getQueries();
			console.log('data', data);
			setQueries(data);
		} catch (error) {
			toast.error('Failed to fetch queries');
		} finally {
			setIsLoading(false);
		}
	};

	const handleQueryClick = async (query: Query) => {
		console.log('queryId', query.id);
		setSelectedQuery(query);
		setIsLoadingResults(true);
		try {
			const data = await getLeadsByQueryId(query.id);
			setOfficers(data);
		} catch (error) {
			toast.error('Failed to fetch results');
		} finally {
			setIsLoadingResults(false);
		}
	};

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleDateString('en-GB', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const formatDateOfBirth = (
		dob: { day?: number; month?: number; year?: number } | null
	) => {
		if (!dob) return '';

		// If we only have the year
		if (!dob.month && !dob.day && dob.year) {
			return String(dob.year);
		}

		// If we have year and month
		if (!dob.day && dob.month && dob.year) {
			const date = new Date(dob.year, dob.month - 1, 1);
			return date.toLocaleDateString('en-US', {
				month: 'short',
				year: 'numeric',
			});
		}

		// If we have all components
		if (dob.year && dob.month && dob.day) {
			const date = new Date(dob.year, dob.month - 1, dob.day);
			return date.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			});
		}

		return '';
	};

	const getQueryStatusColor = (query: Query) => {
		if (query.finishedAt) {
			return 'bg-green-100 hover:bg-green-200 border-green-200 text-green-800';
		}
		return 'bg-yellow-100 hover:bg-yellow-200 border-yellow-200 text-yellow-800';
	};

	const downloadCSV = () => {
		// Define headers
		const headers = [
			'Company Name',
			'Officer First Name',
			'Officer Last Name',
			'Role',
			'Appointed On',
			'Email',
			'Occupation',
			'Date of Birth (MMM D YYYY)',
			'Nationality',
			'Country of Residence',
		];

		// Format data
		const csvData = officers.map((officer) => {
			const [firstName, ...lastNameParts] = officer.name.split(' ');
			const lastName = lastNameParts.join(' ');

			return [
				officer.companyName,
				firstName,
				lastName,
				officer.officerType,
				officer.appointedOn,
				officer.email || '',
				officer.occupation,
				formatDateOfBirth({
					day: Number(officer.birthDay),
					month: Number(officer.birthMonth),
					year: Number(officer.birthYear),
				}),
				officer.nationality,
				officer.countryOfResidence,
			];
		});

		// Combine headers and data
		const csvContent = [
			headers.join(','),
			...csvData.map((row) =>
				row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
			),
		].join('\n');

		// Create and trigger download
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute(
			'download',
			`enriched-contacts-${new Date().toISOString().split('T')[0]}.csv`
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return (
		<div className="min-h-screen bg-white">
			<div className="max-w-6xl mx-auto px-4 py-8">
				<header className="mb-12 text-center">
					<h1 className="text-4xl font-bold mb-3 text-gray-900">
						Enrichment Queries
					</h1>
					<p className="text-lg text-gray-600">
						View your enriched company contact data
					</p>
					<Link
						href="/"
						className="text-blue-600 hover:text-blue-800 hover:underline"
					>
						Back to Home
					</Link>
				</header>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* Queries List */}
					<div className="md:col-span-1 space-y-4">
						<div className="bg-white rounded-xl border p-4">
							<h2 className="text-xl font-semibold mb-4">Queries</h2>
							<ScrollArea className="h-[calc(100vh-24rem)]">
								<div className="space-y-2 pr-4">
									{queries.length === 0 ? (
										<p className="text-gray-500">No queries found</p>
									) : (
										queries.map((query) => (
											<Button
												key={query.id}
												variant={
													selectedQuery?.id === query.id ? 'default' : 'outline'
												}
												className={cn(
													'w-full justify-start py-2 h-full',
													selectedQuery?.id !== query.id &&
														getQueryStatusColor(query)
												)}
												onClick={() => handleQueryClick(query)}
											>
												<div className="text-left">
													<p className="font-medium">
														{formatDate(query.createdAt)}
													</p>
													<p className="text-sm opacity-80">
														{query.sicCodes.join(', ')}
													</p>
													<p className="text-xs mt-1 opacity-70">
														{query.finishedAt
															? `Completed ${formatDate(query.finishedAt)}`
															: 'In Progress'}
													</p>
												</div>
											</Button>
										))
									)}
								</div>
							</ScrollArea>
						</div>
					</div>

					{/* Results Panel */}
					<div className="md:col-span-2">
						<div className="bg-white rounded-xl border p-4">
							<div className="flex justify-between items-center mb-4">
								<h2 className="text-xl font-semibold">Results</h2>
								{officers && officers.length > 0 && (
									<Button
										onClick={downloadCSV}
										variant="outline"
										className="gap-2"
									>
										<Download className="w-4 h-4" />
										Download CSV
									</Button>
								)}
							</div>
							<ScrollArea className="h-[calc(100vh-24rem)]">
								<div className="pr-4">
									{!selectedQuery ? (
										<p className="text-gray-500">
											Select a query to view results
										</p>
									) : isLoadingResults ? (
										<p className="text-gray-500">Loading results...</p>
									) : officers && officers.length === 0 ? (
										<p className="text-gray-500">No results found</p>
									) : !officers ? (
										<p className="text-gray-500">
											Getting officers still in progress...
										</p>
									) : (
										<div className="space-y-4">
											{officers &&
												officers.map((officer) => (
													<div
														key={officer.id}
														className="border rounded-lg p-4 hover:bg-gray-50"
													>
														<h3 className="font-medium">{officer.name}</h3>
														<p className="text-sm text-gray-500">
															{officer.officerType} - {officer.companyName}
														</p>
														{officer.email && (
															<p className="text-sm text-blue-600">
																{officer.email}
															</p>
														)}
														<div className="mt-2 text-sm text-gray-500">
															<p>Nationality: {officer.nationality}</p>
															<p>Occupation: {officer.occupation}</p>
															<p>Appointed: {officer.appointedOn}</p>
														</div>
													</div>
												))}
										</div>
									)}
								</div>
							</ScrollArea>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
