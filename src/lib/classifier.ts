
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ClassifiedArticle } from './sources';

const CLASSIFICATION_PROMPT = `You are an expert Aviation Intelligence AI Agent.Classify this aviation news article into exactly one category with high accuracy.
ALSO EXTRACT KEY EXECUTIVE INSIGHTS AND RISK LEVEL.

    CATEGORIES:
- ACCIDENT_INCIDENT: Any aviation crash, accident, emergency landing, near - miss, runway excursion, bird strike, hull loss, or safety - related incident.
- AVIATION_TRADE: Any news about aircraft purchase, sale, lease, delivery, fleet orders, MRO contracts, aviation finance, or business deals.
- REGULATION: Any new rule, amendment, airworthiness directive(AD), NOTAM, safety bulletin, or policy update by ICAO, FAA, EASA, DGCA, or any aviation authority.
- GENERAL: Aviation news that does not clearly fit the above three categories.

STRICT RULES:
- Respond ONLY with valid JSON.No markdown, no explanation, no extra text.
- Base classification on content, not source name.
- Never hallucinate facts — only extract entities explicitly stated.
- If content is too short to classify, set confidence below 0.50.

    INPUT:
Title: { TITLE }
Source: { SOURCE }
Content: { CONTENT }

RESPOND WITH ONLY THIS JSON:
{
    "category": "ACCIDENT_INCIDENT | AVIATION_TRADE | REGULATION | GENERAL",
        "confidence": 0.95,
            "summary": "Concise 3-sentence summary of the entire article context, capturing the main event and its implications. DO NOT just repeat the title.",
                "keyInsights": [
                    "Critical takeaway 1 (e.g. 'FAA investigation launched')",
                    "Critical takeaway 2 (e.g. 'Flight ops suspended')",
                    "Critical takeaway 3",
                    "Critical takeaway 4"
                ],
                    "entities": {
        "airline": "string or null",
            "aircraft_type": "string or null",
                "registration": "string or null",
                    "location": "string or null",
                        "event_date": "YYYY-MM-DD or null",
                            "authority": "FAA | ICAO | EASA | DGCA | other | null",
                                "severity": "minor | serious | fatal | unknown | null"
    },
    "tags": ["tag1", "tag2", "tag3"]
} `;

export async function classifyArticle(
    title: string,
    source: string,
    content: string
): Promise<ClassifiedArticle> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        // Fallback: rule-based classification when no API key
        return fallbackClassify(title, content);
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const prompt = CLASSIFICATION_PROMPT
            .replace('{TITLE}', title)
            .replace('{SOURCE}', source)
            .replace('{CONTENT}', (content || '').slice(0, 3000));

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Extract JSON from response (handle potential markdown wrapping)
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn('[Classifier] No JSON found in response, using fallback');
            return fallbackClassify(title, content);
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate category
        const validCategories = ['ACCIDENT_INCIDENT', 'AVIATION_TRADE', 'REGULATION', 'GENERAL'];
        if (!validCategories.includes(parsed.category)) {
            parsed.category = 'GENERAL';
        }

        // Clamp confidence
        parsed.confidence = Math.max(0, Math.min(1, parsed.confidence || 0.5));

        // Ensure new fields exist
        if (!Array.isArray(parsed.keyInsights)) parsed.keyInsights = [];

        // Map extracted severity to top-level if present in entities
        if (parsed.entities?.severity) {
            // Keep it in entities, but consumption layer can use it
        }

        return parsed as ClassifiedArticle;
    } catch (error) {
        console.error('[Classifier] AI classification failed:', error instanceof Error ? error.message : error);
        return fallbackClassify(title, content);
    }
}

function fallbackClassify(title: string, content: string): ClassifiedArticle {
    const text = `${title} ${content} `.toLowerCase();

    const accidentWords = ['crash', 'accident', 'emergency landing', 'incident', 'bird strike', 'runway excursion', 'hull loss', 'fatalities', 'injured', 'wreckage'];
    const tradeWords = ['order', 'delivery', 'purchase', 'lease', 'fleet', 'mro', 'deal', 'contract', 'billion', 'acquisition'];
    const regulationWords = ['regulation', 'directive', 'notam', 'faa', 'easa', 'icao', 'dgca', 'amendment', 'compliance', 'airworthiness', 'bulletin'];

    const accidentScore = accidentWords.filter(w => text.includes(w)).length;
    const tradeScore = tradeWords.filter(w => text.includes(w)).length;
    const regulationScore = regulationWords.filter(w => text.includes(w)).length;

    let category: ClassifiedArticle['category'] = 'GENERAL';
    let confidence = 0.4;

    if (accidentScore > tradeScore && accidentScore > regulationScore && accidentScore > 0) {
        category = 'ACCIDENT_INCIDENT';
        confidence = Math.min(0.85, 0.4 + accidentScore * 0.15);
    } else if (tradeScore > accidentScore && tradeScore > regulationScore && tradeScore > 0) {
        category = 'AVIATION_TRADE';
        confidence = Math.min(0.85, 0.4 + tradeScore * 0.15);
    } else if (regulationScore > 0) {
        category = 'REGULATION';
        confidence = Math.min(0.85, 0.4 + regulationScore * 0.15);
    }

    return {
        category,
        confidence,
        summary: (content && content.length > 50) ? `${content.slice(0, 250)}...` : (title.length > 100 ? `${title.slice(0, 100)}...` : title),
        keyInsights: [],
        entities: {
            airline: null,
            aircraft_type: null,
            registration: null,
            location: null,
            event_date: null,
            authority: null,
            severity: null,
        },
        tags: category === 'GENERAL' ? ['aviation', 'news'] : [category.toLowerCase().replace('_', ' '), 'aviation'],
    };
}
