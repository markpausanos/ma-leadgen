'use client';
import React, { useState } from 'react';
import { findRelevantSicCodes } from '@/actions/sic-codes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SicCode } from '@/components/types';

interface Step1SicSearchProps {
	onSicCodesFound: (sicCodes: SicCode[]) => void;
}

export default function Step1SicSearch({
	onSicCodesFound,
}: Step1SicSearchProps) {
	const [prompt, setPrompt] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			const result = await findRelevantSicCodes(prompt);
			if (result.error) {
				console.error(result.error);
				onSicCodesFound([]);
			} else {
				onSicCodesFound(result.sicCodes || []);
			}
		} catch (error) {
			console.error('Error searching SIC codes:', error);
			onSicCodesFound([]);
		} finally {
			setIsLoading(false);
		}
	};

	return (
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
				<Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
					{isLoading ? 'Searching...' : 'Search SIC Codes'}
				</Button>
			</form>
		</section>
	);
}
