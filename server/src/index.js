import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import productionCrawler from './services/production-crawler.js';
import localBrowserCrawler from './services/local-browser-crawler.js';
import { db } from './services/database.js';
import { startScheduler } from './services/scheduler.js';
import { crawlCache, rateLimiter } from './services/redis.js';

const app = express();
const PORT = process.env.PORT || 3001;

const CRAWLER_MODE = process.env.CRAWLER_MODE || 'local-browser';

console.log('[Server] CRAWLER_MODE:', CRAWLER_MODE);

let crawler;
switch (CRAWLER_MODE) {
  case 'puppeteer':
    crawler = productionCrawler;
    break;
  case 'local-browser':
  default:
    crawler = localBrowserCrawler;
}

console.log('[Server] Using crawler:', CRAWLER_MODE);

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  const cacheStats = await crawlCache.getStats();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: CRAWLER_MODE,
    cache: cacheStats,
  });
});

// Crawl single URL
app.post('/api/analyze', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`[Server] Analyzing URL: ${url}`);
    
    const result = await crawler.crawl(url);
    
    if (!result) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Server] Error:', error.message);
    res.status(500).json({ error: 'Failed to analyze product' });
  }
});

// Compare prices across shops - WITH REDIS CACHE
app.post('/api/compare', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { productName } = req.body;
    
    if (!productName) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    // Rate Limiting Check
    const clientId = req.ip || 'anonymous';
    const rateLimit = await rateLimiter.checkLimit(clientId, 10, 60);
    
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Limit: 10 requests per minute. Retry after ${Math.ceil((rateLimit.resetTime - Date.now()) / 1000)}s`,
        resetTime: rateLimit.resetTime,
      });
    }

    console.log(`[Server] Comparing prices for: ${productName}`);
    
    // 1. Check Redis Cache First
    let results = await crawlCache.get(productName);
    let cacheHit = false;
    
    if (results) {
      cacheHit = true;
      console.log(`[Server] Cache HIT for "${productName}" - Skipping crawl`);
    } else {
      // 2. Cache Miss - Do actual crawling
      console.log(`[Server] Cache MISS for "${productName}" - Starting crawl...`);
      results = await crawler.comparePrices(productName);
      
      // 3. Save to Redis Cache (1 hour TTL)
      if (results && results.length > 0) {
        await crawlCache.set(productName, results, 3600);
      }
    }
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      data: results,
      meta: {
        cacheHit,
        duration: `${duration}ms`,
        remainingRequests: rateLimit.remaining,
      },
    });
  } catch (error) {
    console.error('[Server] Error:', error.message);
    res.status(500).json({ error: 'Failed to compare prices' });
  }
});

// Clear cache for specific product (manual refresh)
app.post('/api/cache/clear', async (req, res) => {
  try {
    const { productName } = req.body;
    
    if (productName) {
      await crawlCache.delete(productName);
      res.json({ success: true, message: `Cache cleared for "${productName}"` });
    } else {
      // Clear all crawl cache
      const redis = (await import('./services/redis.js')).default;
      const keys = await redis.keys('crawl:*');
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      res.json({ success: true, message: `Cleared ${keys.length} cached items` });
    }
  } catch (error) {
    console.error('[Server] Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// Get cache statistics
app.get('/api/cache/stats', async (req, res) => {
  try {
    const stats = await crawlCache.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

// ==================== DATABASE API ROUTES ====================

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const { userId } = req.query;
    const products = await db.getAllProducts(userId);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('[Server] Error getting products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
});

// Create product
app.post('/api/products', async (req, res) => {
  try {
    const { name, shop, currentPrice, originalPrice, image, userId } = req.body;
    
    if (!name || !currentPrice) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const product = await db.createProduct({
      name,
      shop: shop || 'Unknown',
      currentPrice,
      originalPrice: originalPrice || currentPrice,
      image: image || '',
      userId,
    });

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('[Server] Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product price (triggered by frontend auto-crawl)
app.post('/api/products/:id/update-price', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPrice, shop, isLowest } = req.body;

    const updated = await db.updateProductPrice(
      parseInt(id),
      newPrice,
      shop,
      isLowest
    );

    if (!updated) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[Server] Error updating price:', error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteProduct(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('[Server] Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Get unread alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const { userId } = req.query;
    const alerts = await db.getUnreadAlerts(userId);
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('[Server] Error getting alerts:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

// Mark alert as read
app.post('/api/alerts/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    await db.markAlertAsRead(parseInt(id));
    res.json({ success: true });
  } catch (error) {
    console.error('[Server] Error marking alert as read:', error);
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

// ==================== START SERVER ====================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Crawler Mode: ${CRAWLER_MODE}`);
  console.log(`⚡ Redis Cache: Enabled`);
  console.log(`📡 Endpoints:`);
  console.log(`   POST /api/analyze        - Analyze product URL`);
  console.log(`   POST /api/compare        - Compare prices (CACHED)`);
  console.log(`   POST /api/cache/clear    - Clear cache`);
  console.log(`   GET  /api/cache/stats    - Cache statistics`);
  console.log(`   GET  /api/products       - Get all products`);
  console.log(`   POST /api/products       - Create new product`);
  console.log(`   GET  /api/alerts         - Get unread alerts`);
  
  if (CRAWLER_MODE === 'local-browser') {
    console.log(`\n⚠️  Visible browser will open!`);
    console.log(`   Don't close the browser window while crawling.`);
  }

  // Start background scheduler
  startScheduler();
});
