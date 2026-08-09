import fs from 'fs';
import path from 'path';

// Construct high quality SVG for Guardrails logo mark
const svgMark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <!-- Pink Left Shape -->
    <path id="pink-tile" d="M 28,22 C 16,14 8,24 16,38 L 44,82 C 50,92 64,92 70,82 L 48,46 Z" />
    <!-- Cyan Right Shape -->
    <path id="cyan-tile" d="M 72,22 C 84,14 92,24 84,38 L 56,82 C 50,92 36,92 30,82 L 52,46 Z" />
  </defs>
  
  <!-- Render Pink Tile -->
  <use href="#pink-tile" fill="#f43f5e" />
  
  <!-- Render Cyan Tile -->
  <use href="#cyan-tile" fill="#00b0ff" />
  
  <!-- Overlap Region with Indigo color -->
  <g clip-path="url(#clip-pink)">
    <clipPath id="clip-pink">
      <use href="#pink-tile" />
    </clipPath>
    <use href="#cyan-tile" fill="#3b4cb8" />
  </g>
</svg>`;

const outputDir = path.resolve('public/brand');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'guardrails-mark.svg'), svgMark, 'utf8');
console.log("Guardrails SVG logo mark successfully generated in public/brand/guardrails-mark.svg");
