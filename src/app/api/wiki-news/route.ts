import { NextResponse } from 'next/server';

const UA = 'AviationIQ/1.0';

// Aviation-related keywords for filtering
const AVIATION_KEYWORDS = [
    'aviation', 'aircraft', 'airline', 'airport', 'flight', 'airplane', 'aeroplane',
    'boeing', 'airbus', 'embraer', 'bombardier', 'lockheed', 'northrop',
    'crash', 'air crash', 'plane crash', 'air disaster',
    'faa', 'icao', 'easa', 'iata', 'ntsb',
    'pilot', 'cockpit', 'runway', 'takeoff', 'landing', 'turbulence',
    'helicopter', 'drone', 'uav',
    'air force', 'air strike', 'airspace',
    'air traffic', 'air travel', 'air transport',
    'jet', 'cargo plane', 'freighter',
    'grounding', 'air safety', 'aviation safety',
];

interface WikiNewsEntry {
    date: string;
    headline: string;
    description: string;
    wikipediaUrl: string;
    category: string;
    matchedKeywords: string[];
}

// ─── Wikitext cleaning ──────────────────────────────────────

function cleanWikitext(text: string): string {
    return text
        // Remove templates like {{...}}
        .replace(/\{\{[^{}]*\}\}/g, '')
        // Remove HTML comments
        .replace(/<!--[\s\S]*?-->/g, '')
        // Remove refs
        .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
        .replace(/<ref[^>]*\/>/gi, '')
        // Remove HTML tags
        .replace(/<[^>]+>/g, '')
        // Convert wikilinks [[Target|Display]] → Display, [[Target]] → Target
        .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2')
        // Remove external links [http://... text]
        .replace(/\[https?:\/\/[^\s\]]*\s+([^\]]+)\]/g, '$1')
        .replace(/\[https?:\/\/[^\]\s]+\]/g, '')
        // Remove bold/italic markup
        .replace(/'{2,3}/g, '')
        // Clean HTML entities
        .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&[a-z]+;/gi, '')
        // Remove citation brackets [1], [2]
        .replace(/\[\d+\]/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim();
}

function extractWikiLink(text: string): string | null {
    const match = text.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/);
    if (match) {
        return `https://en.wikipedia.org/wiki/${encodeURIComponent(match[1].replace(/ /g, '_'))}`;
    }
    return null;
}

function categorizeEntry(text: string): string {
    const lower = text.toLowerCase();
    if (/crash|disaster|accident|incident|emergency|death|fatal|kill|wreck/.test(lower)) return 'ACCIDENT';
    if (/order|deal|merger|acquisition|contract|deliver|purchase|buy|sell|billion|million/.test(lower)) return 'TRADE';
    if (/regulation|law|ban|rule|policy|faa|easa|icao|sanction|restrict/.test(lower)) return 'REGULATION';
    if (/military|air force|strike|bomb|war|defense|missile/.test(lower)) return 'MILITARY';
    return 'GENERAL';
}

function matchesAviation(text: string): string[] {
    const lower = text.toLowerCase();
    return AVIATION_KEYWORDS.filter(kw => lower.includes(kw));
}

// ─── Parse Current Events wikitext ──────────────────────────

function parseCurrentEvents(wikitext: string): WikiNewsEntry[] {
    const entries: WikiNewsEntry[] = [];

    // Split by date headers like ===February 24, 2026=== or ===February 24===
    const dateSections = wikitext.split(/^={2,3}\s*/m);

    let currentDate = '';

    for (const section of dateSections) {
        // Check if this starts with a date
        const dateMatch = section.match(/^([A-Z][a-z]+ \d{1,2}(?:, \d{4})?)\s*={2,3}/);
        if (dateMatch) {
            currentDate = dateMatch[1];
            // Process the rest of the section for bullet points
            const content = section.substring(dateMatch[0].length);
            const bullets = content.split(/\n\s*\*/);

            for (const bullet of bullets) {
                const trimmed = bullet.trim();
                if (!trimmed || trimmed.length < 10) continue;

                const rawText = trimmed;
                const matched = matchesAviation(rawText);

                if (matched.length > 0) {
                    const wikiUrl = extractWikiLink(rawText) || 'https://en.wikipedia.org/wiki/Portal:Current_events';
                    const cleaned = cleanWikitext(rawText);
                    if (cleaned.length < 10) continue;

                    // Split into headline (first sentence) and description (rest)
                    const firstDot = cleaned.indexOf('. ');
                    const headline = firstDot > 0 ? cleaned.substring(0, firstDot + 1) : cleaned;
                    const description = firstDot > 0 ? cleaned.substring(firstDot + 2) : '';

                    entries.push({
                        date: currentDate,
                        headline,
                        description,
                        wikipediaUrl: wikiUrl,
                        category: categorizeEntry(cleaned),
                        matchedKeywords: matched.slice(0, 5),
                    });
                }
            }
        }
    }

    return entries;
}

