// Simple build script to inject HTML into code.ts
const fs = require('fs');
const { execSync } = require('child_process');

// First, build ui.ts to ui.js
console.log('Building UI...');
execSync('npx esbuild ui.ts --bundle --outfile=ui.js --target=es2017 --format=iife', { stdio: 'inherit' });

// Read UI HTML and UI JS
const html = fs.readFileSync('ui.html', 'utf8');
const uiJs = fs.readFileSync('ui.js', 'utf8');

// Replace the script tag with inline script
const htmlWithInlineJs = html.replace(
  /<script src="ui\.js"><\/script>/,
  `<script>${uiJs}</script>`
);

// Create a temporary code file with HTML injected
const codeContent = fs.readFileSync('code.ts', 'utf8');
const codeWithHtml = codeContent.replace(
  /__html__/g,
  '`' + htmlWithInlineJs.replace(/`/g, '\\`').replace(/\${/g, '\\${') + '`'
);

fs.writeFileSync('code.temp.ts', codeWithHtml);

// Build with esbuild
console.log('Building main code...');
try {
  execSync('npx esbuild code.temp.ts --bundle --outfile=code.js --target=es2017 --format=iife', { stdio: 'inherit' });
  fs.unlinkSync('code.temp.ts');
  console.log('Build complete!');
} catch (error) {
  if (fs.existsSync('code.temp.ts')) {
    fs.unlinkSync('code.temp.ts');
  }
  process.exit(1);
}

