import cron from 'node-cron';
import productionCrawler from './production-crawler.js';
import { db } from './database.js';
import { sendPushNotification } from './notifications.js';

// Track running status to prevent overlapping
let isRunning = false;

export function startScheduler() {
  console.log('[Scheduler] Starting background crawler scheduler...');
  
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    if (isRunning) {
      console.log('[Scheduler] Previous job still running, skipping...');
      return;
    }

    isRunning = true;
    console.log(`[Scheduler] Starting auto-crawl at ${new Date().toISOString()}`);

    try {
      // Get all products from database
      const products = await db.getAllProducts();
      console.log(`[Scheduler] Found ${products.length} products to crawl`);

      for (const product of products) {
        try {
          console.log(`[Scheduler] Crawling: ${product.name}`);
          
          // Crawl current prices
          const results = await productionCrawler.comparePrices(product.name);
          
          if (results && results.length > 0) {
            // Find lowest price
            const lowestResult = results.reduce((min, current) =>
              current.price < min.price ? current : min
            );

            // Update database
            const updated = await db.updateProductPrice(
              product.id,
              lowestResult.price,
              lowestResult.shop,
              lowestResult.isLowest
            );

            // Send push notification if price dropped
            if (updated && product.userId && lowestResult.price < product.currentPrice) {
              const user = await db.prisma.user.findUnique({
                where: { id: product.userId },
              });

              if (user?.fcmToken) {
                await sendPushNotification(user.fcmToken, {
                  title: '🔥 가격 하락 알림!',
                  body: `${product.name} 가격이 ${product.currentPrice - lowestResult.price}원 낮아졌어요!`,
                  data: {
                    productId: product.id.toString(),
                    type: 'price_drop',
                  },
                });
              }
            }

            console.log(`[Scheduler] Updated ${product.name}: ${lowestResult.price}원`);
          }

          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`[Scheduler] Failed to crawl ${product.name}:`, error);
        }
      }

      console.log(`[Scheduler] Auto-crawl completed at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[Scheduler] Error in auto-crawl:', error);
    } finally {
      isRunning = false;
    }
  });

  // Also run immediately on startup
  console.log('[Scheduler] Scheduler started successfully');
}
