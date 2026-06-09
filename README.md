# Competitor Price Intel Chrome Extension

Scan and compare competitor pricing for interior photography services.

## Features

- Content script scans for prices, services, contact info
- Extract: prices (Rp/IDR), services, phones, social links
- History tracking of scanned competitors
- Statistics: avg, min, max prices across competitors
- My Pricing tab to set your own prices
- Comparison view: cheaper/same/expensive vs competitors
- Export to CSV
- Apple-style UI (light theme, no AI slop)

## Install

1. Clone this repo
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the `competitor-intel` folder

## Usage

1. Click extension icon → Side panel opens
2. Navigate to competitor website
3. Click "Scan This Page"
4. View extracted prices + services
5. Go to Compare tab → Enter your prices
6. See comparison: cheaper/same/expensive
7. Export to CSV for analysis

## Price Detection

The extension detects prices in these formats:
- `Rp 1.500.000`
- `500rb per jam`
- `1.5jt per foto`
- `harga : 500 ribu`
- `price: $500`
- `mulai dari rp 500 ribu`

## Tech

- Chrome Extension Manifest V3
- Content script for page analysis
- Regex-based price extraction
- chrome.storage for persistence
- No external dependencies
