import type { ImageSource } from './types';

export type ResolvedImage = {
  imageUrl: string;
  imageSource: ImageSource;
  imageSourceUrl?: string;
};

type WikimediaFetchOptions = {
  timeoutMs?: number;
};

const USER_AGENT = 'tournament-of-anything/1.0 (Kilo Deploy)';
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const COMMONS_BASE = 'https://commons.wikimedia.org';

const WIKIMEDIA_HEADERS: Record<string, string> = {
  'Accept': 'application/json',
  'Api-User-Agent': USER_AGENT,
  'User-Agent': USER_AGENT,
};

// In-memory cache (best-effort; survives within a single runtime instance)
const resolvedImageCache = new Map<string, ResolvedImage>();

function uniqStrings(values: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const s = v?.trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function normalizeFileName(fileName: string): string {
  return fileName.replaceAll(' ', '_');
}

function buildCommonsImageUrl(fileName: string, width: number): string {
  const normalized = normalizeFileName(fileName);
  return `${COMMONS_BASE}/wiki/Special:FilePath/${encodeURIComponent(normalized)}?width=${width}`;
}

function buildCommonsFilePageUrl(fileName: string): string {
  const normalized = normalizeFileName(fileName);
  return `${COMMONS_BASE}/wiki/File:${encodeURIComponent(normalized)}`;
}

function buildPollinationsUrl(prompt: string): string {
  const q = encodeURIComponent(prompt.trim() || 'image');
  const apiKey = process.env.NEXT_PUBLIC_POLLINATIONS_API_KEY?.trim();
  const keyParams = apiKey
    ? `&apikey=${encodeURIComponent(apiKey)}&key=${encodeURIComponent(apiKey)}`
    : '';
  return `https://image.pollinations.ai/prompt/${q}?width=1024&height=1024&nologo=true${keyParams}`;
}

async function fetchJson<T>(url: string, opts: WikimediaFetchOptions = {}): Promise<T> {
  const { timeoutMs = 6500 } = opts;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: WIKIMEDIA_HEADERS,
      signal: controller.signal,
      // Route Handlers run dynamically; keep fetch uncached and rely on our own cache.
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonOrNull<T>(url: string, opts?: WikimediaFetchOptions): Promise<T | null> {
  try {
    return await fetchJson<T>(url, opts);
  } catch {
    return null;
  }
}

type WikipediaPage = {
  pageid: number;
  title: string;
  fullurl?: string;
  thumbnail?: { source: string };
  original?: { source: string };
  pageprops?: { wikibase_item?: string };
};

type WikipediaQueryResponse = {
  query?: {
    pages?: WikipediaPage[];
  };
};

async function resolveFromWikipedia(query: string): Promise<{
  pageUrl?: string;
  title?: string;
  wikidataId?: string;
  imageUrl?: string;
} | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrsearch: query,
    gsrlimit: '1',
    redirects: '1',
    prop: 'pageimages|info|pageprops',
    inprop: 'url',
    piprop: 'thumbnail|original',
    pithumbsize: '800',
  });

  const url = `${WIKIPEDIA_API}?${params.toString()}`;
  const data = await fetchJsonOrNull<WikipediaQueryResponse>(url);
  const page = data?.query?.pages?.[0];
  if (!page) return null;

  return {
    title: page.title,
    pageUrl: page.fullurl,
    wikidataId: page.pageprops?.wikibase_item,
    imageUrl: page.original?.source ?? page.thumbnail?.source,
  };
}

type WikidataSearchResponse = {
  search?: Array<{ id: string }>;
};

async function searchWikidataId(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    format: 'json',
    language: 'en',
    uselang: 'en',
    search: query,
    limit: '1',
  });
  const url = `${WIKIDATA_API}?${params.toString()}`;
  const data = await fetchJsonOrNull<WikidataSearchResponse>(url);
  return data?.search?.[0]?.id ?? null;
}

type WikidataEntitiesResponse = {
  entities?: Record<
    string,
    WikidataEntity
  >;
};

type WikidataEntity = {
  id: string;
  claims?: Record<
    string,
    Array<{
      mainsnak?: {
        datavalue?: {
          value?: unknown;
        };
      };
    }>
  >;
};

function extractP18FileName(entity: WikidataEntity | undefined): string | null {
  const claims = entity?.claims;
  const p18 = claims?.P18;
  const raw = p18?.[0]?.mainsnak?.datavalue?.value;
  return typeof raw === 'string' && raw.trim() ? raw : null;
}

async function resolveFromCommonsViaWikidata(wikidataId: string): Promise<{ imageUrl: string; sourceUrl: string } | null> {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    ids: wikidataId,
    props: 'claims',
  });
  const url = `${WIKIDATA_API}?${params.toString()}`;
  const data = await fetchJsonOrNull<WikidataEntitiesResponse>(url);
  const entity = data?.entities?.[wikidataId];
  const fileName = extractP18FileName(entity);
  if (!fileName) return null;

  return {
    imageUrl: buildCommonsImageUrl(fileName, 800),
    sourceUrl: buildCommonsFilePageUrl(fileName),
  };
}

function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<U>
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) return;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => worker());
  return Promise.all(workers).then(() => results);
}

export async function resolveImageForName(name: string, topic: string): Promise<ResolvedImage> {
  const cacheKey = `${name.trim().toLowerCase()}|${topic.trim().toLowerCase()}`;
  const cached = resolvedImageCache.get(cacheKey);
  if (cached) return cached;

  // 1) Wikipedia lead image (enwiki)
  const wikiQueries = uniqStrings([
    name,
    topic ? `${name} ${topic}` : null,
  ]);

  let bestWiki: Awaited<ReturnType<typeof resolveFromWikipedia>> | null = null;
  for (const q of wikiQueries) {
    const wiki = await resolveFromWikipedia(q);
    if (!wiki) continue;

    bestWiki = bestWiki ?? wiki;

    if (wiki.imageUrl) {
      const resolved: ResolvedImage = {
        imageUrl: wiki.imageUrl,
        imageSource: 'wikipedia',
        imageSourceUrl: wiki.pageUrl,
      };
      resolvedImageCache.set(cacheKey, resolved);
      return resolved;
    }
  }

  // 2) Wikimedia Commons fallback via Wikidata P18
  const wikidataId =
    bestWiki?.wikidataId
      ?? (await searchWikidataId(name))
      ?? (topic ? await searchWikidataId(`${name} ${topic}`) : null);

  if (wikidataId) {
    const commons = await resolveFromCommonsViaWikidata(wikidataId);
    if (commons) {
      const resolved: ResolvedImage = {
        imageUrl: commons.imageUrl,
        imageSource: 'commons',
        imageSourceUrl: commons.sourceUrl,
      };
      resolvedImageCache.set(cacheKey, resolved);
      return resolved;
    }
  }

  // 3) Pollinations final fallback
  const resolved: ResolvedImage = {
    imageUrl: buildPollinationsUrl(`${name}`),
    imageSource: 'pollinations',
    imageSourceUrl: 'https://image.pollinations.ai/',
  };
  resolvedImageCache.set(cacheKey, resolved);
  return resolved;
}

export async function resolveImagesForItems<T extends { id: string; name: string }>(
  topic: string,
  items: T[],
  opts: { concurrency?: number } = {}
): Promise<Array<T & ResolvedImage>> {
  const { concurrency = 4 } = opts;

  return await mapWithConcurrency(items, concurrency, async (item) => {
    const resolved = await resolveImageForName(item.name, topic);
    return {
      ...item,
      ...resolved,
    };
  });
}
