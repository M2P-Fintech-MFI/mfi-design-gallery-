// build-local-gallery.js
// Generates figma-gallery.html entirely from local PNG images — no Figma API needed.
// Run: node scripts/build-local-gallery.js
// Output: docs/figma-gallery.html

const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const IMG_BASE = path.join(BASE, 'docs', 'figma-images');
const OUT = path.join(BASE, 'docs', 'figma-gallery.html');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Encode a full relative image path (each segment separately)
function encImgPath(relPath) {
  return relPath.split('/').map(seg => encodeURIComponent(seg)).join('/');
}

// Extract display name from filename
function toDisplayName(filename, style) {
  const base = filename.replace(/\.png$/i, '');
  if (style === 'node-id') {
    // web-platform-old-ui: "Active_Offices_2659-3065" → "Active Offices"
    return base.replace(/_\d+-\d+$/, '').replace(/_/g, ' ').trim();
  }
  // plain: use as-is, just clean up
  return base.replace(/_/g, ' ').trim();
}

// Read all .png files from a folder, return {filename, name, relPath}
function readImages(folderPath, relFolderPath, nameStyle, opts = {}) {
  const { skipNumeric = false, skipPatterns = [] } = opts;
  let files;
  try { files = fs.readdirSync(folderPath); } catch (e) { return []; }

  return files
    .filter(f => /\.png$/i.test(f))
    .filter(f => {
      if (skipNumeric && /^\d+(\.\d+)?(-\d+)?\.png$/i.test(f)) return false;
      for (const pat of skipPatterns) {
        if (pat.test(f)) return false;
      }
      return true;
    })
    .map(f => ({
      filename: f,
      name: toDisplayName(f, nameStyle),
      relPath: relFolderPath + '/' + f,
      folder: path.basename(folderPath)
    }))
    .filter(s => s.name.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

// ─── Section definitions ───────────────────────────────────────────────────

const LOANBOOK_WEB_SKIP = [
  /^👉/,
  /^Frame \d/i,
  /^Line \d/i,
  /^Vector \d/i,
  /^Untitled(-\d+)?\.png$/i,
  /^Group \d/i,
  /^Hover State\.png$/i,
  /^Saved\.png$/i,
  /^B\.png$/i,
  /^\d+(\.\d+)?(-\d+)?\.png$/i,
  /^pointer\.png$/i,
  /^alert-circle\.png$/i,
  /^Added this as a separate step/i,
];

const SECTIONS = [
  {
    id: 'web-old-ui',
    label: 'Web Platform — Old UI',
    codebase: 'Kotak on-prem',
    platform: 'WEB',
    color: '#2D4F7E',
    subsections: [
      {
        label: 'All Screens',
        folder: 'web-platform-old-ui',
        nameStyle: 'node-id',
      }
    ]
  },
  {
    id: 'field-staff',
    label: 'Loanbook Field Staff',
    codebase: 'Digamber + Kotak SaaS · Mobile',
    platform: 'MOBILE',
    color: '#003366',
    subsections: [
      { label: 'Collections', folder: 'Loanbook Field Staff -  Collection - PNG', nameStyle: 'plain' },
      { label: 'Overdues', folder: 'Loanbook Field Staff - Collection - Overdue - PNG', nameStyle: 'plain' },
      { label: 'Search', folder: 'Loanbook Field Staff - Search - PNG', nameStyle: 'plain' },
      { label: 'Sourcing', folder: 'Loanbook Field Staff - Sourcing - PNG', nameStyle: 'plain' },
      {
        label: 'All Individual Screens',
        folder: 'Loanbook Field Staff - Complete',
        nameStyle: 'plain',
        skipNumeric: true,
      }
    ]
  },
  {
    id: 'loanbook-web',
    label: 'Loanbook Web',
    codebase: 'Digamber + Kotak SaaS · Web',
    platform: 'WEB',
    color: '#1F497D',
    subsections: [
      {
        label: 'All Screens',
        folder: 'Loanbook Web - new UI',
        nameStyle: 'plain',
        skipPatterns: LOANBOOK_WEB_SKIP,
      }
    ]
  },
  {
    id: 'income-web',
    label: 'Income Assessment — Web',
    codebase: 'Loanbook Web · HHI Module',
    platform: 'WEB',
    color: '#4A7CB5',
    subsections: [
      { label: 'All Screens', folder: 'Loanbook Web - Income', nameStyle: 'plain' }
    ]
  },
  {
    id: 'income-mobile',
    label: 'Income Assessment — Mobile',
    codebase: 'Loanbook Field Staff · HHI Module',
    platform: 'MOBILE',
    color: '#2196F3',
    subsections: [
      { label: 'All Screens', folder: 'Loanbook Mobile - Income assessment', nameStyle: 'plain' }
    ]
  }
];

// ─── Build Figma URL index from saved JSON files ──────────────────────────────
// Maps normalised frame name → { url, fileKey }
const FIGMA_JSON_DIR = path.join(BASE, 'docs', 'figma-json');

const FIGMA_FILE_KEYS = {
  'web-platform-old-ui': 'qEMRRpn8rPa2hbjTS0HnVl',
  'loanbook-field-staff': 'ynrZ50gvTh5yb20gwciKcI',
  'loanbook-web': '9PNXDkvwtrjSLDfg9QCR89',
};

// Folder → which JSON to pull from
const FOLDER_TO_JSON = {
  'web-platform-old-ui': 'web-platform-old-ui',
  'Loanbook Field Staff -  Collection - PNG': 'loanbook-field-staff',
  'Loanbook Field Staff - Collection - Overdue - PNG': 'loanbook-field-staff',
  'Loanbook Field Staff - Search - PNG': 'loanbook-field-staff',
  'Loanbook Field Staff - Sourcing - PNG': 'loanbook-field-staff',
  'Loanbook Field Staff - Complete': 'loanbook-field-staff',
  'Loanbook Web - new UI': 'loanbook-web',
  'Loanbook Web - Income': 'loanbook-web',   // newer, may not be in JSON
};

function normName(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }

// Per-file index: { fileKey → { normName → nodeId } }
const figmaIndexByFile = {};

for (const [jsonName, fileKey] of Object.entries(FIGMA_FILE_KEYS)) {
  const jsonPath = path.join(FIGMA_JSON_DIR, jsonName + '.json');
  if (!fs.existsSync(jsonPath)) continue;
  console.log(`Loading Figma index from ${jsonName}.json...`);
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const pages = (data.document && data.document.children) || [];
  const idx = {};

  pages.forEach(pg => {
    (pg.children || []).forEach(node => {
      // Direct frames
      if (node.name && node.id) {
        idx[normName(node.name)] = node.id;
      }
      // Frames inside SECTION nodes
      if (node.type === 'SECTION' && node.children) {
        node.children.forEach(child => {
          if (child.name && child.id) {
            idx[normName(child.name)] = child.id;
          }
        });
      }
    });
  });

  figmaIndexByFile[fileKey] = idx;
  console.log(`  ${Object.keys(idx).length} entries`);
}

function figmaUrl(name, folder) {
  const jsonKey = FOLDER_TO_JSON[folder];
  if (!jsonKey) return null;
  const fileKey = FIGMA_FILE_KEYS[jsonKey];
  if (!fileKey) return null;
  const idx = figmaIndexByFile[fileKey];
  if (!idx) return null;
  const nodeId = idx[normName(name)];
  if (!nodeId) return null;
  return `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(nodeId)}`;
}

// ─── Load all images ──────────────────────────────────────────────────────────

let totalScreens = 0;
const built = SECTIONS.map(sec => {
  const subs = sec.subsections.map(sub => {
    const folderPath = path.join(IMG_BASE, sub.folder);
    const relFolder = 'figma-images/' + sub.folder;
    const images = readImages(folderPath, relFolder, sub.nameStyle, {
      skipNumeric: sub.skipNumeric || false,
      skipPatterns: sub.skipPatterns || [],
    });
    totalScreens += images.length;
    return { label: sub.label, images };
  });
  return { ...sec, subsections: subs };
});

const totalSubs = built.reduce((a, b) => a + b.subsections.length, 0);
const webCount = built.filter(s => s.platform === 'WEB').reduce((a, s) => a + s.subsections.reduce((b, sub) => b + sub.images.length, 0), 0);
const mobileCount = built.filter(s => s.platform === 'MOBILE').reduce((a, s) => a + s.subsections.reduce((b, sub) => b + sub.images.length, 0), 0);
console.log(`Total screens: ${totalScreens}`);
built.forEach(s => {
  const n = s.subsections.reduce((a, b) => a + b.images.length, 0);
  console.log(`  ${s.label}: ${n}`);
  s.subsections.forEach(sub => console.log(`    • ${sub.label}: ${sub.images.length}`));
});

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --sidebar-w:270px;
  --bg:#f1f5f9;
  --card-bg:#fff;
  --text:#0f172a;
  --muted:#64748b;
  --border:#e2e8f0;
  --accent:#3b82f6;
  --sidebar-bg:#0f172a;
  --sidebar-text:#e2e8f0;
  --sidebar-muted:#94a3b8;
}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:var(--bg);color:var(--text)}
a{text-decoration:none;color:inherit}

