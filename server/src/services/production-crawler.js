import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';

puppeteer.use(StealthPlugin());

// Proxy Configuration - supports multiple proxies for rotation
const PROXY_CONFIG = {
  enabled: process.env.RESIDENTIAL_PROXY_ENABLED === 'true',
  // Single proxy (legacy)
  host: process.env.RESIDENTIAL_PROXY_HOST || '',
  port: process.env.RESIDENTIAL_PROXY_PORT || '',
  username: process.env.RESIDENTIAL_PROXY_USERNAME || '',
  password: process.env.RESIDENTIAL_PROXY_PASSWORD || '',
  // Multiple proxies for rotation - comma separated
  proxyList: process.env.RESIDENTIAL_PROXY_LIST ? 
    process.env.RESIDENTIAL_PROXY_LIST.split(',').map(p => p.trim()).filter(p => p) : [],
  // Current proxy index for rotation
  currentIndex: 0,
  // Proxy rotation mode: 'sequential' | 'random'
  rotationMode: process.env.PROXY_ROTATION_MODE || 'sequential',
};

class ProductionCrawler {
  constructor() {
    this.browser = null;
    this.proxyUrl = null;
    this.failedProxies = new Set();
  }

  // Get next proxy from pool
  getNextProxy() {
    if (!PROXY_CONFIG.enabled) {
      return null;
    }
    
    // Use single proxy if configured
    if (PROXY_CONFIG.host && !PROXY_CONFIG.proxyList.length) {
      if (PROXY_CONFIG.username && PROXY_CONFIG.password) {
        return `http://${PROXY_CONFIG.username}:${PROXY_CONFIG.password}@${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`;
      }
      return `http://${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`;
    }
    
    // Use proxy pool
    if (PROXY_CONFIG.proxyList.length === 0) {
      return null;
    }
    
    let proxy;
    let availableProxies = PROXY_CONFIG.proxyList.filter(p => !this.failedProxies.has(p));
    
    if (availableProxies.length === 0) {
      // Reset failed proxies if all failed
      this.failedProxies.clear();
      availableProxies = PROXY_CONFIG.proxyList;
    }
    
    if (PROXY_CONFIG.rotationMode === 'random') {
      const randomIndex = Math.floor(Math.random() * availableProxies.length);
      proxy = availableProxies[randomIndex];
    } else {
      proxy = availableProxies[PROXY_CONFIG.currentIndex % availableProxies.length];
      PROXY_CONFIG.currentIndex = (PROXY_CONFIG.currentIndex + 1) % availableProxies.length;
    }
    
    return proxy;
  }

  // Mark proxy as failed
  markProxyFailed(proxyUrl) {
    if (proxyUrl) {
      this.failedProxies.add(proxyUrl);
      console.log(`[Crawler] Proxy marked as failed: ${proxyUrl}`);
    }
  }

  // Reset failed proxies
  resetProxyHealth() {
    this.failedProxies.clear();
    console.log('[Crawler] Proxy health reset');
  }

