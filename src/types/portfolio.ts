export interface PortfolioProject {
	id: string;
	title: string;
	dateLabel: string;
	services: string[];
	shortDescription?: string;
	coverImageUrl: string;
	coverAlt: string;
	externalUrl?: string | null;
	index: number;
}
