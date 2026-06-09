// Competitor Intel — Side Panel Logic

const $ = id => document.getElementById(id);

let competitors = [];
let myPricing = {};

// ─── Init ──────────────────────────────────────────────────────────

async function init() {
  setupEvents();
  loadCompetitors();
  loadMyPricing();
}

// ─── Competitors ───────────────────────────────────────────────────

function loadCompetitors() {
  chrome.runtime.sendMessage({ type: 'GET_COMPETITORS' }, (resp) => {
    if (resp?.success) {
      competitors = resp.competitors;
      renderCompetitors();
      renderComparison();
    }
  });
}

function renderCompetitors() {
  const list = $('comp-list');
  const statsGrid = $('stats-grid');
  
  $('comp-count').textContent = `${competitors.length} Kompetitor`;
  
  if (competitors.length === 0) {
    statsGrid.style.display = 'none';
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <div>Belum ada data kompetitor. Scan website untuk mulai.</div>
      </div>
    `;
    return;
  }
  
  // Stats
  const allPrices = competitors.flatMap(c => (c.prices || []).map(p => p.amount));
  if (allPrices.length > 0) {
    statsGrid.style.display = 'grid';
    $('stat-avg-price').textContent = formatRupiah(Math.round(allPrices.reduce((a, b) => a + b, 0) / allPrices.length));
    $('stat-min-price').textContent = formatRupiah(Math.min(...allPrices));
    $('stat-max-price').textContent = formatRupiah(Math.max(...allPrices));
    $('stat-portfolio').textContent = `${competitors.filter(c => c.hasPortfolio).length}/${competitors.length}`;
  } else {
    statsGrid.style.display = 'none';
  }
  
  list.innerHTML = competitors.map(c => `
    <div class="comp-card">
      <div class="comp-header">
        <div>
          <div class="comp-name">${esc(c.title || c.hostname)}</div>
          <div class="comp-url">${esc(c.hostname)}</div>
        </div>
        <button class="btn-sm btn-danger" data-delete="${esc(c.hostname)}">Hapus</button>
      </div>
      
      ${c.prices && c.prices.length > 0 ? `
        <div class="comp-prices">
          ${c.prices.slice(0, 5).map(p => `<span class="comp-price">${esc(p.formatted)}</span>`).join('')}
        </div>
      ` : '<div style="font-size:12px; color:var(--text-muted); margin:8px 0;">Tidak ada harga ditemukan</div>'}
      
      ${c.services && c.services.length > 0 ? `
        <div class="comp-services">
          ${c.services.map(s => `<span class="comp-service">${esc(s)}</span>`).join('')}
        </div>
      ` : ''}
      
      <div class="comp-meta">
        ${c.hasPortfolio ? '<span style="color:var(--green);">Portfolio</span>' : ''}
        ${c.phones && c.phones.length > 0 ? ` &middot; ${c.phones.length} phone` : ''}
        ${c.socialLinks && c.socialLinks.length > 0 ? ` &middot; ${c.socialLinks.map(s => s.platform).join(', ')}` : ''}
      </div>
      
      <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
        ${formatDate(c.timestamp || c.updatedAt)}
      </div>
    </div>
  `).join('');
  
  // Delete buttons
  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      const hostname = btn.dataset.delete;
      chrome.runtime.sendMessage({ type: 'DELETE_COMPETITOR', hostname }, () => {
        competitors = competitors.filter(c => c.hostname !== hostname);
        renderCompetitors();
        toast('Kompetitor dihapus');
      });
    });
  });
}

// ─── Comparison ────────────────────────────────────────────────────

function loadMyPricing() {
  chrome.runtime.sendMessage({ type: 'GET_MY_PRICING' }, (resp) => {
    if (resp?.success && resp.pricing) {
      myPricing = resp.pricing;
      $('price-basic').value = myPricing.basic || '';
      $('price-premium').value = myPricing.premium || '';
      $('price-fullday').value = myPricing.fullday || '';
      $('price-virtual').value = myPricing.virtual || '';
    }
  });
}

function saveMyPricing() {
  myPricing = {
    basic: parseInt($('price-basic').value) || 0,
    premium: parseInt($('price-premium').value) || 0,
    fullday: parseInt($('price-fullday').value) || 0,
    virtual: parseInt($('price-virtual').value) || 0
  };
  
  chrome.runtime.sendMessage({ type: 'SAVE_MY_PRICING', pricing: myPricing }, () => {
    toast('Harga disimpan');
    renderComparison();
  });
}

function renderComparison() {
  const list = $('comparison-list');
  const myMin = Object.values(myPricing).filter(v => v > 0).sort((a, b) => a - b)[0] || 0;
  
  if (competitors.length === 0 || myMin === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <div>${competitors.length === 0 ? 'Scan kompetitor terlebih dahulu' : 'Isi harga saya terlebih dahulu'}</div>
      </div>
    `;
    return;
  }
  
  list.innerHTML = competitors.map(c => {
    const compPrices = (c.prices || []).map(p => p.amount).filter(v => v > 0);
    const compMin = compPrices.length ? Math.min(...compPrices) : 0;
    const compMax = compPrices.length ? Math.max(...compPrices) : 0;
    
    let status, statusClass;
    if (compMin === 0) {
      status = 'Harga tidak diketahui';
      statusClass = 'same';
    } else if (myMin < compMin) {
      status = `Lebih murah ${formatRupiah(compMin - myMin)}`;
      statusClass = 'cheaper';
    } else if (myMin > compMin) {
      status = `Lebih mahal ${formatRupiah(myMin - compMin)}`;
      statusClass = 'expensive';
    } else {
      status = 'Harga sama';
      statusClass = 'same';
    }
    
    return `
      <div class="comparison-section">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-size:14px; font-weight:600;">${esc(c.title || c.hostname)}</span>
          <span class="comp-value ${statusClass}" style="font-size:12px;">${status}</span>
        </div>
        <div class="comp-row">
          <span class="comp-label">Harga termurah kompetitor</span>
          <span class="comp-value">${compMin ? formatRupiah(compMin) : '-'}</span>
        </div>
        <div class="comp-row">
          <span class="comp-label">Harga termahal kompetitor</span>
          <span class="comp-value">${compMax ? formatRupiah(compMax) : '-'}</span>
        </div>
        <div class="comp-row">
          <span class="comp-label">Harga termurah saya</span>
          <span class="comp-value">${formatRupiah(myMin)}</span>
        </div>
      </div>
    `;
  }).join('');
}

