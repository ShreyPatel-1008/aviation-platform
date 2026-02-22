export interface RawArticle {
    title: string;
    content?: string;
    description?: string;
    url: string;
    sourceName: string;
    sourceUrl?: string;
    author?: string;
    imageUrl?: string;
    publishedAt?: Date;
}

export interface ClassifiedArticle {
    category: 'ACCIDENT_INCIDENT' | 'AVIATION_TRADE' | 'REGULATION' | 'GENERAL';
    confidence: number;
    summary: string;
    keyInsights: string[];
    entities: {
        airline: string | null;
        aircraft_type: string | null;
        registration: string | null;
        location: string | null;
        event_date: string | null;
        authority: string | null;
        severity: string | null;
    };
    tags: string[];
}

export interface SourceConfig {
    name: string;
    url: string;
    type: 'rss' | 'api';
    category?: string;
}

// RSS Feed Sources
export const RSS_SOURCES: SourceConfig[] = [
    // Accidents & Incidents
    {
        name: 'The Aviation Herald',
        url: 'https://avherald.com/h?subscribe=rss',
        type: 'rss',
    },
    {
        name: 'NTSB Aviation',
        url: 'https://www.ntsb.gov/news/press-releases/_layouts/15/inplview.aspx?List=%7B8E7E7973-C295-4F36-B1F5-E2E836E74E58%7D&View=%7BDB0B4E68-812B-4371-A7A0-DE74DB67AB21%7D&ViewCount=2&IsXslView=TRUE&IsCSR=TRUE&GroupString=%3B%23Aviation%3B%23&IsGroupRender=TRUE',
        type: 'rss',
    },
    // Aviation Trades
    {
        name: 'Simple Flying',
        url: 'https://simpleflying.com/feed/',
        type: 'rss',
    },
    {
        name: 'Airways Magazine',
        url: 'https://airwaysmag.com/feed/',
        type: 'rss',
    },
    {
        name: 'FlightGlobal',
        url: 'https://www.flightglobal.com/rss',
        type: 'rss',
    },
    // Regulations
    {
        name: 'FAA Regulations',
        url: 'https://www.faa.gov/about/plans_reports/congress/media/REAUTHORIZATION_UPDATES.rss',
        type: 'rss',
    },
    {
        name: 'EASA News',
        url: 'https://www.easa.europa.eu/en/newsroom-and-events/rss',
        type: 'rss',
    },
    {
        name: 'ICAO News',
        url: 'https://www.icao.int/Newsroom/Pages/rss.aspx',
        type: 'rss',
    },
];

// Keywords for API sources
export const ACCIDENT_KEYWORDS = [
    'aviation accident',
    'plane crash',
    'aircraft crash',
    'emergency landing',
    'runway excursion',
    'aviation incident',
];

export const TRADE_KEYWORDS = [
    'aircraft delivery',
    'aircraft order',
    'airline fleet',
    'aircraft purchase',
    'aviation deal',
    'fleet expansion',
];

export const REGULATION_KEYWORDS = [
    'aviation regulation',
    'airworthiness directive',
    'FAA rule',
    'EASA directive',
    'aviation safety bulletin',
];