// ─── Main API handler ───────────────────────────────────────

export async function GET() {
    try {
        const now = new Date();
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ];

        // Fetch last 7 days of news
        const daysToFetch = 7;
        const fetchPromises = [];

        for (let i = 0; i < daysToFetch; i++) {
            const date = new Date();
            date.setDate(now.getDate() - i);

            const year = date.getFullYear();
            const month = monthNames[date.getMonth()];
            const day = date.getDate();
            const pageTitle = `Portal:Current_events/${year}_${month}_${day}`;
            const displayDate = `${month} ${day}, ${year}`;

            fetchPromises.push(
                fetch(
                    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2`,
                    { headers: { 'User-Agent': UA }, next: { revalidate: 3600 } }
                ).then(async (res) => {
                    if (!res.ok) return { date: displayDate, content: '' };
                    const data = await res.json();
                    const page = data?.query?.pages?.[0];
                    if (page?.missing) return { date: displayDate, content: '' };
                    const slot = page?.revisions?.[0]?.slots?.main;
                    const wt = typeof slot === 'string' ? slot : slot?.content || '';
                    return { date: displayDate, content: wt };
                }).catch(() => ({ date: displayDate, content: '' }))
            );
        }

        const results = await Promise.all(fetchPromises);
        let allEntries: WikiNewsEntry[] = [];

        for (const res of results) {
            if (!res.content) continue;

            // Daily subpages use bullet points starting with * or ** for headlines
            // Format: * Main news item
            // OR: * '''Category'''
            //    ** News item
            const lines = res.content.split('\n');
            let currentCategory = '';

            for (const line of lines) {
                const trimmed = line.trim();

                // Track category headers like * '''Armed conflicts and attacks'''
                const catMatch = trimmed.match(/^\*\s*'''(.+?)'''/);
                if (catMatch) {
                    currentCategory = catMatch[1];
                    continue;
                }

                // Match news items: either * text or ** text
                const itemMatch = trimmed.match(/^(\*\*?)\s*(.+)/);
                if (itemMatch) {
                    const rawText = itemMatch[2];
                    const matched = matchesAviation(rawText);

                    if (matched.length > 0) {
                        const wikiUrl = extractWikiLink(rawText) || `https://en.wikipedia.org/wiki/Portal:Current_events/${res.date.replace(/ /g, '_').replace(',', '')}`;
                        const cleaned = cleanWikitext(rawText);

                        if (cleaned.length < 15) continue;

                        // Split into headline and description if possible
                        const firstDot = cleaned.indexOf('. ');
                        const headline = firstDot > 0 ? cleaned.substring(0, firstDot + 1) : cleaned;
                        const description = firstDot > 0 ? cleaned.substring(firstDot + 2) : '';

                        allEntries.push({
                            date: res.date,
                            headline,
                            description,
                            wikipediaUrl: wikiUrl,
                            category: categorizeEntry(cleaned),
                            matchedKeywords: matched.slice(0, 5),
                        });
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            source: 'Wikipedia Portal:Current_events (Daily Pages)',
            count: allEntries.length,
            entries: allEntries,
        });

    } catch (error) {
        console.error('[Wiki News API]', error instanceof Error ? error.message : error);
        return NextResponse.json({ success: false, error: 'Failed to fetch Wikipedia news' }, { status: 500 });
    }
}
