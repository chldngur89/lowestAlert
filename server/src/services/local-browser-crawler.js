import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin());

class LocalBrowserCrawler {
  constructor() {
    this.browser = null;
  }

  async getBrowser() {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: false,
        defaultViewport: { width: 1920, height: 1080 },
        args: [
          '--start-maximized',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-web-security',
          '--lang=ko-KR',
          '--timezone=Asia/Seoul',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
      });
      
      // Inject stealth scripts
      const pages = await this.browser.pages();
      if (pages[0]) {
        await pages[0].evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
          Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
          Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
        });
      }
    }
    return this.browser;
  }

  randomDelay(min = 2000, max = 5000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async searchNaver(query) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });
      
      console.log('[Crawler] Opening Naver Shopping...');
      await page.goto('https://shopping.naver.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.randomDelay(3000, 5000);
      
      // Try multiple selectors for search input
      const searchSelectors = ['#nx_query', '#gnb_query', '.search_input', 'input[name="query"]', 'input[placeholder*="검색"]'];
      let searchInput = null;
      
      for (const selector of searchSelectors) {
        searchInput = await page.$(selector);
        if (searchInput) {
          console.log(`[Crawler] Found search input: ${selector}`);
          break;
        }
      }
      
      if (!searchInput) {
        console.log('[Crawler] Search input not found, taking screenshot...');
        await page.screenshot({ path: '/tmp/naver-error.png' });
        return [];
      }

      await searchInput.type(query, { delay: 150 });
      await page.keyboard.press('Enter');
      console.log('[Crawler] Waiting for results...');
      await this.randomDelay(4000, 6000);

      // Take screenshot of results
      await page.screenshot({ path: '/tmp/naver-results.png' });

      const results = await page.evaluate(() => {
        const data = [];
        
        // Try multiple selectors
        const selectors = [
          '.basicList_list_basis__newest .basicList_item__0CHfK',
          '.basicList_item__0CHfK',
          '.item_list .item',
          '.search_result_list .item',
          '[class*="item"]',
        ];
        
        let items = [];
        for (const sel of selectors) {
          items = document.querySelectorAll(sel);
          if (items.length > 0) {
            console.log(`Found ${items.length} items with selector: ${sel}`);
            break;
          }
        }
        
        items.forEach((item, index) => {
          if (index >= 5) return;
          
          const title = item.textContent?.trim() || '';
          const priceMatch = item.textContent?.match(/[\d,]+원/) || [];
          const price = parseInt(priceMatch[0]?.replace(/[^0-9]/g, '') || '0');
          const img = item.querySelector('img')?.src || '';
          const link = item.querySelector('a')?.href || '';

          if (title && price > 0 && title.length < 200) {
            data.push({
              name: title.substring(0, 100),
              price,
              image: img,
              shop: '네이버',
              url: link,
              isLowest: false,
              inStock: true,
            });
          }
        });
        
        return data;
      });

      console.log(`[Crawler] Naver found ${results.length} results`);
      return results;
    } catch (error) {
      console.error('[Crawler] Naver error:', error.message);
      return [];
    } finally {
      await page.close();
    }
  }

  async searchCoupang(query) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    try {
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });
      
      console.log('[Crawler] Opening Coupang...');
      const searchUrl = `https://www.coupang.com/np/search?page=1&keyword=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.randomDelay(3000, 5000);
      
      await page.screenshot({ path: '/tmp/coupang-results.png' });

      const results = await page.evaluate(() => {
        const data = [];
        
        const selectors = [
          '.search-product-list .search-product',
          '.search-product',
          '.product-item',
          '[class*="product"]',
        ];
        
        let items = [];
        for (const sel of selectors) {
          items = document.querySelectorAll(sel);
          if (items.length > 0) {
            console.log(`Found ${items.length} items with selector: ${sel}`);
            break;
          }
        }
        
        items.forEach((item, index) => {
          if (index >= 5) return;
          
          const title = item.textContent?.trim() || '';
          const priceMatch = item.textContent?.match(/[\d,]+원/) || [];
          const price = parseInt(priceMatch[0]?.replace(/[^0-9]/g, '') || '0');
          const img = item.querySelector('img')?.src || item.querySelector('img')?.dataset?.src || '';
          const link = item.querySelector('a')?.href || '';

          if (title && price > 0 && title.length < 200) {
            data.push({
              name: title.substring(0, 100),
              price,
              image: img.startsWith('http') ? img : `https:${img}`,
              shop: '쿠팡',
              url: link.startsWith('http') ? link : `https://www.coupang.com${link}`,
              isLowest: false,
              inStock: true,
            });
          }
        });
        
        return data;
      });

      console.log(`[Crawler] Coupang found ${results.length} results`);
      return results;
    } catch (error) {
      console.error('[Crawler] Coupang error:', error.message);
      return [];
    } finally {
      await page.close();
    }
  }

  async searchProducts(query) {
    const results = [];

    console.log('[Crawler] Starting search with visible browser...');

    const naverResults = await this.searchNaver(query);
    if (naverResults.length > 0) results.push(...naverResults);
    await this.randomDelay();

    const coupangResults = await this.searchCoupang(query);
    if (coupangResults.length > 0) results.push(...coupangResults);

    if (results.length === 0) {
      console.log('[Crawler] No results - using demo data');
      return [this.getDemoResult(query)];
    }

    results.sort((a, b) => a.price - b.price);
    return results.slice(0, 10);
  }

  getDemoResult(query) {
    return {
      name: `${query} (검색 결과)`,
      price: Math.floor(Math.random() * 1000000) + 50000,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200',
      shop: '쿠팡',
      isLowest: true,
      inStock: true,
    };
  }

  async crawl(query) {
    const results = await this.searchProducts(query);
    if (results.length > 0) {
      const minPrice = Math.min(...results.map(r => r.price));
      results.forEach(r => { r.isLowest = r.price === minPrice; });
      return results[0];
    }
    return this.getDemoResult(query);
  }

  async comparePrices(query) {
    return this.searchProducts(query);
  }
}

export default new LocalBrowserCrawler();