/* ── Sidebar ── */
.sb{width:var(--sidebar-w);background:var(--sidebar-bg);color:var(--sidebar-text);
  position:fixed;top:0;left:0;height:100vh;overflow-y:auto;z-index:50;
  display:flex;flex-direction:column}
.sb-head{padding:20px;border-bottom:1px solid #1e293b;flex-shrink:0}
.sb-head h1{font-size:15px;font-weight:700;color:#fff;margin-bottom:4px}
.sb-head .sb-stats{font-size:11px;color:var(--sidebar-muted)}
.sb-nav{padding:8px 0;flex:1}
.sb-group{margin-bottom:4px}
.sb-group-label{
  font-size:11px;font-weight:700;padding:10px 16px 4px;
  color:var(--sidebar-muted);text-transform:uppercase;letter-spacing:.6px;cursor:pointer}
.sb-group-label:hover{color:#fff}
.sb-link{
  display:flex;align-items:center;justify-content:space-between;
  padding:5px 16px 5px 24px;font-size:12px;color:var(--sidebar-muted);
  cursor:pointer;border-left:2px solid transparent;transition:all .15s}
.sb-link:hover,.sb-link.active{color:#fff;background:#1e293b;border-left-color:var(--accent)}
.sb-link .badge{
  font-size:10px;background:#1e293b;color:var(--sidebar-muted);
  padding:1px 6px;border-radius:10px;flex-shrink:0}
.sb-link:hover .badge,.sb-link.active .badge{background:#334155;color:#cbd5e1}

/* ── Main ── */
.mn{margin-left:var(--sidebar-w);min-height:100vh}

/* ── Topbar ── */
.topbar{
  position:sticky;top:0;z-index:40;background:rgba(241,245,249,.95);
  backdrop-filter:blur(8px);border-bottom:1px solid var(--border);
  padding:12px 24px;display:flex;align-items:center;gap:16px}
.search-wrap{position:relative;flex:1;max-width:440px}
.search-wrap svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted)}
.search-input{
  width:100%;padding:9px 12px 9px 38px;border:1px solid var(--border);
  border-radius:8px;font-size:13px;outline:none;background:#fff;
  transition:border-color .15s,box-shadow .15s}
.search-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(59,130,246,.15)}
.search-count{font-size:12px;color:var(--muted);white-space:nowrap}
.menu-btn{
  display:none;background:var(--sidebar-bg);color:#fff;border:none;
  padding:8px 10px;border-radius:6px;cursor:pointer;font-size:16px}

/* ── Content ── */
.content{padding:24px}

/* ── Section ── */
.sec{margin-bottom:40px}
.sec-header{
  display:flex;align-items:center;gap:12px;
  margin-bottom:6px;padding-bottom:12px;border-bottom:2px solid var(--border)}
.sec-dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
.sec-title{font-size:18px;font-weight:700;color:var(--text)}
.sec-codebase{font-size:12px;color:var(--muted);margin-left:auto;white-space:nowrap}
.sec-total{font-size:12px;color:var(--muted);margin-left:8px}

/* ── Sub-section ── */
.sub{margin-bottom:28px}
.sub-title{
  font-size:13px;font-weight:600;color:#475569;margin-bottom:12px;
  display:flex;align-items:center;gap:8px}
.sub-title .sub-count{
  font-size:11px;color:var(--muted);background:var(--border);
  padding:1px 8px;border-radius:10px;font-weight:400}

/* ── Grid ── */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}

/* ── Card ── */
.card{
  background:var(--card-bg);border:1px solid var(--border);border-radius:10px;
  overflow:hidden;transition:box-shadow .2s,transform .15s;cursor:pointer}
.card:hover{box-shadow:0 8px 24px rgba(0,0,0,.12);transform:translateY(-2px)}
.card .thumb{
  width:100%;aspect-ratio:4/3;background:#f8fafc;overflow:hidden;
  display:flex;align-items:center;justify-content:center;border-bottom:1px solid var(--border)}
.card .thumb img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.card .thumb .no-img{font-size:11px;color:var(--muted);text-align:center;padding:12px}
.card .card-info{padding:10px 12px}
.card .card-name{font-size:12px;font-weight:600;color:var(--text);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3}
.card .card-dims{font-size:10px;color:var(--muted);margin-top:2px}
.figma-link{
  display:inline-block;margin-top:6px;font-size:11px;font-weight:600;
  color:var(--accent);text-decoration:none;padding:2px 8px;
  border:1px solid #bfdbfe;border-radius:4px;background:#eff6ff;
  transition:background .15s,color .15s}
.figma-link:hover{background:var(--accent);color:#fff;border-color:var(--accent)}

/* ── Hidden ── */
.hidden{display:none!important}

/* ── Lightbox ── */
.lb-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:1000;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  opacity:0;pointer-events:none;transition:opacity .2s}
.lb-overlay.open{opacity:1;pointer-events:auto}
.lb-close{
  position:absolute;top:16px;right:16px;background:none;border:none;
  color:#fff;font-size:32px;cursor:pointer;line-height:1;padding:4px 10px;
  border-radius:6px;transition:background .15s}
.lb-close:hover{background:rgba(255,255,255,.15)}
.lb-name{
  position:absolute;bottom:0;left:0;right:0;padding:12px 20px;
  background:linear-gradient(transparent,rgba(0,0,0,.7));
  color:#fff;font-size:14px;font-weight:600;text-align:center}
.lb-img{max-width:92vw;max-height:82vh;object-fit:contain;border-radius:6px;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.lb-figma{position:absolute;bottom:52px;right:20px;color:#60a5fa;font-size:13px;font-weight:600;
  background:rgba(0,0,0,.6);padding:6px 14px;border-radius:6px;border:1px solid rgba(96,165,250,.4);
  transition:all .15s}
.lb-figma:hover{background:rgba(59,130,246,.8);color:#fff;border-color:transparent}

/* ── Card image skeleton ── */
.card .thumb img{background:#f1f5f9}
.card .thumb::before{
  content:'';display:block;position:absolute;inset:0;
  background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);
  background-size:200% 100%;animation:shimmer 1.4s infinite;border-radius:0}
.card .thumb{position:relative}
.card .thumb img{position:relative;z-index:1}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

/* ── Back to top ── */
.back-top{
  position:fixed;bottom:24px;right:24px;z-index:90;
  background:var(--accent);color:#fff;border:none;border-radius:50%;
  width:44px;height:44px;font-size:20px;cursor:pointer;
  box-shadow:0 4px 16px rgba(59,130,246,.4);
  display:flex;align-items:center;justify-content:center;
  opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;
  transform:translateY(8px)}
.back-top.visible{opacity:1;pointer-events:auto;transform:translateY(0)}
.back-top:hover{background:#2563eb}

/* ── Hero banner ── */
.hero{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 60%,#0f172a 100%);
  color:#fff;padding:28px 24px 24px}
.hero h2{font-size:19px;font-weight:700;margin-bottom:3px}
.hero-sub{font-size:12px;color:#94a3b8;margin-bottom:18px}
.hero-stats{display:flex;gap:32px;flex-wrap:wrap}
.hero-stat .num{font-size:26px;font-weight:700;color:#60a5fa;line-height:1}
.hero-stat .lbl{font-size:10px;color:#94a3b8;margin-top:4px;text-transform:uppercase;letter-spacing:.5px}

/* ── Platform filter chips ── */
.filter-chips{display:flex;gap:5px;align-items:center}
.chip{padding:5px 11px;border-radius:20px;font-size:12px;font-weight:500;
  border:1px solid var(--border);background:#fff;color:var(--muted);cursor:pointer;transition:all .15s}
.chip:hover{border-color:var(--accent);color:var(--accent)}
.chip.active{background:var(--accent);color:#fff;border-color:var(--accent)}

/* ── Platform badge on card thumb ── */
.plat-badge{position:absolute;top:7px;right:7px;z-index:2;
  font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;
  letter-spacing:.4px;text-transform:uppercase;pointer-events:none;line-height:1.4}
.plat-badge.web{background:#1e3a8a;color:#bfdbfe}
.plat-badge.mobile{background:#14532d;color:#bbf7d0}

/* ── Grid size variants ── */
.grid.compact{grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px}
.grid.list{grid-template-columns:1fr;gap:5px}
.grid.list .card{display:flex;flex-direction:row;align-items:center}
.grid.list .card .thumb{width:72px;min-width:72px;height:54px;aspect-ratio:unset;
  flex-shrink:0;border-right:1px solid var(--border);border-bottom:none}
.grid.list .card .card-info{padding:6px 12px;flex:1;display:flex;align-items:center;gap:12px}
.grid.list .card .card-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.grid.list .card .thumb img{object-position:top}

/* ── Grid size toggle ── */
.grid-toggle{display:flex;gap:4px}
.gt-btn{padding:5px 8px;border:1px solid var(--border);border-radius:6px;
  background:#fff;cursor:pointer;color:var(--muted);font-size:12px;line-height:1;transition:all .15s}
.gt-btn:hover,.gt-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}

/* ── Sidebar collapse ── */
.sb-group-label{display:flex;align-items:center;justify-content:space-between}
.sb-collapse-btn{background:none;border:none;color:var(--sidebar-muted);
  cursor:pointer;font-size:12px;padding:0 4px;line-height:1;flex-shrink:0;transition:all .15s}
.sb-collapse-btn:hover{color:#fff}
.sb-subs{overflow:hidden}
.sb-group.collapsed .sb-subs{display:none}

/* ── Inline Figma link ── */
.figma-inline{font-size:11px;color:var(--accent);font-weight:500;display:inline-block;margin-top:5px}
.figma-inline:hover{text-decoration:underline}

/* ── Platform hidden (filter) ── */
.plat-hide{display:none!important}

/* ── Empty state ── */
.empty-state{text-align:center;padding:80px 24px;display:flex;flex-direction:column;align-items:center;gap:12px}
.empty-icon{font-size:40px;line-height:1}
.empty-msg{font-size:16px;font-weight:600;color:var(--text)}
.empty-sub{font-size:13px;color:var(--muted)}
.empty-reset{margin-top:8px;padding:8px 18px;border-radius:8px;border:1px solid var(--border);
  background:#fff;color:var(--accent);font-size:13px;font-weight:500;cursor:pointer;transition:all .15s}
.empty-reset:hover{background:var(--accent);color:#fff;border-color:var(--accent)}

/* ── Mobile ── */
@media(max-width:768px){
  .sb{transform:translateX(-100%);transition:transform .3s}
  .sb.open{transform:translateX(0)}
  .mn{margin-left:0}
  .topbar{padding:10px 16px;flex-wrap:wrap;gap:8px}
  .content{padding:16px}
  .grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
  .menu-btn{display:block}
  .sec-codebase,.sec-total{display:none}
  .back-top{bottom:16px;right:16px;width:38px;height:38px;font-size:16px}
  .filter-chips,.grid-toggle{display:none}
  .hero{padding:16px}
  .hero-stats{gap:16px}
}
`;

// ─── Build sidebar HTML ────────────────────────────────────────────────────────

function buildSidebar(sections) {
  let html = '';
  sections.forEach(sec => {
    const total = sec.subsections.reduce((a, b) => a + b.images.length, 0);
    const platColor = sec.platform === 'MOBILE' ? '#22c55e' : '#60a5fa';
    html += `<div class="sb-group">`;
    html += `<div class="sb-group-label" onclick="navTo('${esc(sec.id)}')">`;
    html += `<span style="display:flex;align-items:center;gap:6px;min-width:0">`;
    html += `<span style="font-size:9px;padding:1px 5px;border-radius:3px;background:${platColor}22;color:${platColor};font-weight:700;flex-shrink:0">${esc(sec.platform)}</span>`;
    html += `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(sec.label)}</span>`;
    html += `</span>`;
    html += `<button class="sb-collapse-btn" onclick="event.stopPropagation();toggleSbGroup(this)" title="Collapse">▾</button>`;
    html += `</div>`;
    html += `<div class="sb-subs">`;
    sec.subsections.forEach((sub, i) => {
      const subId = sec.id + '--sub' + i;
      html += `<div class="sb-link" id="nav-${esc(subId)}" onclick="navTo('${esc(subId)}')">${esc(sub.label)}<span class="badge">${sub.images.length}</span></div>`;
    });
    html += `</div></div>`;
  });
  return html;
}

// ─── Build content HTML ───────────────────────────────────────────────────────

function buildContent(sections) {
  let html = '';
  sections.forEach(sec => {
    const total = sec.subsections.reduce((a, b) => a + b.images.length, 0);
    html += `<div class="sec" id="${esc(sec.id)}">`;
    html += `<div class="sec-header">`;
    html += `<div class="sec-dot" style="background:${esc(sec.color)}"></div>`;
    html += `<div class="sec-title">${esc(sec.label)}</div>`;
    html += `<div class="sec-codebase">${esc(sec.codebase)}</div>`;
    html += `<div class="sec-total">${total} screens</div>`;
    html += `</div>`;

    sec.subsections.forEach((sub, i) => {
      const subId = sec.id + '--sub' + i;
      html += `<div class="sub" id="${esc(subId)}">`;
      if (sec.subsections.length > 1) {
        html += `<div class="sub-title">${esc(sub.label)}<span class="sub-count">${sub.images.length}</span></div>`;
      }
      html += `<div class="grid">`;
      sub.images.forEach(img => {
        const encodedPath = encImgPath(img.relPath);
        const fUrl = figmaUrl(img.name, img.folder);
        const figmaLink = fUrl
          ? `<a class="figma-inline" href="${esc(fUrl)}" target="_blank" onclick="event.stopPropagation()" title="Open in Figma">Open in Figma →</a>`
          : '';
        const platClass = sec.platform === 'MOBILE' ? 'mobile' : 'web';
        const platBadge = sec.platform
          ? `<div class="plat-badge ${platClass}">${esc(sec.platform)}</div>`
          : '';
        const fUrlEsc = fUrl ? esc(fUrl).replace(/'/g, "\\'") : '';
        html += `<div class="card" data-name="${esc(img.name.toLowerCase())}" data-platform="${esc(sec.platform || '')}" onclick="openLb('${encodedPath.replace(/'/g,"\\'")}','${esc(img.name).replace(/'/g,"\\'")}','${fUrlEsc}')">`;
        html += `<div class="thumb">${platBadge}<img src="${esc(encodedPath)}" alt="${esc(img.name)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'no-img\\'>No preview</div>'"></div>`;
        html += `<div class="card-info"><div class="card-name" title="${esc(img.name)}">${esc(img.name)}</div>${figmaLink}</div>`;
        html += `</div>`;
      });
      html += `</div></div>`;
    });

    html += `</div>`;
  });
  return html;
}

// ─── JS ───────────────────────────────────────────────────────────────────────

const JS = `
const allCards = document.querySelectorAll('.card');
const searchInput = document.getElementById('searchInput');
const searchCount = document.getElementById('searchCount');
const subs = document.querySelectorAll('.sub');
const secs = document.querySelectorAll('.sec');
let activePlatform = 'ALL';
const platformTotals = { ALL: ${totalScreens}, WEB: ${webCount}, MOBILE: ${mobileCount} };

function refreshVisibility() {
  subs.forEach(s => {
    s.classList.toggle('hidden', s.querySelectorAll('.card:not(.hidden):not(.plat-hide)').length === 0);
  });
  secs.forEach(s => {
    s.classList.toggle('hidden', s.querySelectorAll('.card:not(.hidden):not(.plat-hide)').length === 0);
  });
  const anyVisible = document.querySelectorAll('.card:not(.hidden):not(.plat-hide)').length > 0;
  document.getElementById('emptyState').classList.toggle('hidden', anyVisible);
}

searchInput.addEventListener('input', function() {
  const q = this.value.toLowerCase().trim();
  let visible = 0;
  allCards.forEach(c => {
    const match = !q || (c.dataset.name || '').includes(q);
    c.classList.toggle('hidden', !match);
    if (match && !c.classList.contains('plat-hide')) visible++;
  });
  refreshVisibility();
  const total = platformTotals[activePlatform] || ${totalScreens};
  const ctx = activePlatform !== 'ALL' ? ' ' + activePlatform.toLowerCase() : '';
  searchCount.textContent = q ? visible + ' of ' + total + ctx + ' match' : '';
});

function filterPlatform(p) {
  activePlatform = p;
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.p === p));
  allCards.forEach(c => {
    c.classList.toggle('plat-hide', p !== 'ALL' && c.dataset.platform !== p);
  });
  refreshVisibility();
}

function setGrid(mode) {
  document.querySelectorAll('.gt-btn').forEach(b => b.classList.toggle('active', b.dataset.g === mode));
  document.querySelectorAll('.grid').forEach(g => {
    g.classList.remove('compact', 'list');
    if (mode !== 'comfortable') g.classList.add(mode);
  });
}

function toggleSbGroup(btn) {
  const group = btn.closest('.sb-group');
  group.classList.toggle('collapsed');
  btn.textContent = group.classList.contains('collapsed') ? '▸' : '▾';
}

function navTo(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Set active immediately on click
    document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
    const navLink = document.getElementById('nav-' + id);
    if (navLink) navLink.classList.add('active');
  }
  document.querySelector('.sb').classList.remove('open');
}

// Sidebar active state on scroll (IntersectionObserver)
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      document.querySelectorAll('.sb-link').forEach(l => l.classList.remove('active'));
      const navLink = document.getElementById('nav-' + e.target.id);
      if (navLink) navLink.classList.add('active');
    }
  });
}, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
document.querySelectorAll('.sub').forEach(el => observer.observe(el));

// Lightbox
const lbOverlay = document.getElementById('lbOverlay');
const lbImg = document.getElementById('lbImg');
const lbName = document.getElementById('lbName');
const lbFigma = document.getElementById('lbFigma');

function openLb(src, name, figmaUrl) {
  lbImg.src = src;
  lbName.textContent = name;
  if (figmaUrl) {
    lbFigma.href = figmaUrl;
    lbFigma.style.display = 'block';
  } else {
    lbFigma.style.display = 'none';
  }
  lbOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLb() {
  lbOverlay.classList.remove('open');
  lbImg.src = '';
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });

// Back to top visibility
const backTop = document.getElementById('backTop');
window.addEventListener('scroll', () => {
  backTop.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

// Mobile menu
document.getElementById('menuBtn').addEventListener('click', () => {
  document.querySelector('.sb').classList.toggle('open');
});
document.addEventListener('click', e => {
  const sb = document.querySelector('.sb');
  if (window.innerWidth <= 768 && sb.classList.contains('open')
    && !sb.contains(e.target) && e.target.id !== 'menuBtn') {
    sb.classList.remove('open');
  }
});
`;

// ─── Assemble HTML ────────────────────────────────────────────────────────────

const sidebarHTML = buildSidebar(built);
const contentHTML = buildContent(built);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MFI Platform Design System — Complete Screen Gallery</title>
<meta name="description" content="Comprehensive design system gallery featuring ${totalScreens}+ screens across Web Platform, Field Staff Mobile, and Loanbook Web applications.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>

<!-- Sidebar -->
<aside class="sb">
  <div class="sb-head">
    <h1>MFI Design Gallery</h1>
    <div class="sb-stats">${totalScreens} screens · ${built.length} products</div>
  </div>
  <nav class="sb-nav">${sidebarHTML}</nav>
</aside>

<!-- Main -->
<div class="mn">
  <div class="hero">
    <h2>MFI Platform Design Gallery</h2>
    <div class="hero-sub">All screens from Figma, served locally — no Figma API key needed</div>
    <div class="hero-stats">
      <div class="hero-stat"><div class="num">${totalScreens}</div><div class="lbl">Screens</div></div>
      <div class="hero-stat"><div class="num">${built.length}</div><div class="lbl">Products</div></div>
      <div class="hero-stat"><div class="num">${totalSubs}</div><div class="lbl">Feature Areas</div></div>
      <div class="hero-stat"><div class="num">100%</div><div class="lbl">Local / Offline</div></div>
    </div>
  </div>
  <div class="topbar">
    <button class="menu-btn" id="menuBtn">☰</button>
    <div class="search-wrap">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" class="search-input" id="searchInput" placeholder="Search screens… (e.g. Customer, GRT, Income, Disbursement)" autocomplete="off">
    </div>
    <span class="search-count" id="searchCount"></span>
    <div class="filter-chips">
      <button class="chip active" data-p="ALL" onclick="filterPlatform('ALL')">All</button>
      <button class="chip" data-p="WEB" onclick="filterPlatform('WEB')">Web</button>
      <button class="chip" data-p="MOBILE" onclick="filterPlatform('MOBILE')">Mobile</button>
    </div>
    <div class="grid-toggle">
      <button class="gt-btn active" data-g="comfortable" onclick="setGrid('comfortable')" title="Comfortable grid">4×</button>
      <button class="gt-btn" data-g="compact" onclick="setGrid('compact')" title="Compact grid">6×</button>
      <button class="gt-btn" data-g="list" onclick="setGrid('list')" title="List view">List</button>
    </div>
  </div>
  <div class="content">
    <div class="empty-state hidden" id="emptyState">
      <div class="empty-icon">🔍</div>
      <div class="empty-msg">No screens match your search</div>
      <div class="empty-sub">Try different keywords or reset the platform filter</div>
      <button onclick="document.getElementById('searchInput').value='';document.getElementById('searchInput').dispatchEvent(new Event('input'));filterPlatform('ALL')" class="empty-reset">Clear search &amp; filter</button>
    </div>
    ${contentHTML}
  </div>
</div>

<!-- Lightbox -->
<div class="lb-overlay" id="lbOverlay" onclick="if(event.target===this)closeLb()">
  <button class="lb-close" onclick="closeLb()">×</button>
  <img class="lb-img" id="lbImg" src="" alt="">
  <div class="lb-name" id="lbName"></div>
  <a class="lb-figma" id="lbFigma" href="#" target="_blank" onclick="event.stopPropagation()" style="display:none">Open in Figma →</a>
</div>

<!-- Back to top -->
<button class="back-top" id="backTop" onclick="window.scrollTo({top:0,behavior:'smooth'})" title="Back to top">↑</button>

<script>${JS}</script>
</body>
</html>`;

fs.writeFileSync(OUT, html, 'utf8');
const kb = (Buffer.byteLength(html) / 1024).toFixed(1);
console.log(`\nGallery written: ${OUT}`);
console.log(`Size: ${kb} KB`);
console.log(`Screens: ${totalScreens}`);
