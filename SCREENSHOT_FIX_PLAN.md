# Comprehensive Screenshot & Shader Rendering Fix Plan

## Current Issues Analysis

### 1. **Window Layout Broken** 🔴 CRITICAL
**Problem**: The window chrome (title bar with controls) is misaligned and text is bleeding outside
**Evidence**: In the screenshots, text appears outside the window boundaries, window controls are offset
**Root Cause**: Incorrect calculation of `outerPadding` vs `innerWidth` relationships
```typescript
// CURRENT BROKEN:
const outerPadding = 40 * scale;
const innerWidth = scaledWidth - (outerPadding * 2); // This makes innerWidth smaller than content!
```

### 2. **Text Wrapping Broken** 🔴 CRITICAL  
**Problem**: Text is being cut off at the right edge instead of wrapping properly
**Evidence**: Long lines like "++ARCHITECTURE VERDICT++" are truncated
**Root Cause**: Line wrapping is calculated AFTER canvas creation with wrong dimensions
```typescript
// CURRENT BROKEN ORDER:
1. Create canvas with scaledWidth
2. Calculate innerWidth 
3. Try to wrap text to innerWidth (but canvas is already wrong size!)
```

### 3. **Shader Not Rendering** 🔴 CRITICAL
**Problem**: Background is solid black instead of showing shader patterns
**Evidence**: No halftone dots, no gradients, no patterns visible
**Root Cause**: Multiple issues:
- Canvas dimensions mismatch between shader renderer and main canvas
- ImageData might be getting overwritten by subsequent fillRect calls
- Shader might be rendering but then covered by window background

### 4. **Emoji Rendering Broken** 🟠 HIGH
**Problem**: Emojis appear as boxes or corrupted characters
**Evidence**: 🔴, 📊, 🎯 etc. show as boxes
**Root Cause**: Font loading order and Canvas emoji support
```typescript
// CURRENT:
ctx.font = `${fontSize}px Monospace, EmojiFont, Apple Color Emoji`;
// Monospace might not support emoji, causing fallback issues
```

### 5. **Padding Logic Inverted** 🟠 HIGH
**Problem**: Padding is inside the window instead of outside
**Evidence**: No space between window edge and canvas edge
**Root Cause**: Drawing order and coordinate system confusion

## Proposed Solution Architecture

### Phase 1: Fix Canvas Dimensions & Layering

```typescript
// NEW APPROACH: Calculate everything BEFORE creating canvas
class ScreenshotRenderer {
  calculateDimensions(options: RenderOptions) {
    // 1. Content dimensions
    const contentWidth = options.width;
    const lineHeight = options.fontSize * 1.5;
    
    // 2. Measure text and wrap FIRST
    const wrappedLines = this.measureAndWrapText(
      code, 
      contentWidth - (padding * 2) - (lineNumbers ? 60 : 0),
      options.font
    );
    
    // 3. Window dimensions
    const windowWidth = contentWidth;
    const windowHeight = (wrappedLines.length * lineHeight) + 
                        (padding * 2) + 
                        (windowControls ? 36 : 0);
    
    // 4. Canvas dimensions (window + outer padding for shadow)
    const canvasWidth = windowWidth + (outerPadding * 2);
    const canvasHeight = windowHeight + (outerPadding * 2);
    
    return {
      canvas: { width: canvasWidth, height: canvasHeight },
      window: { 
        x: outerPadding, 
        y: outerPadding, 
        width: windowWidth, 
        height: windowHeight 
      },
      content: {
        x: outerPadding + padding,
        y: outerPadding + (windowControls ? 36 : 0) + padding,
        width: contentWidth - (padding * 2)
      },
      lines: wrappedLines
    };
  }
}
```

### Phase 2: Fix Rendering Order

```typescript
// CORRECT RENDERING ORDER:
1. Create canvas with FINAL dimensions
2. Render shader/gradient background on ENTIRE canvas
3. Draw window with semi-transparent background at window coordinates
4. Draw window controls INSIDE window
5. Clip to content area
6. Draw text within content bounds
7. Add shadow effects LAST

// Example:
async renderScreenshot() {
  const dims = this.calculateDimensions(options);
  const canvas = createCanvas(dims.canvas.width, dims.canvas.height);
  const ctx = canvas.getContext('2d');
  
  // 1. Background (shader or gradient)
  if (shader) {
    const shaderCanvas = this.renderShader(dims.canvas.width, dims.canvas.height);
    ctx.drawImage(shaderCanvas, 0, 0);
  }
  
  // 2. Window shadow
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 20;
  
  // 3. Window background (semi-transparent)
  ctx.fillStyle = 'rgba(26, 35, 53, 0.95)'; // Slight transparency to show shader
  this.drawRoundedRect(ctx, dims.window);
  
  // 4. Window controls
  if (windowControls) {
    this.drawWindowControls(ctx, dims.window.x, dims.window.y, dims.window.width);
  }
  
  // 5. Content clipping
  ctx.save();
  ctx.beginPath();
  ctx.rect(dims.content.x, dims.content.y, dims.content.width, dims.content.height);
  ctx.clip();
  
  // 6. Draw text
  dims.lines.forEach((line, i) => {
    this.drawLine(ctx, line, dims.content.x, dims.content.y + (i * lineHeight));
  });
  
  ctx.restore();
}
```

