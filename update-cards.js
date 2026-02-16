#!/usr/bin/env node
/**
 * Script to update all card HTML structures in figma-gallery.html
 * Adds: preview divs, platform badges, data-platform attributes, content wrappers
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'figma-gallery.html');
let html = fs.readFileSync(filePath, 'utf-8');

console.log('📝 Starting card structure updates...\n');

let updateCount = 0;

// Function to determine platform from dimensions
function getPlatform(dims) {
  if (!dims) return 'web';

  // Mobile indicators
  if (dims.includes('360×800') || dims.includes('375×812') || dims.includes('414×896')) {
    return 'mobile';
  }

  // Desktop/Web indicators
  if (dims.includes('1366×768') || dims.includes('1920×1080') || dims.includes('1792×962') || dims.includes('1440×')) {
    return 'web';
  }

  // Default to web
  return 'web';
}

// Function to get badge class
function getBadgeClass(platform) {
  return platform; // 'mobile' or 'web'
}

// Regex to match card structure
const cardRegex = /<a class="card" href="([^"]+)" target="_blank" data-name="([^"]+)">\s*<div class="name" title="([^"]+)">([^<]+)<\/div>\s*<div class="dims">([^<]*)<\/div>\s*<div class="colors">([\s\S]*?)<\/div>\s*<div class="texts">([^<]*)<\/div>\s*<span class="open-figma">([^<]+)<\/span>\s*<\/a>/g;

html = html.replace(cardRegex, (match, href, dataName, title, name, dims, colors, texts, linkText) => {
  updateCount++;

  const platform = getPlatform(dims);
  const badgeClass = getBadgeClass(platform);
  const badgeLabel = platform.charAt(0).toUpperCase() + platform.slice(1);

  // Determine placeholder icon based on platform
  const placeholderIcon = platform === 'mobile' ? '📱' : '💻';

  return `<a class="card" href="${href}" target="_blank" data-name="${dataName}" data-platform="${platform}">
          <div class="card-preview">
            <div class="placeholder">${placeholderIcon}</div>
            <span class="card-badge ${badgeClass}">${badgeLabel}</span>
          </div>
          <div class="card-content">
            <div class="name" title="${title}">${name}</div>
            <div class="dims">${dims}</div>
            <div class="colors">${colors}</div>
            <div class="texts">${texts}</div>
            <span class="open-figma">${linkText}</span>
          </div>
        </a>`;
});

// Write updated HTML
fs.writeFileSync(filePath, html, 'utf-8');

console.log(`✅ Updated ${updateCount} cards successfully!`);
console.log('\nChanges applied:');
console.log('  • Added card-preview divs with placeholders');
console.log('  • Added platform badges (Web/Mobile)');
console.log('  • Added data-platform attributes for filtering');
console.log('  • Wrapped content in card-content divs');
console.log('\n📦 Ready to commit!\n');
