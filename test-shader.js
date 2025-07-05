// Test shader rendering in isolation
const { createCanvas } = require('canvas');
const fs = require('fs');

// Simple test to verify Canvas is working
const canvas = createCanvas(800, 600);
const ctx = canvas.getContext('2d');

// Test 1: Basic gradient
ctx.fillStyle = '#ff0000';
ctx.fillRect(0, 0, 800, 600);

// Test 2: Pattern
for (let y = 0; y < 600; y += 20) {
  for (let x = 0; x < 800; x += 20) {
    ctx.fillStyle = (x + y) % 40 === 0 ? '#00ff00' : '#0000ff';
    ctx.fillRect(x, y, 20, 20);
  }
}

// Test 3: Text rendering
ctx.fillStyle = '#ffffff';
ctx.font = '48px monospace';
ctx.fillText('Test 123 🔥 emoji', 50, 100);

// Save test image
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('shader-test.png', buffer);
console.log('Test image saved to shader-test.png');

// Test imageData approach
const canvas2 = createCanvas(400, 400);
const ctx2 = canvas2.getContext('2d');
const imageData = ctx2.createImageData(400, 400);
const data = imageData.data;

// Create a simple pattern
for (let y = 0; y < 400; y++) {
  for (let x = 0; x < 400; x++) {
    const i = (y * 400 + x) * 4;
    const pattern = Math.sin(x * 0.1) * Math.sin(y * 0.1) > 0;
    data[i] = pattern ? 255 : 0;     // R
    data[i + 1] = pattern ? 0 : 255; // G
    data[i + 2] = 0;                 // B
    data[i + 3] = 255;               // A
  }
}

ctx2.putImageData(imageData, 0, 0);
const buffer2 = canvas2.toBuffer('image/png');
fs.writeFileSync('shader-test2.png', buffer2);
console.log('ImageData test saved to shader-test2.png');