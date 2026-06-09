// Competitor Intel — Background Service Worker

async function getCompetitors() {
  const data = await chrome.storage.local.get('competitors');
  return data.competitors || [];
}

async function saveCompetitors(competitors) {
  await chrome.storage.local.set({ competitors });
}

async function getMyPricing() {
  const data = await chrome.storage.local.get('myPricing');
  return data.myPricing || { interior: 0, exterior: 0, product: 0, event: 0 };
}

async function saveMyPricing(pricing) {
  await chrome.storage.local.set({ myPricing: pricing });
}

// ─── Message Handler ─────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  
  if (msg.type === 'GET_COMPETITORS') {
    (async () => {
      const competitors = await getCompetitors();
      sendResponse({ success: true, competitors });
    })();
    return true;
  }
  
  if (msg.type === 'ADD_COMPETITOR') {
    (async () => {
      const competitors = await getCompetitors();
      const idx = competitors.findIndex(c => c.id === msg.competitor.id);
      if (idx >= 0) {
        competitors[idx] = msg.competitor;
      } else {
        competitors.push(msg.competitor);
      }
      await saveCompetitors(competitors);
      sendResponse({ success: true });
    })();
    return true;
  }
  
  if (msg.type === 'DELETE_COMPETITOR') {
    (async () => {
      const competitors = await getCompetitors();
      const filtered = competitors.filter(c => c.id !== msg.competitorId);
      await saveCompetitors(filtered);
      sendResponse({ success: true });
    })();
    return true;
  }
  
  if (msg.type === 'GET_MY_PRICING') {
    (async () => {
      const pricing = await getMyPricing();
      sendResponse({ success: true, pricing });
    })();
    return true;
  }
  
  if (msg.type === 'SAVE_MY_PRICING') {
    (async () => {
      await saveMyPricing(msg.pricing);
      sendResponse({ success: true });
    })();
    return true;
  }
  
  if (msg.type === 'EXPORT_COMPETITORS') {
    (async () => {
      const competitors = await getCompetitors();
      const csv = [
        'name,url,prices,services,date',
        ...competitors.map(c => 
          `"${(c.name||'').replace(/"/g,'""')}","${c.url||''}","${(c.prices||[]).join('; ')}","${(c.services||[]).join('; ')}","${c.date}"`
        )
      ].join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      chrome.downloads.download({
        url,
        filename: `competitors-${new Date().toISOString().split('T')[0]}.csv`,
        saveAs: true
      }, () => {
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        sendResponse({ success: true });
      });
    })();
    return true;
  }
  
  return true;
});

// ─── Content Script Injection ────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && 
      (tab.url.includes('http://') || tab.url.includes('https://'))) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    }).catch(() => {});
  }
});

// ─── Open Side Panel ──────────────────────────────────────────────


console.log('[Competitor Intel] Background loaded');
