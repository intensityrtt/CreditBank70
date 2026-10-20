const fs = require('fs');
const path = require('path');

console.log('--- Starting Credit Bank Build & Sync ---');

// 1. Files to bundle in order
const bundleFiles = [
  'js/survey-images.js',
  'js/schools-data.js',
  'js/questions-data.js',
  'js/config.js',
  'js/api-service.js',
  'js/survey-form.js',
  'js/tracker-view.js',
  'js/admin-portal.js',
  'js/obec-report.js',
  'js/app.js'
];

let bundle = '/* Credit Bank Nan 1 Combined Bundle */\n';
bundleFiles.forEach(f => {
  if (fs.existsSync(f)) {
    bundle += '\n/* --- ' + f + ' --- */\n' + fs.readFileSync(f, 'utf8') + '\n';
  } else {
    console.error('File not found: ' + f);
    process.exit(1);
  }
});

// 2. Validate bundle syntax
try {
  new Function(bundle);
  console.log('✓ Bundle syntax is 100% VALID!');
} catch (e) {
  console.error('BUNDLE SYNTAX ERROR:', e.message);
  process.exit(1);
}

// 3. Write js/bundle.js
fs.writeFileSync('js/bundle.js', bundle, 'utf8');
console.log('✓ Written js/bundle.js (' + (bundle.length / 1024).toFixed(1) + ' KB)');

// 4. Update index.html embedded script
let html = fs.readFileSync('index.html', 'utf8');
const scriptRegex = /<script>\s*\/\* Credit Bank Nan 1 Combined Bundle[\s\S]*?<\/script>/;
if (scriptRegex.test(html)) {
  html = html.replace(scriptRegex, `<script>\n${bundle}\n  </script>`);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('✓ Updated inlined script in index.html');
} else {
  console.error('Could not find bundle script tag in index.html');
  process.exit(1);
}

// 5. Verify index.html inlined script
try {
  const match = html.match(/<script>\s*(\/\* Credit Bank Nan 1 Combined Bundle[\s\S]*?)<\/script>/);
  new Function(match[1]);
  console.log('✓ Validated inlined script in index.html: 100% OK!');
} catch (e) {
  console.error('INDEX.HTML SCRIPT ERROR:', e.message);
  process.exit(1);
}

// 6. Sync to dist/ directory for Vercel
function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

if (!fs.existsSync('dist')) fs.mkdirSync('dist');
fs.copyFileSync('index.html', 'dist/index.html');
if (fs.existsSync('vercel.json')) fs.copyFileSync('vercel.json', 'dist/vercel.json');
copyFolderSync('images', 'dist/images');
copyFolderSync('css', 'dist/css');
copyFolderSync('js', 'dist/js');
console.log('✓ Synchronized all assets to dist/ directory');

console.log('--- Build Finished Successfully! ---');
