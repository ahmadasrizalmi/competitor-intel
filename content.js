// Competitor Intel — Content Script
// Scans page for pricing, services, and competitor info

(function() {
  'use strict';
  
  if (window.__compIntelInjected) return;
  window.__compIntelInjected = true;
  
  function scanPage() {
    const text = document.body.innerText.toLowerCase();
    const url = window.location.href;
    const hostname = window.location.hostname;
    const title = document.title;
    
    // Extract prices (Rp, IDR, dollar)
    const prices = [];
    const pricePatterns = [
      /rp[\s.]*(\d[\d.,]*)\s*(ribu|jt|miliar|k)?/gi,
      /(\d[\d.,]*)\s*(ribu|jt|miliar|rb|k)\s*(per|\/)?\s*(jam|hour|foto|photo|package|paket)?/gi,
      /harga\s*[:\s]*(\d[\d.,]*)\s*(ribu|jt|k)?/gi,
      /price\s*[:\s]*[\$]?(\d[\d.,]*)/gi,
      /mulai\s*(dari)?\s*[:\s]*rp?\s*(\d[\d.,]*)\s*(ribu|jt)?/gi,
      /start\s*(from)?\s*[:\s]*[\$]?(\d[\d.,]*)/gi
    ];
    
    for (const pattern of pricePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let amount = match[1] || match[2];
        if (!amount) continue;
        
        // Clean and parse
        let num = parseFloat(amount.replace(/[.,]/g, ''));
        if (isNaN(num)) continue;
        
        // Scale
        const suffix = (match[2] || match[1] || '').toLowerCase();
        if (suffix.includes('ribu') || suffix.includes('rb') || suffix.includes('k')) num *= 1000;
        else if (suffix.includes('jt') || suffix.includes('miliar')) num *= 1000000;
        
        if (num >= 100000 && num <= 50000000) { // Reasonable photography price range
          prices.push({
            raw: match[0],
            amount: num,
            formatted: formatRupiah(num)
          });
        }
      }
    }
    
    // Extract services
    const services = [];
    const serviceKeywords = [
      'foto interior', 'interior photography', 'fotografer interior',
      'video', 'drone', 'virtual tour', '360', 'editing',
      'retouch', 'color grading', 'same day', 'next day',
      'paket', 'package', 'basic', 'premium', 'pro'
    ];
    
    for (const keyword of serviceKeywords) {
      if (text.includes(keyword)) {
        services.push(keyword);
      }
    }
    
    // Extract contact info
    const phones = [];
    const phonePatterns = [
      /(?:\+62|62|0)[\s-]?\d{3}[\s-]?\d{4}[\s-]?\d{3,4}/g,
      /wa\.me\/(\d+)/g,
      /api\.whatsapp\.com\/send\?phone=(\d+)/g
    ];
    
    for (const pattern of phonePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        let phone = match[1] || match[0];
        phone = phone.replace(/[\s-]/g, '');
        if (phone.length >= 10) phones.push(phone);
      }
    }
    
    // Social links
    const socialLinks = [];
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href;
      if (href.includes('instagram.com')) socialLinks.push({ platform: 'instagram', url: href });
      if (href.includes('tiktok.com')) socialLinks.push({ platform: 'tiktok', url: href });
      if (href.includes('youtube.com')) socialLinks.push({ platform: 'youtube', url: href });
    });
    
    // Portfolio indicators
    const hasPortfolio = !!(
      document.querySelector('[class*="portfolio"]') ||
      document.querySelector('[class*="gallery"]') ||
      document.querySelector('[class*="work"]') ||
      text.includes('portofolio') || text.includes('portfolio')
    );
    
    return {
      url,
      hostname,
      title,
      timestamp: new Date().toISOString(),
      prices: [...new Map(prices.map(p => [p.amount, p])).values()].slice(0, 10),
      services: [...new Set(services)],
      phones: [...new Set(phones)].slice(0, 3),
      socialLinks: socialLinks.slice(0, 5),
      hasPortfolio,
      hasPricing: prices.length > 0
    };
  }
  
  function formatRupiah(num) {
    return 'Rp ' + num.toLocaleString('id-ID');
  }
  
  // Message handler
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'SCAN_PAGE') {
      try {
        const result = scanPage();
        sendResponse({ success: true, result });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
    }
    return true;
  });
  
  console.log('[Competitor Intel] Content script loaded');
})();
