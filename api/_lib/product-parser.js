const DEFAULT_HEADERS = {
  'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'cache-control': 'no-cache',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
};

const SHOP_NAME_MAP = [
  ['coupang.com', '쿠팡'],
  ['11st.co.kr', '11번가'],
  ['gmarket.co.kr', 'G마켓'],
  ['auction.co.kr', '옥션'],
  ['smartstore.naver.com', '네이버 스마트스토어'],
  ['shopping.naver.com', '네이버 쇼핑'],
  ['ssg.com', 'SSG'],
  ['musinsa.com', '무신사'],
];

const PRICE_PATTERNS = [
  /"salePrice"\s*:\s*"?([\d,]+)"?/i,
  /"discountedSalePrice"\s*:\s*"?([\d,]+)"?/i,
  /"finalPrice"\s*:\s*"?([\d,]+)"?/i,
  /"originalPrice"\s*:\s*"?([\d,]+)"?/i,
  /"price"\s*:\s*"?([\d,]+)"?/i,
  /"lowPrice"\s*:\s*"?([\d,]+)"?/i,
  /content=["']([\d,]+)["'][^>]+property=["']product:price:amount["']/i,
  /property=["']product:price:amount["'][^>]+content=["']([\d,]+)["']/i,
  /content=["']([\d,]+)["'][^>]+property=["']og:price:amount["']/i,
  /property=["']og:price:amount["'][^>]+content=["']([\d,]+)["']/i,
  />\s*([\d,]{4,})\s*원\s*</i,
];

const TITLE_PATTERNS = [
  /property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  /content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
  /name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
  /<title[^>]*>([\s\S]*?)<\/title>/i,
  /<h1[^>]*>([\s\S]*?)<\/h1>/i,
];

const IMAGE_PATTERNS = [
  /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  /name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
];

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function stripTags(value) {
  return decodeHtml(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizePrice(raw) {
  const numeric = String(raw || '').replace(/[^\d]/g, '');
  if (!numeric) return null;

  const price = Number.parseInt(numeric, 10);
  if (!Number.isFinite(price) || price <= 0) return null;

  return price;
}

function cleanTitle(title) {
  return stripTags(title)
    .replace(/\s*[|_-]\s*(쿠팡|11번가|G마켓|옥션|네이버 쇼핑|네이버 스마트스토어|SSG|무신사)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractFirst(html, patterns, transform = stripTags) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return transform(match[1]);
    }
  }
  return '';
}

function extractJsonLdBlocks(html) {
  const matches = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  const blocks = [];

  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      blocks.push(JSON.parse(raw));
    } catch {
      const sanitized = raw
        .replace(/[\u0000-\u001F]+/g, ' ')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');

      try {
        blocks.push(JSON.parse(sanitized));
      } catch {
        continue;
      }
    }
  }

  return blocks;
}

function searchStructuredData(node, state) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const entry of node) {
      searchStructuredData(entry, state);
    }
    return;
  }

  if (typeof node !== 'object') {
    return;
  }

  if (!state.title && typeof node.name === 'string') {
    state.title = cleanTitle(node.name);
  }

  if (!state.image) {
    if (typeof node.image === 'string') {
      state.image = node.image;
    } else if (Array.isArray(node.image) && typeof node.image[0] === 'string') {
      state.image = node.image[0];
    } else if (node.image?.url) {
      state.image = node.image.url;
    }
  }

  if (!state.price) {
    const offerCandidate = node.offers || node.aggregateOffer || node.aggregateRating;
    if (offerCandidate) {
      searchStructuredData(offerCandidate, state);
    }

    const directPrice = normalizePrice(node.price || node.lowPrice || node.highPrice);
    if (directPrice) {
      state.price = directPrice;
    }
  }

  for (const value of Object.values(node)) {
    if (typeof value === 'object') {
      searchStructuredData(value, state);
    }
  }
}

function inferShopName(url) {
  const hostname = new URL(url).hostname.toLowerCase();
  const match = SHOP_NAME_MAP.find(([domain]) => hostname.includes(domain));
  return match?.[1] || hostname.replace(/^www\./, '');
}

function normalizeImageUrl(imageUrl, baseUrl) {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('//')) return `https:${imageUrl}`;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;

  try {
    return new URL(imageUrl, baseUrl).toString();
  } catch {
    return imageUrl;
  }
}

function extractPrice(html, structuredState) {
  if (structuredState.price) {
    return structuredState.price;
  }

  for (const pattern of PRICE_PATTERNS) {
    const match = html.match(pattern);
    const price = normalizePrice(match?.[1]);
    if (price) {
      return price;
    }
  }

  return null;
}

function buildOffer(analysis) {
  return {
    image: analysis.image,
    inStock: true,
    isLowest: true,
    name: analysis.name,
    price: analysis.currentPrice,
    shop: analysis.shop,
    url: analysis.url,
  };
}

export function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function analyzeProductUrl(inputUrl) {
  if (!isValidUrl(inputUrl)) {
    throw new Error('상품 상세 URL만 지원합니다.');
  }

  const response = await fetch(inputUrl, {
    headers: DEFAULT_HEADERS,
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`상품 페이지를 불러오지 못했습니다. (${response.status})`);
  }

  const html = await response.text();
  const finalUrl = response.url || inputUrl;
  const structuredState = { image: '', price: null, title: '' };

  for (const block of extractJsonLdBlocks(html)) {
    searchStructuredData(block, structuredState);
  }

  const name = structuredState.title || cleanTitle(extractFirst(html, TITLE_PATTERNS));
  const currentPrice = extractPrice(html, structuredState);
  const image = normalizeImageUrl(
    structuredState.image || extractFirst(html, IMAGE_PATTERNS),
    finalUrl
  );
  const shop = inferShopName(finalUrl);

  if (!name) {
    throw new Error('상품명을 찾지 못했습니다. 공개된 상품 상세 페이지만 지원합니다.');
  }

  if (!currentPrice) {
    throw new Error('가격 정보를 찾지 못했습니다. 다른 상품 링크로 시도해 주세요.');
  }

  const checkedAt = new Date().toISOString();
  const analysis = {
    checkedAt,
    currentPrice,
    image,
    name,
    offers: [],
    originalPrice: currentPrice,
    shop,
    url: finalUrl,
  };

  analysis.offers = [buildOffer(analysis)];

  return analysis;
}

export function buildUnsupportedSearchResponse(query) {
  return {
    message:
      '현재 Vercel 배포 버전은 검색어 비교 대신 상품 상세 URL 추적에 최적화되어 있습니다.',
    query,
    results: [],
  };
}