// ─── Scan ──────────────────────────────────────────────────────────

async function scanCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || tab.url?.startsWith('chrome://')) {
    toast('Tidak bisa scan halaman ini');
    return;
  }
  
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    
    chrome.tabs.sendMessage(tab.id, { type: 'SCAN_PAGE' }, (response) => {
      if (chrome.runtime.lastError || !response?.success) {
        toast('Gagal scan halaman');
        return;
      }
      
      const result = response.result;
      
      // Save to history
      chrome.runtime.sendMessage({ type: 'SCAN_COMPLETE', result });
      
      // Show last scan
      showLastScan(result);
      
      // Add to competitors list
      competitors.unshift(result);
      renderCompetitors();
      
      toast(`Ditemukan ${result.prices.length} harga, ${result.services.length} layanan`);
    });
  } catch (e) {
    toast('Error: ' + e.message);
  }
}

function showLastScan(result) {
  const container = $('last-scan');
  container.style.display = 'block';
  
  const card = $('last-scan-card');
  card.innerHTML = `
    <div class="comp-header">
      <div>
        <div class="comp-name">${esc(result.title || result.hostname)}</div>
        <div class="comp-url">${esc(result.hostname)}</div>
      </div>
    </div>
    ${result.prices.length > 0 ? `
      <div class="comp-prices">
        ${result.prices.map(p => `<span class="comp-price">${esc(p.formatted)}</span>`).join('')}
      </div>
    ` : '<div style="font-size:12px; color:var(--text-muted); margin:8px 0;">Tidak ada harga ditemukan</div>'}
    ${result.services.length > 0 ? `
      <div class="comp-services">
        ${result.services.map(s => `<span class="comp-service">${esc(s)}</span>`).join('')}
      </div>
    ` : ''}
    <div class="comp-meta">
      ${result.hasPortfolio ? '<span style="color:var(--green);">Portfolio</span>' : ''}
    </div>
  `;
}

// ─── Export ────────────────────────────────────────────────────────

function exportCSV() {
  chrome.runtime.sendMessage({ type: 'EXPORT_CSV' }, (resp) => {
    if (resp?.success) {
      const blob = new Blob([resp.csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `competitor_intel_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast('CSV exported');
    }
  });
}

// ─── Helpers ───────────────────────────────────────────────────────

function formatRupiah(num) {
  if (!num) return '-';
  return 'Rp ' + num.toLocaleString('id-ID');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Baru saja';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m lalu`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}j lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Events ────────────────────────────────────────────────────────

function setupEvents() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      $(`panel-${tab.dataset.tab}`).classList.add('active');
    });
  });
  
  $('btn-scan').addEventListener('click', scanCurrentPage);
  $('btn-save-pricing').addEventListener('click', saveMyPricing);
  $('btn-export').addEventListener('click', exportCSV);
  $('btn-clear').addEventListener('click', () => {
    if (confirm('Hapus semua data kompetitor?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_COMPETITORS' }, () => {
        competitors = [];
        renderCompetitors();
        renderComparison();
        toast('Data dihapus');
      });
    }
  });
}

// ─── Start ─────────────────────────────────────────────────────────

init();
