import {
  analyzeProductUrl,
  buildUnsupportedSearchResponse,
  isValidUrl,
} from './_lib/product-parser.js';

function readBody(req) {
  if (typeof req.body === 'object' && req.body !== null) {
    return req.body;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = readBody(req);
    const query = body.productName || body.query || body.url || '';

    if (!query) {
      return res.status(400).json({ error: 'query is required', success: false });
    }

    if (!isValidUrl(query)) {
      return res.status(200).json({
        data: [],
        meta: buildUnsupportedSearchResponse(query),
        success: true,
      });
    }

    const data = await analyzeProductUrl(query);
    return res.status(200).json({
      data: data.offers,
      meta: { checkedAt: data.checkedAt, source: 'direct-url' },
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : '비교에 실패했습니다.',
      success: false,
    });
  }
}
