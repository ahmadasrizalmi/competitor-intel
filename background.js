// Competitor Intel — Background Service Worker

async function getCompetitors() {
  const data = await chrome.storage.local.get('competitors');
  return data.competitors || [];
}

async function saveCompetitors(competitors) {
  await chrome.storage.local.set({ competitors });
}

async function addCompetitor(competitor) {
  const competitors = await getCompetitors();
  
  // Check if already exists
  const existing = competitors.findIndex(c => c.hostname === competitor.hostname);
  if (existing >= 0) {
    competitors[existing] = { ...competitors[existing], ...competitor, updatedAt: new Date().toISOString() };
  } else {
    competitors.unshift(competitor);
  }
  
  if (competitors.length > 100) competitors.length = 100;
  await saveCompetitors(competitors);
}

async function deleteCompetitor(hostname) {
  const competitors = await getCompetitors();
  const filtered = competitors.filter(c => c.hostname !== hostname);
  await saveCompetitors(filtered);
}

function exportCSV(competitors) {
  const headers = ['Name', 'URL', 'Min Price', 'Max Price', 'Services', 'Has Portfolio', 'Phones', 'Social Links', 'Scanned At'];
  const rows = competitors.map(c => {
    const prices = c.prices || [];
    const minPrice = prices.length ? Math.min(...prices.map(p => p.amount)) : '';
    const maxPrice = prices.length ? Math.max(...prices.map(p => p.amount)) : '';
    
    return [
      c.title || c.hostname,
      c.url,
      minPrice,
      maxPrice,
      (c.services || []).join('; '),
      c.hasPortfolio ? 'Yes' : 'No',
      (c.phones || []).join('; '),
      (c.socialLinks || []).map(s => s.platform).join('; '),
      c.timestamp || c.updatedAt || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  
  return [headers.join(','), ...rows].join('\n');
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  
  if (msg.type === 'SCAN_COMPLETE') {
    (async () => {
      await addCompetitor(msg.result);
      sendResponse({ success: true });
    })();
    return true;
  }
  
  if (msg.type === 'GET_COMPETITORS') {
    (async () => {
      const competitors = await getCompetitors();
      sendResponse({ success: true, competitors });
    })();
    return true;
  }
  
  if (msg.type === 'DELETE_COMPETITOR') {
    (async () => {
      await deleteCompetitor(msg.hostname);
      sendResponse({ success: true });
    })();
    return true;
  }
  
  if (msg.type === 'CLEAR_COMPETITORS') {
    (async () => {
      await saveCompetitors([]);
      sendResponse({ success: true });
    })();
    return true;
  }
  
  if (msg.type === 'EXPORT_CSV') {
    (async () => {
      const competitors = await getCompetitors();
      const csv = exportCSV(competitors);
      sendResponse({ success: true, csv });
    })();
    return true;
  }
  
  if (msg.type === 'GET_MY_PRICING') {
    (async () => {
      const data = await chrome.storage.local.get('myPricing');
      sendResponse({ success: true, pricing: data.myPricing || null });
    })();
    return true;
  }
  
  if (msg.type === 'SAVE_MY_PRICING') {
    (async () => {
      await chrome.storage.local.set({ myPricing: msg.pricing });
      sendResponse({ success: true });
    })();
    return true;
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

console.log('[Competitor Intel] Background loaded');