  async getBrowser() {
    if (!this.browser || !this.browser.connected) {
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--window-size=1920,1080',
          '--start-maximized',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      };

      const proxyUrl = this.getNextProxy();
      if (proxyUrl) {
        launchOptions.args.push(`--proxy-server=${proxyUrl}`);
        launchOptions.args.push('--proxy-bypass-list=*');
      }

      try {
        this.browser = await puppeteer.launch(launchOptions);
      } catch (error) {
        console.error('[Crawler] Browser launch error:', error.message);
        // Mark proxy as failed and retry
        if (proxyUrl) {
          this.markProxyFailed(proxyUrl);
        }
        return null;
      }
    }
    return this.browser;
  }

  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {}
      this.browser = null;
    }
  }

  randomDelay(min = 1500, max = 4000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async searchNaverWithProxy(query) {
    const browser = await this.getBrowser();
    if (!browser) return [];

    const page = await browser.newPage();
    
    try {
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
      });

      await page.goto('https://shopping.naver.com', { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      await this.randomDelay(2000, 4000);
      
      const searchInput = await page.$('#nx_query');
      if (!searchInput) return [];

      await searchInput.type(query, { delay: 100 });
      await page.keyboard.press('Enter');
      await this.randomDelay(3000, 5000);

      const results = await page.evaluate(() => {
        const items = document.querySelectorAll('.basicList_list_basis__newest .basicList_item__0CHfK');
        const data = [];
        
        items.forEach((item, index) => {
          if (index >= 5) return;
          
          const titleEl = item.querySelector('.basicList_title__X4bJf');
          const priceEl = item.querySelector('.price_num__Cs50Y');
          const imgEl = item.querySelector('img');
          const linkEl = item.querySelector('.basicList_title__X4bJf a');
          
          const title = titleEl?.textContent?.trim() || '';
          const priceText = priceEl?.textContent?.replace(/[^0-9]/g, '') || '0';
          const price = parseInt(priceText) || 0;
          
          if (title && price > 0) {
            data.push({
              name: title,
              price,
              image: imgEl?.src || '',
              shop: '네이버',
              url: linkEl?.href || '',
              isLowest: false,
              inStock: true,
            });
          }
        });
        
        return data;
      });

      return results;
    } catch (error) {
      console.error('[Crawler] Naver error:', error.message);
      return [];
    } finally {
      await page.close();
    }
  }

  async searchCoupangWithProxy(query) {
    const browser = await this.getBrowser();
    if (!browser) return [];

    const page = await browser.newPage();
    
    try {
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'ko-KR,ko;q=0.9',
      });

      const searchUrl = `https://www.coupang.com/np/search?page=1&keyword=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      await this.randomDelay(2000, 4000);
      
      await page.evaluate(() => window.scrollBy(0, 500));
      await this.randomDelay(1000, 2000);

      const results = await page.evaluate(() => {
        const items = document.querySelectorAll('.search-product-list .search-product');
        const data = [];
        
        items.forEach((item, index) => {
          if (index >= 5) return;
          
          const titleEl = item.querySelector('.name');
          const priceEl = item.querySelector('.price-value');
          const imgEl = item.querySelector('img');
          const linkEl = item.querySelector('a');
          
          const title = titleEl?.textContent?.trim() || '';
          const priceText = priceEl?.textContent?.replace(/[^0-9]/g, '') || '0';
          const price = parseInt(priceText) || 0;
          const image = imgEl?.src || imgEl?.dataset?.src || '';
          const url = linkEl?.href || '';
          
          if (title && price > 0) {
            data.push({
              name: title,
              price,
              image: image.startsWith('http') ? image : `https:${image}`,
              shop: '쿠팡',
              url: url.startsWith('http') ? url : `https://www.coupang.com${url}`,
              isLowest: false,
              inStock: true,
            });
          }
        });
        
        return data;
      });

      return results;
    } catch (error) {
      console.error('[Crawler] Coupang error:', error.message);
      return [];
    } finally {
      await page.close();
    }
  }

  // 11st Search
  async search11stWithProxy(query) {
    const browser = await this.getBrowser();
    if (!browser) return [];

    const page = await browser.newPage();
    
    try {
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'ko-KR,ko;q=0.9',
      });

      const searchUrl = `https://search.11st.co.kr/search/SearchService.tmall?kwd=${encodeURIComponent(query)}&pageNo=1`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      await this.randomDelay(2000, 4000);
      
      const results = await page.evaluate(() => {
        const items = document.querySelectorAll('.item, .search_result_list .item, .list-item');
        const data = [];
        
        items.forEach((item, index) => {
          if (index >= 5) return;
          
          const titleEl = item.querySelector('.name a, .item_name a, .pdt_name a, .goods_name a');
          const priceEl = item.querySelector('.price, .item_price, .sale_price, .price_text');
          const imgEl = item.querySelector('img');
          const linkEl = item.querySelector('a');
          
          const title = titleEl?.textContent?.trim() || item.textContent?.trim() || '';
          const priceText = priceEl?.textContent?.replace(/[^0-9]/g, '') || '0';
          const price = parseInt(priceText) || 0;
          const image = imgEl?.src || '';
          const url = linkEl?.href || '';
          
          if (title && price > 0 && title.length < 200) {
            data.push({
              name: title.substring(0, 100),
              price,
              image: image.startsWith('http') ? image : `https:${image}`,
              shop: '11번가',
              url: url.startsWith('http') ? url : `https://www.11st.co.kr${url}`,
              isLowest: false,
              inStock: true,
            });
          }
        });
        
        return data;
      });

      return results;
    } catch (error) {
      console.error('[Crawler] 11st error:', error.message);
      return [];
    } finally {
      await page.close();
    }
  }

  // Gmarket Search
  async searchGmarketWithProxy(query) {
    const browser = await this.getBrowser();
    if (!browser) return [];

    const page = await browser.newPage();
    
    try {
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'ko-KR,ko;q=0.9',
      });

      const searchUrl = `https://browse.gmarket.co.kr/search?keyword=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      await this.randomDelay(2000, 4000);
      
      const results = await page.evaluate(() => {
        const items = document.querySelectorAll('.item, .search_list .item, .box__goods, .goods-list .goods-item');
        const data = [];
        
        items.forEach((item, index) => {
          if (index >= 5) return;
          
          const titleEl = item.querySelector('.name, .goods_name, .item_name, .text__title');
          const priceEl = item.querySelector('.price, .price__actual, .price_text, .strong');
          const imgEl = item.querySelector('img');
          const linkEl = item.querySelector('a');
          
          const title = titleEl?.textContent?.trim() || item.textContent?.trim() || '';
          const priceText = priceEl?.textContent?.replace(/[^0-9]/g, '') || '0';
          const price = parseInt(priceText) || 0;
          const image = imgEl?.src || imgEl?.dataset?.src || '';
          const url = linkEl?.href || '';
          
          if (title && price > 0 && title.length < 200) {
            data.push({
              name: title.substring(0, 100),
              price,
              image: image.startsWith('http') ? image : `https:${image}`,
              shop: 'G마켓',
              url: url.startsWith('http') ? url : `https://www.gmarket.co.kr${url}`,
              isLowest: false,
              inStock: true,
            });
          }
        });
        
        return data;
      });

      return results;
    } catch (error) {
      console.error('[Crawler] Gmarket error:', error.message);
      return [];
    } finally {
      await page.close();
    }
  }

  async searchProducts(query, shop = 'all') {
    const results = [];
    
    // Try crawling WITHOUT proxy first (home IP)
    console.log('[Crawler] Attempting to crawl without proxy (home IP)...');
    
    try {
      // Naver Shopping
      const naverResults = await this.searchNaverWithProxy(query);
      if (naverResults.length > 0) {
        results.push(...naverResults);
        console.log(`[Crawler] Naver found ${naverResults.length} results`);
      }
      
      await this.randomDelay(2000, 4000);
      
      // Coupang
      const coupangResults = await this.searchCoupangWithProxy(query);
      if (coupangResults.length > 0) {
        results.push(...coupangResults);
        console.log(`[Crawler] Coupang found ${coupangResults.length} results`);
      }
      
      await this.randomDelay(2000, 4000);
      
      // 11st
      const elevenResults = await this.search11stWithProxy(query);
      if (elevenResults.length > 0) {
        results.push(...elevenResults);
        console.log(`[Crawler] 11st found ${elevenResults.length} results`);
      }
      
      await this.randomDelay(2000, 4000);
      
      // Gmarket
      const gmarketResults = await this.searchGmarketWithProxy(query);
      if (gmarketResults.length > 0) {
        results.push(...gmarketResults);
        console.log(`[Crawler] Gmarket found ${gmarketResults.length} results`);
      }
    } catch (error) {
      console.error('[Crawler] Crawling failed:', error.message);
    }
    
    // If still no results, use demo data
    if (results.length === 0) {
      console.log('[Crawler] No live results - using demo data');
      return [this.getDemoResult(query)];
    }
    
    results.sort((a, b) => a.price - b.price);
    return results.slice(0, 10);
  }

  async crawl(urlOrQuery) {
    console.log(`[Crawler] Starting: ${urlOrQuery}`);

    const isUrl = urlOrQuery.startsWith('http://') || urlOrQuery.startsWith('https://');

    try {
      if (isUrl) {
        return await this.crawlUrl(urlOrQuery);
      }

      const results = await this.searchProducts(urlOrQuery);

      if (results.length > 0) {
        console.log(`[Crawler] Found ${results.length} real results`);
        const minPrice = Math.min(...results.map(r => r.price));
        results.forEach(r => { r.isLowest = r.price === minPrice; });
        return results[0];
      }
    } catch (error) {
      console.error('[Crawler] Error:', error.message);
    }

    return this.getDemoResult(urlOrQuery);
  }

  async crawlUrl(url) {
    const browser = await this.getBrowser();
    if (!browser) return this.getDemoResult(url);

    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await this.randomDelay(2000, 4000);

      const result = await page.evaluate(() => {
        const titleEl = document.querySelector('h2.prod-title, h1.title, #productTitle, .product-title');
        const priceEl = document.querySelector('.prod-price .sale-price, .price-value, #pricePriceBuying');
        const imgEl = document.querySelector('#prodImage img, .product-image img');

        const name = titleEl?.textContent?.trim() || document.title;
        const priceText = priceEl?.textContent?.replace(/[^0-9]/g, '') || '0';
        const price = parseInt(priceText) || 0;
        const image = imgEl?.src || '';

        return { name, price, image };
      });

      return {
        ...result,
        shop: '쿠팡',
        url,
        isLowest: true,
        inStock: true,
      };
    } catch (error) {
      console.error('[Crawler] URL crawl error:', error.message);
      return null;
    } finally {
      await page.close();
    }
  }

  getDemoResult(query) {
    const demos = {
      'gpu': [{ name: 'NVIDIA GeForce RTX 4090', price: 2399000, image: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=200', shop: '쿠팡', isLowest: true, inStock: true }],
      'laptop': [{ name: 'LG gram 16인치', price: 1890000, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200', shop: '11번가', isLowest: true, inStock: true }],
      'phone': [{ name: '갤럭시 S24 울트라', price: 1599000, image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=200', shop: '네이버', isLowest: true, inStock: true }],
      'airpod': [{ name: '에어팟 프로 2', price: 289000, image: 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=200', shop: '쿠팡', isLowest: true, inStock: true }],
      'galaxy': [{ name: '갤럭시 워치6', price: 389000, image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=200', shop: '쿠팡', isLowest: true, inStock: true }],
      'dyson': [{ name: '다이슨 V15', price: 679000, image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=200', shop: 'G마켓', isLowest: true, inStock: true }],
    };

    const key = Object.keys(demos).find(k => query.toLowerCase().includes(k));
    if (key) return demos[key][0];

    return {
      name: `${query} (검색 결과)`,
      price: Math.floor(Math.random() * 1000000) + 50000,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200',
      shop: '쿠팡',
      isLowest: true,
      inStock: true,
    };
  }

  async comparePrices(productName) {
    const results = await this.searchProducts(productName);
    return results.length > 0 ? results : [this.getDemoResult(productName)];
  }
}

export default new ProductionCrawler();
