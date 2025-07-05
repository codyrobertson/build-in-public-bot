// Test dimension calculations
const { createCanvas } = require('canvas');
const fs = require('fs');

// Test configuration
const config = {
  width: 680,
  padding: 32,
  outerPadding: 40,
  fontSize: 14,
  lineHeight: 21, // fontSize * 1.5
  windowControls: true,
  windowBarHeight: 36,
  scale: 2 // Retina
};

// Calculate dimensions CORRECTLY
function calculateDimensions(config, lineCount) {
  const scale = config.scale;
  
  // Content area (where text goes)
  const contentWidth = config.width - (config.padding * 2);
  const contentHeight = lineCount * config.lineHeight;
  
  // Window dimensions (content + padding + title bar)
  const windowWidth = config.width;
  const windowHeight = contentHeight + (config.padding * 2) + 
                      (config.windowControls ? config.windowBarHeight : 0);
  
  // Canvas dimensions (window + outer padding for shadow)
  const canvasWidth = windowWidth + (config.outerPadding * 2);
  const canvasHeight = windowHeight + (config.outerPadding * 2);
  
  // Scaled dimensions for retina
  return {
    canvas: {
      width: canvasWidth * scale,
      height: canvasHeight * scale
    },
    window: {
      x: config.outerPadding * scale,
      y: config.outerPadding * scale,
      width: windowWidth * scale,
      height: windowHeight * scale
    },
    content: {
      x: (config.outerPadding + config.padding) * scale,
      y: (config.outerPadding + (config.windowControls ? config.windowBarHeight : 0) + config.padding) * scale,
      width: contentWidth * scale,
      height: contentHeight * scale
    },
    scale
  };
}

// Test with 10 lines of text
const dims = calculateDimensions(config, 10);

console.log('Dimension Calculations:');
console.log('Canvas:', dims.canvas);
console.log('Window:', dims.window);
console.log('Content:', dims.content);

// Create visual test
const canvas = createCanvas(dims.canvas.width, dims.canvas.height);
const ctx = canvas.getContext('2d');

// 1. Fill entire canvas with pattern to show bounds
for (let y = 0; y < dims.canvas.height; y += 40) {
  for (let x = 0; x < dims.canvas.width; x += 40) {
    ctx.fillStyle = (x + y) % 80 === 0 ? '#ff0000' : '#00ff00';
    ctx.fillRect(x, y, 40, 40);
  }
}

// 2. Draw window area (semi-transparent to see pattern through)
ctx.fillStyle = 'rgba(26, 35, 53, 0.9)';
ctx.fillRect(dims.window.x, dims.window.y, dims.window.width, dims.window.height);

// 3. Draw window controls area
if (config.windowControls) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(dims.window.x, dims.window.y, dims.window.width, config.windowBarHeight * config.scale);
  
  // Draw dots
  const dotY = dims.window.y + (18 * config.scale);
  const dotRadius = 6 * config.scale;
  const dotSpacing = 20 * config.scale;
  const dotX = dims.window.x + (20 * config.scale);
  
  ctx.fillStyle = '#ff5f56';
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#ffbd2e';
  ctx.beginPath();
  ctx.arc(dotX + dotSpacing, dotY, dotRadius, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = '#27c93f';
  ctx.beginPath();
  ctx.arc(dotX + dotSpacing * 2, dotY, dotRadius, 0, Math.PI * 2);
  ctx.fill();
}

// 4. Draw content area border (to show text bounds)
ctx.strokeStyle = '#00ffff';
ctx.lineWidth = 2;
ctx.strokeRect(dims.content.x, dims.content.y, dims.content.width, dims.content.height);

// 5. Draw some test text
ctx.fillStyle = '#ffffff';
ctx.font = `${config.fontSize * config.scale}px monospace`;
ctx.textBaseline = 'top';

const testLines = [
  '// This is line 1',
  'function test() {',
  '  console.log("Line 3");',
  '  return "Line 4";',
  '}',
  '',
  '// More text to test wrapping',
  'const longLine = "This is a very long line that should wrap properly within the content bounds";',
  '',
  '// Line 10'
];

testLines.forEach((line, i) => {
  const y = dims.content.y + (i * config.lineHeight * config.scale);
  ctx.fillText(line, dims.content.x, y);
});

// Save test image
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('dimension-test.png', buffer);
console.log('\nTest image saved to dimension-test.png');
console.log('Red/Green pattern = canvas bounds');
console.log('Dark rectangle = window');
console.log('Cyan border = content area');