### Phase 3: Fix Shader Rendering

```typescript
// SHADER FIX: Ensure shader renders to correct size and isn't overwritten
class ShaderRenderer {
  renderShader(width: number, height: number, type: string) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // For pixel-perfect shaders, use lower resolution then scale
    const scale = 2;
    const lowResCanvas = createCanvas(width / scale, height / scale);
    const lowResCtx = lowResCanvas.getContext('2d');
    
    // Render shader at lower resolution
    this.renderHalftone(lowResCtx, width / scale, height / scale);
    
    // Scale up with nearest neighbor for pixel art effect
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(lowResCanvas, 0, 0, width, height);
    
    return canvas;
  }
  
  // Fix halftone to actually show dots
  renderHalftone(ctx, width, height) {
    // Use fillRect for each dot instead of imageData
    const dotSize = 4;
    const spacing = 8;
    
    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    // Dots
    for (let y = 0; y < height; y += spacing) {
      for (let x = 0; x < width; x += spacing) {
        const intensity = this.noise(x * 0.01, y * 0.01);
        if (intensity > 0.5) {
          ctx.fillStyle = '#00ff88';
          ctx.beginPath();
          ctx.arc(x, y, dotSize * intensity, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}
```

### Phase 4: Fix Font & Emoji Rendering

```typescript
// FONT FIX: Load fonts in correct order with fallbacks
class FontManager {
  setupFonts(ctx: CanvasRenderingContext2D, fontSize: number) {
    // Try multiple font strategies
    const fonts = [
      `${fontSize}px "Fira Code", monospace`,
      `${fontSize}px Menlo, Monaco, monospace`, 
      `${fontSize}px "Courier New", monospace`
    ];
    
    // Test which font loads successfully
    for (const font of fonts) {
      ctx.font = font;
      const metrics = ctx.measureText('test');
      if (metrics.width > 0) {
        break;
      }
    }
    
    // For emoji, we need to render them separately
    // Canvas has poor emoji support, so we detect and handle specially
  }
  
  drawTextWithEmoji(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
    // Split text into emoji and non-emoji parts
    const parts = text.split(/([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}])/gu);
    
    let currentX = x;
    for (const part of parts) {
      if (this.isEmoji(part)) {
        // Draw emoji with color font
        ctx.save();
        ctx.font = ctx.font.replace(/monospace/, '"Apple Color Emoji", "Segoe UI Emoji", emoji');
        ctx.fillText(part, currentX, y);
        ctx.restore();
      } else {
        // Draw regular text
        ctx.fillText(part, currentX, y);
      }
      currentX += ctx.measureText(part).width;
    }
  }
}
```

## Implementation Steps

### Step 1: Create Test Suite
```bash
# Create comprehensive test file
touch src/services/__tests__/screenshot-dimensions.test.ts
```

```typescript
// Test dimensions calculation
describe('Screenshot Dimensions', () => {
  test('calculates correct canvas size with padding', () => {
    const dims = calculateDimensions({
      width: 680,
      padding: 32,
      outerPadding: 40,
      fontSize: 14,
      lines: ['test'],
      windowControls: true
    });
    
    expect(dims.canvas.width).toBe(680 + 80); // width + 2*outerPadding
    expect(dims.window.x).toBe(40);
    expect(dims.window.width).toBe(680);
    expect(dims.content.x).toBe(72); // outerPadding + padding
  });
});
```

### Step 2: Refactor in Stages
1. **Extract dimension calculation** - Move all size calculations to separate method
2. **Fix rendering order** - Ensure shader → window → content
3. **Test each shader** - Create test images for each shader type
4. **Fix font loading** - Add proper font detection and fallbacks
5. **Add debugging output** - Save intermediate canvases for debugging

### Step 3: Testing Protocol
```bash
# Test each component individually
bip ss test.js --shader halftone --debug  # Should show dots
bip ss test.js --shader gradient --debug  # Should show gradient
bip ss test.js --no-window --debug        # Should show content only
bip ss emoji-test.md --debug              # Should render emojis

# Save debug images at each stage
- shader-only.png
- shader-with-window.png  
- final-with-text.png
```

## Rollback Plan
If fixes cause regressions:
1. Git stash changes
2. Revert to previous commit
3. Apply fixes incrementally
4. Test after each change

## Success Criteria
- [ ] Window padding appears OUTSIDE the window
- [ ] Text wraps properly within window bounds
- [ ] Shaders render visible patterns
- [ ] Emojis display correctly
- [ ] No text bleeding outside window
- [ ] Window controls aligned properly
- [ ] All themes work consistently