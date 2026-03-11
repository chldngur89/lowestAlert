import { analyzeProductUrl } from './_lib/product-parser.js';

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
    const { url } = readBody(req);

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const data = await analyzeProductUrl(url);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : '상품 분석에 실패했습니다.',
      success: false,
    });
  }
}
