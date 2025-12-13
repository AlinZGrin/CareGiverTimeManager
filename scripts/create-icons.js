// Simple script to create basic app icons
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

// Create a simple SVG icon
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" fill="#3b82f6"/>
  <circle cx="96" cy="70" r="25" fill="white"/>
  <path d="M 96 100 Q 75 100 60 115 L 60 165 Q 60 175 70 175 L 122 175 Q 132 175 132 165 L 132 115 Q 117 100 96 100 Z" fill="white"/>
  <text x="96" y="155" font-family="Arial, sans-serif" font-size="16" fill="#3b82f6" text-anchor="middle" font-weight="bold">TIME</text>
</svg>
`;

// For web browsers, we can use a data URL directly
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Create a simple HTML file that can be used to generate PNGs
const htmlGenerator = `
<!DOCTYPE html>
<html>
<head>
  <title>Icon Generator</title>
</head>
<body>
  <h2>Icon Generator</h2>
  <p>Right-click on each image and "Save image as..." to the public/icons directory:</p>
  
  <div>
    <h3>icon-192.png (192x192)</h3>
    <img id="icon192" width="192" height="192" />
  </div>
  
  <div>
    <h3>icon-512.png (512x512)</h3>
    <img id="icon512" width="512" height="512" />
  </div>

  <script>
    const svgIcon = \`${svgIcon}\`;
    
    function createIcon(size, elementId) {
      const scaledSvg = svgIcon.replace('viewBox="0 0 192 192"', \`viewBox="0 0 192 192" width="\${size}" height="\${size}"\`);
      const blob = new Blob([scaledSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.onload = function() {
        ctx.drawImage(img, 0, 0, size, size);
        document.getElementById(elementId).src = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
    
    createIcon(192, 'icon192');
    createIcon(512, 'icon512');
  </script>
</body>
</html>
`;

// Save the SVG and HTML generator
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);
fs.writeFileSync(path.join(iconsDir, 'generator.html'), htmlGenerator);

console.log('Created icon.svg and generator.html in public/icons/');
console.log('To generate PNG files:');
console.log('1. Open public/icons/generator.html in a browser');
console.log('2. Right-click each image and save as icon-192.png and icon-512.png');
console.log('OR use an online SVG to PNG converter with icon.svg');
