'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SicCode } from '@/lib/types';

interface Step2SicSelectionProps {
	sicCodes: SicCode[];
	selectedSicCodes: string[];
	onToggleSicCode: (code: string) => void;
	onFindCompanies: () => void;
	isLoading: boolean;
}

export default function Step2SicSelection({
	sicCodes,
	selectedSicCodes,
	onToggleSicCode,
	onFindCompanies,
	isLoading,
}: Step2SicSelectionProps) {
	return (
		<section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
			<h2 className="text-2xl font-semibold mb-4 text-gray-900">
				Step 2: Select Relevant SIC Codes
			</h2>
			<div className="space-y-3">
				{sicCodes.map((sic) => (
					<div
						key={sic.sic}
						className="flex items-center p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
						onClick={() => onToggleSicCode(sic.sic)}
					>
						<Checkbox
							id={`sic-${sic.sic}`}
							checked={selectedSicCodes.includes(sic.sic)}
							onCheckedChange={() => onToggleSicCode(sic.sic)}
						/>
						<div className="ml-4">
							<span className="font-medium text-gray-900">{sic.sic}</span>
							<span className="mx-2 text-gray-400">-</span>
							<span className="text-gray-600">{sic.description}</span>
						</div>
					</div>
				))}
			</div>
			<div className="mt-6">
				<Button
					onClick={onFindCompanies}
					disabled={selectedSicCodes.length === 0 || isLoading}
					className="w-full sm:w-auto"
				>
					{isLoading ? 'Fetching...' : 'Find Companies'}
				</Button>
			</div>
		</section>
	);
}
