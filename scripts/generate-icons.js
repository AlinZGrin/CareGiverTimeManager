// Generate PNG icons from SVG using sharp
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path');

// Create a simple SVG icon (caregiver/time tracking themed)
const svgIcon = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">
  <rect width="192" height="192" fill="#3b82f6" rx="32"/>
  <circle cx="96" cy="70" r="25" fill="white"/>
  <path d="M 96 100 Q 75 100 60 115 L 60 165 Q 60 175 70 175 L 122 175 Q 132 175 132 165 L 132 115 Q 117 100 96 100 Z" fill="white"/>
  <text x="96" y="155" font-family="Arial, sans-serif" font-size="16" fill="#3b82f6" text-anchor="middle" font-weight="bold">TIME</text>
</svg>
`);

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

async function generateIcons() {
  try {
    // Ensure icons directory exists
    if (!fs.existsSync(iconsDir)) {
      fs.mkdirSync(iconsDir, { recursive: true });
    }

    // Generate 192x192 icon
    await sharp(svgIcon)
      .resize(192, 192)
      .png()
      .toFile(path.join(iconsDir, 'icon-192.png'));
    console.log('✓ Created icon-192.png');

    // Generate 512x512 icon
    await sharp(svgIcon)
      .resize(512, 512)
      .png()
      .toFile(path.join(iconsDir, 'icon-512.png'));
    console.log('✓ Created icon-512.png');

    // Also save the SVG for reference
    fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);
    console.log('✓ Created icon.svg');

    console.log('\nIcons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
