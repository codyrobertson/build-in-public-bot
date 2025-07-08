// Pure software rasterizer in TypeScript that compiles to WASM-like performance
// This avoids Canvas getImageData/putImageData which causes scanlines

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

export class WasmRasterizer {
  private width: number;
  private height: number;
  private pixels: Uint8Array;
  private themeColors?: ThemeColors;

  constructor(width: number, height: number, themeColors?: ThemeColors) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height * 4);
    this.themeColors = themeColors;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  private getThemedColor(type: 'primary' | 'secondary' | 'accent' | 'background'): { r: number; g: number; b: number } {
    if (!this.themeColors) {
      // Fallback colors if no theme provided
      const fallback = {
        primary: '#ff6b6b',
        secondary: '#4ecdc4', 
        accent: '#45b7d1',
        background: '#2a2a2a'
      };
      return this.hexToRgb(fallback[type]);
    }
    return this.hexToRgb(this.themeColors[type]);
  }

  private setPixel(x: number, y: number, r: number, g: number, b: number, a: number = 255): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    
    const idx = (y * this.width + x) * 4;
    this.pixels[idx] = r;
    this.pixels[idx + 1] = g;
    this.pixels[idx + 2] = b;
    this.pixels[idx + 3] = a;
  }

  renderWaveGradient(): Uint8Array {
    const time = Date.now() * 0.001;
    const mouseX = 0.5; // Default mouse position
    const mouseY = 0.5;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Normalized coordinates
        const u = x / this.width;
        const v = y / this.height;
        
        // Aspect ratio adjustment
        const aspect = this.width / this.height;
        const uvAdjusted = { x: u * aspect, y: v };
        
        // Mouse influence
        const mouseInfluence = 0.05 * Math.sqrt(
          Math.pow(uvAdjusted.x - mouseX * aspect, 2) + 
          Math.pow(v - mouseY, 2)
        );
        
        // Base gradient with wave
        const gradientPos = v + 0.2 * Math.sin(uvAdjusted.x * 1.5 + time * 0.2) - mouseInfluence;
        
        // Theme-aware gradient colors
        const primaryColor = this.getThemedColor('primary');
        const secondaryColor = this.getThemedColor('secondary');
        const accentColor = this.getThemedColor('accent');
        const bgColor = this.getThemedColor('background');
        
        const skyTop = { 
          r: bgColor.r / 255 * 0.7, 
          g: bgColor.g / 255 * 0.7, 
          b: bgColor.b / 255 * 0.7 
        };
        const skyMid = { 
          r: secondaryColor.r / 255 * 0.8, 
          g: secondaryColor.g / 255 * 0.8, 
          b: secondaryColor.b / 255 * 0.8 
        };
        const horizon = { 
          r: accentColor.r / 255, 
          g: accentColor.g / 255, 
          b: accentColor.b / 255 
        };
        const ground = { 
          r: primaryColor.r / 255 * 0.6, 
          g: primaryColor.g / 255 * 0.6, 
          b: primaryColor.b / 255 * 0.6 
        };
        
        let color;
        
        if (gradientPos > 0.7) {
          // Sky top to mid blend
          const t = (gradientPos - 0.7) / 0.3;
          color = {
            r: skyTop.r + (skyMid.r - skyTop.r) * t,
            g: skyTop.g + (skyMid.g - skyTop.g) * t,
            b: skyTop.b + (skyMid.b - skyTop.b) * t
          };
        } else if (gradientPos > 0.4) {
          // Sky mid to horizon blend
          const t = (gradientPos - 0.4) / 0.3;
          color = {
            r: skyMid.r + (horizon.r - skyMid.r) * t,
            g: skyMid.g + (horizon.g - skyMid.g) * t,
            b: skyMid.b + (horizon.b - skyMid.b) * t
          };
        } else {
          // Ground to horizon blend
          const t = Math.max(0, Math.min(1, gradientPos / 0.4));
          color = {
            r: ground.r + (horizon.r - ground.r) * t,
            g: ground.g + (horizon.g - ground.g) * t,
            b: ground.b + (horizon.b - ground.b) * t
          };
        }
        
        // Add horizontal variation
        const variation = Math.sin(uvAdjusted.x * 10.0 + time) * 0.05;
        color.r += variation;
        color.g += variation * 0.4;
        
        // Add atmospheric dust (FBM)
        const dust = this.fbm(u * 3.0 + time * 0.1, v * 3.0) * 0.1;
        color.r += dust;
        color.g += dust * 0.9;
        color.b += dust * 0.7;
        
        // Add grain effect
        const grain = this.noise(u * 500.0 + time * 10.0, v * 500.0) * 0.15;
        const mouseDistance = Math.sqrt(Math.pow(u - mouseX, 2) + Math.pow(v - mouseY, 2));
        const mouseGrainInfluence = this.smoothstep(0.0, 0.5, mouseDistance);
        const grainAmount = grain * mouseGrainInfluence;
        
        color.r += grainAmount;
        color.g += grainAmount;
        color.b += grainAmount;
        
        // Vignette effect
        const vignetteDist = Math.sqrt(Math.pow(u - 0.5, 2) + Math.pow(v - 0.5, 2)) * 1.5;
        const vignette = 1.0 - this.smoothstep(0.5, 1.5, vignetteDist);
        const vignetteMultiplier = 0.8 + 0.2 * vignette;
        
        color.r *= vignetteMultiplier;
        color.g *= vignetteMultiplier;
        color.b *= vignetteMultiplier;
        
        // Convert to 8-bit color
        const r = Math.floor(Math.max(0, Math.min(1, color.r)) * 255);
        const g = Math.floor(Math.max(0, Math.min(1, color.g)) * 255);
        const b = Math.floor(Math.max(0, Math.min(1, color.b)) * 255);
        
        this.setPixel(x, y, r, g, b);
      }
    }
    
    return this.pixels;
  }

  renderMatrix(): Uint8Array {
    // Clear to black
    this.pixels.fill(0);
    
    const fontSize = 10.0;
    const time = Date.now() * 0.001;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const u = x / this.width;
        const v = y / this.height;
        
        // Grid coordinates
        const gridX = Math.floor(u * this.width / fontSize);
        const gridY = Math.floor(v * this.height / fontSize);
        
        // Random value per grid cell
        const random = this.hash(gridX + gridY * 1000.0);
        
        // Falling effect
        const speed = random * 0.5 + 0.5;
        const offset = time * speed;
        const fallPosition = (gridY / (this.height / fontSize) + offset) % 1.0;
        
        // Character brightness
        let brightness = 0.0;
        const cellY = (v * this.height / fontSize) % 1.0;
        
        if (cellY > 0.1 && cellY < 0.9) {
          const charRandom = this.hash(gridX * 100.0 + Math.floor(fallPosition * 20.0));
          if (charRandom > 0.5) {
            brightness = 1.0 - fallPosition;
          }
        }
        
        // Trail effect
        const trailLength = 0.3;
        if (fallPosition < trailLength) {
          brightness = Math.max(brightness, (1.0 - fallPosition / trailLength) * 0.5);
        }
        
        // Theme-aware matrix colors
        const primaryColor = this.getThemedColor('primary');
        const secondaryColor = this.getThemedColor('secondary');
        
        // Use primary color for main characters, secondary for trail
        const mainColor = primaryColor;
        const trailColor = secondaryColor;
        
        // Blend between trail and main color based on brightness
        const r = Math.floor((trailColor.r + (mainColor.r - trailColor.r) * brightness) * brightness);
        const g = Math.floor((trailColor.g + (mainColor.g - trailColor.g) * brightness) * brightness);
        const b = Math.floor((trailColor.b + (mainColor.b - trailColor.b) * brightness) * brightness);
        
        this.setPixel(x, y, r, g, b);
      }
    }
    
    return this.pixels;
  }

  renderHalftone(): Uint8Array {
    const time = Date.now() * 0.001;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Normalized coordinates (0 to 1)
        const u = x / this.width;
        const v = y / this.height;
        
        // Apply theme colors for consistent full coverage
        const primaryColor = this.getThemedColor('primary');
        const secondaryColor = this.getThemedColor('secondary');
        const bgColor = this.getThemedColor('background');
        
        // Create base gradient from background to secondary
        const baseGradient = 0.4 + 0.3 * this.fbm(u * 2.0, v * 2.0);
        
        // Generate halftone dots with regular grid
        const dotScale = 20.0; // Consistent dot spacing
        const gridU = (u * dotScale) % 1.0;
        const gridV = (v * dotScale) % 1.0;
        
        // Distance from center of each grid cell (0.5, 0.5)
        const dotDist = Math.sqrt(
          Math.pow(gridU - 0.5, 2) + 
          Math.pow(gridV - 0.5, 2)
        );
        
        // Vary dot size based on position and time for organic feel
        const dotSizeVariation = 0.3 + 0.2 * this.fbm(u * 4.0 + time * 0.1, v * 4.0);
        const maxDotRadius = 0.35 * dotSizeVariation;
        
        // Create smooth dots
        const dotIntensity = this.smoothstep(maxDotRadius, maxDotRadius - 0.1, dotDist);
        
        // Add flowing movement to the pattern
        const flow = this.fbm(u * 3.0 + time * 0.3, v * 3.0 + time * 0.2) * 0.2;
        
        // Combine base gradient, dots, and flow
        const totalIntensity = Math.max(0, Math.min(1, 
          baseGradient * 0.6 + dotIntensity * 0.8 + flow
        ));
        
        // Three-color blend based on intensity
        let r, g, b;
        if (totalIntensity < 0.33) {
          // Background to secondary blend
          const t = totalIntensity * 3.0;
          r = Math.floor(bgColor.r + (secondaryColor.r - bgColor.r) * t);
          g = Math.floor(bgColor.g + (secondaryColor.g - bgColor.g) * t);
          b = Math.floor(bgColor.b + (secondaryColor.b - bgColor.b) * t);
        } else if (totalIntensity < 0.66) {
          // Secondary to primary blend
          const t = (totalIntensity - 0.33) * 3.0;
          r = Math.floor(secondaryColor.r + (primaryColor.r - secondaryColor.r) * t);
          g = Math.floor(secondaryColor.g + (primaryColor.g - secondaryColor.g) * t);
          b = Math.floor(secondaryColor.b + (primaryColor.b - secondaryColor.b) * t);
        } else {
          // Primary with highlights
          const t = (totalIntensity - 0.66) * 3.0;
          const highlightR = Math.min(255, primaryColor.r + 40);
          const highlightG = Math.min(255, primaryColor.g + 40);
          const highlightB = Math.min(255, primaryColor.b + 40);
          r = Math.floor(primaryColor.r + (highlightR - primaryColor.r) * t);
          g = Math.floor(primaryColor.g + (highlightG - primaryColor.g) * t);
          b = Math.floor(primaryColor.b + (highlightB - primaryColor.b) * t);
        }
        
        this.setPixel(x, y, r, g, b);
      }
    }
    
    return this.pixels;
  }

  renderDisruptor(): Uint8Array {
    const time = Date.now() * 0.001;
    const mouseX = 0.5;
    const mouseY = 0.5;
    
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        // Normalized coordinates
        let u = x / this.width;
        let v = y / this.height;
        
        // Adjust for aspect ratio
        const aspect = this.width / this.height;
        u = u * aspect;
        
        // Mouse influence
        const mouse = { x: mouseX * aspect, y: mouseY };
        const mouseDistance = Math.sqrt(Math.pow(u - mouse.x, 2) + Math.pow(v - mouse.y, 2));
        const mouseInfluence = this.smoothstep(0.5, 0.0, mouseDistance);
        
        // Time-based movement
        const t = time * 0.2;
        
        // Create organic motion with multiple layers of noise (using simplex noise approximation)
        const n1 = this.fbm(u * 1.5 + t * 0.3, v * 1.5 + t * 0.2);
        const n2 = this.fbm(u * 2.5 - t * 0.2, v * 2.5 - t * 0.1);
        const n3 = this.fbm(u * 0.8 + t * 0.1, v * 0.8 + t * 0.3);
        
        // Combine noise layers for organic motion
        let organicNoise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
        
        // Add mouse influence to the noise
        organicNoise += mouseInfluence * 0.3 * Math.sin(t * 2.0);
        
        // Create a more dynamic pattern with additional noise
        const pattern = this.fbm(u * (1.0 + mouseInfluence) + organicNoise * 0.2, 
                                 v * (1.0 + mouseInfluence) + organicNoise * 0.2);
        
        // Apply dithering effect
        const brightness = 0.5 + 0.5 * pattern;
        const dithered = this.dither(u, v, brightness);
        
        // Create theme-aware color palette
        const primaryColor = this.getThemedColor('primary');
        const secondaryColor = this.getThemedColor('secondary');
        const accentColor = this.getThemedColor('accent');
        
        const color1 = { 
          r: primaryColor.r / 255 * 0.3, 
          g: primaryColor.g / 255 * 0.3, 
          b: primaryColor.b / 255 * 0.3 
        };
        const color2 = { 
          r: secondaryColor.r / 255 * 0.7, 
          g: secondaryColor.g / 255 * 0.7, 
          b: secondaryColor.b / 255 * 0.7 
        };
        const color3 = { 
          r: accentColor.r / 255, 
          g: accentColor.g / 255, 
          b: accentColor.b / 255 
        };
        
        // Mix colors based on the noise and dithering
        let finalColor;
        if (dithered > 0.5) {
          finalColor = color3;
        } else {
          const t = organicNoise;
          finalColor = {
            r: color1.r + (color2.r - color1.r) * t,
            g: color1.g + (color2.g - color1.g) * t,
            b: color1.b + (color2.b - color1.b) * t
          };
        }
        
        // Add subtle pulsing glow around mouse
        const pulseAmount = mouseInfluence * (0.5 + 0.5 * Math.sin(time * 3.0));
        finalColor.r += 0.1 * pulseAmount;
        finalColor.g += 0.2 * pulseAmount;
        finalColor.b += 0.3 * pulseAmount;
        
        // Convert to 8-bit color
        const r = Math.floor(Math.max(0, Math.min(1, finalColor.r)) * 255);
        const g = Math.floor(Math.max(0, Math.min(1, finalColor.g)) * 255);
        const b = Math.floor(Math.max(0, Math.min(1, finalColor.b)) * 255);
        
        this.setPixel(x, y, r, g, b);
      }
    }
    
    return this.pixels;
  }

  // 4x4 Bayer matrix dithering
  private dither(u: number, v: number, brightness: number): number {
    const bayer = [
      0.0/16.0, 8.0/16.0, 2.0/16.0, 10.0/16.0,
      12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0,
      3.0/16.0, 11.0/16.0, 1.0/16.0, 9.0/16.0,
      15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0
    ];
    
    const x = Math.floor((u * 100.0) % 4.0);
    const y = Math.floor((v * 100.0) % 4.0);
    
    const threshold = bayer[x + y * 4];
    
    return brightness > threshold ? 1.0 : 0.0;
  }

  private hash(n: number): number;
  private hash(p: { x: number, y: number }): number;
  private hash(input: number | { x: number, y: number }): number {
    if (typeof input === 'number') {
      const x = Math.sin(input) * 43758.5453;
      return x - Math.floor(x);
    } else {
      let p = {
        x: (input.x * 123.34) % 1,
        y: (input.y * 456.21) % 1
      };
      const dot = p.x * (p.x + 45.32) + p.y * (p.y + 45.32);
      return ((p.x * p.y + dot) * 43758.5453) % 1;
    }
  }

  private noise(x: number, y: number): number {
    const p = { x, y };
    const i = { x: Math.floor(p.x), y: Math.floor(p.y) };
    const f = { x: p.x - i.x, y: p.y - i.y };
    
    // Smoothstep
    const u = {
      x: f.x * f.x * (3.0 - 2.0 * f.x),
      y: f.y * f.y * (3.0 - 2.0 * f.y)
    };
    
    const a = this.hash({ x: i.x, y: i.y });
    const b = this.hash({ x: i.x + 1.0, y: i.y });
    const c = this.hash({ x: i.x, y: i.y + 1.0 });
    const d = this.hash({ x: i.x + 1.0, y: i.y + 1.0 });
    
    return this.mix(this.mix(a, b, u.x), this.mix(c, d, u.x), u.y);
  }

  private fbm(x: number, y: number): number {
    let value = 0.0;
    let amplitude = 0.5;
    let frequency = 3.0;
    
    for (let i = 0; i < 5; i++) {
      value += amplitude * this.noise(x * frequency, y * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    
    return value;
  }

  private mix(a: number, b: number, t: number): number {
    return a * (1.0 - t) + b * t;
  }

  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3.0 - 2.0 * t);
  }

  // Convert to PNG using pure JS PNG encoder
  async toPNG(): Promise<Buffer> {
    const { PNG } = await import('pngjs');
    const png = new PNG({ width: this.width, height: this.height });
    
    // Copy pixels
    for (let i = 0; i < this.pixels.length; i++) {
      png.data[i] = this.pixels[i];
    }
    
    return PNG.sync.write(png);
  }

  getPixels(): Uint8Array {
    return this.pixels;
  }
}