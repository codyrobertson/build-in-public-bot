import { createCanvas, Canvas } from 'canvas';
import { CodeTheme } from '../themes/theme.types';
import { logger } from '../utils/logger';

export interface ShaderConfig {
  name: string;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };
  parameters?: {
    intensity?: number;
    scale?: number;
  };
}

export interface ShaderUniforms {
  u_resolution: [number, number];
  u_colors: {
    primary: [number, number, number];
    secondary: [number, number, number];
    accent: [number, number, number];
    background: [number, number, number];
  };
  u_params: {
    intensity: number;
    scale: number;
  };
}

export class ShaderRenderer {
  private static instance: ShaderRenderer;
  
  static getInstance(): ShaderRenderer {
    if (!ShaderRenderer.instance) {
      ShaderRenderer.instance = new ShaderRenderer();
    }
    return ShaderRenderer.instance;
  }

  // Convert hex color to RGB array
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return [0, 0, 0];
    
    return [
      parseInt(result[1], 16) / 255,
      parseInt(result[2], 16) / 255,
      parseInt(result[3], 16) / 255
    ];
  }

  // Extract theme colors for shaders
  private extractThemeColors(theme: CodeTheme): ShaderUniforms['u_colors'] {
    return {
      primary: this.hexToRgb(theme.keyword || theme.foreground),
      secondary: this.hexToRgb(theme.string || theme.foreground),
      accent: this.hexToRgb(theme.function || theme.foreground),
      background: this.hexToRgb(theme.background)
    };
  }

  // Apply default shader parameters
  private getDefaultParams(): ShaderUniforms['u_params'] {
    return {
      intensity: 1.0,
      scale: 1.0
    };
  }

  // Noise functions for CPU-based shader simulation
  private hash(x: number, y: number): number {
    let h = (x * 123.34 + y * 456.21) % 1;
    h = (h * (h + 45.32)) % 1;
    return Math.abs(h);
  }

  private noise(x: number, y: number): number {
    const i = Math.floor(x);
    const j = Math.floor(y);
    const fx = x - i;
    const fy = y - j;
    
    const a = this.hash(i, j);
    const b = this.hash(i + 1, j);
    const c = this.hash(i, j + 1);
    const d = this.hash(i + 1, j + 1);
    
    const u = fx * fx * (3 - 2 * fx);
    const v = fy * fy * (3 - 2 * fy);
    
    return a * (1 - u) * (1 - v) + 
           b * u * (1 - v) + 
           c * (1 - u) * v + 
           d * u * v;
  }

  private fbm(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    
    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise(x * frequency, y * frequency);
      amplitude *= 0.5;
      frequency *= 2;
    }
    
    return value;
  }

  // Halftone shader implementation
  private renderHalftone(
    ctx: any,
    width: number,
    height: number,
    uniforms: ShaderUniforms
  ): void {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const uv_x = x / width;
        const uv_y = y / height;
        
        // Aspect ratio adjustment
        const aspect = width / height;
        const adj_x = uv_x * aspect;
        const adj_y = uv_y;
        
        // Generate organic flow field
        const p_x = adj_x;
        const p_y = adj_y;
        
        const flow = this.fbm(p_x * 3, p_y * 3);
        
        // Generate dots with proper scale parameter
        const scale = 15.0 * uniforms.u_params.scale;
        const grid_x = (p_x * scale) % 1 - 0.5;
        const grid_y = (p_y * scale) % 1 - 0.5;
        const gridDist = Math.sqrt(grid_x * grid_x + grid_y * grid_y);
        
        const dotSize = (0.1 + 0.05 * Math.sin(flow * 6.28)) * uniforms.u_params.intensity;
        const dots = gridDist < dotSize ? 1 : 0;
        
        // Apply theme colors
        const intensity = dots * (0.7 + 0.3 * this.fbm(p_x * 2, p_y * 2)) * uniforms.u_params.intensity;
        
        const color = [
          uniforms.u_colors.primary[0] * intensity + uniforms.u_colors.background[0] * (1 - intensity),
          uniforms.u_colors.primary[1] * intensity + uniforms.u_colors.background[1] * (1 - intensity),
          uniforms.u_colors.primary[2] * intensity + uniforms.u_colors.background[2] * (1 - intensity)
        ];
        
        const pixelIndex = (y * width + x) * 4;
        data[pixelIndex] = Math.floor(color[0] * 255);
        data[pixelIndex + 1] = Math.floor(color[1] * 255);
        data[pixelIndex + 2] = Math.floor(color[2] * 255);
        data[pixelIndex + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  // Disruptor shader implementation
  private renderDisruptor(
    ctx: any,
    width: number,
    height: number,
    uniforms: ShaderUniforms
  ): void {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const uv_x = x / width;
        const uv_y = y / height;
        
        const aspect = width / height;
        const adj_x = uv_x * aspect;
        const adj_y = uv_y;
        
        // Create organic pattern
        const n1 = this.fbm(adj_x * 1.5, adj_y * 1.5);
        const n2 = this.fbm(adj_x * 2.5, adj_y * 2.5);
        const organicNoise = n1 * 0.5 + n2 * 0.3;
        
        // Dithering
        const bayerMatrix = [
          0/16, 8/16, 2/16, 10/16,
          12/16, 4/16, 14/16, 6/16,
          3/16, 11/16, 1/16, 9/16,
          15/16, 7/16, 13/16, 5/16
        ];
        
        const bx = Math.floor(x % 4);
        const by = Math.floor(y % 4);
        const threshold = bayerMatrix[by * 4 + bx];
        
        const brightness = 0.5 + 0.5 * organicNoise * uniforms.u_params.intensity;
        const dithered = brightness > threshold ? 1 : 0;
        
        // Mix theme colors
        const color1 = uniforms.u_colors.background;
        const color2 = uniforms.u_colors.secondary;
        const color3 = uniforms.u_colors.primary;
        
        const finalColor = [
          color1[0] * (1 - organicNoise) * (1 - dithered) + color2[0] * organicNoise * (1 - dithered) + color3[0] * dithered,
          color1[1] * (1 - organicNoise) * (1 - dithered) + color2[1] * organicNoise * (1 - dithered) + color3[1] * dithered,
          color1[2] * (1 - organicNoise) * (1 - dithered) + color2[2] * organicNoise * (1 - dithered) + color3[2] * dithered
        ];
        
        const pixelIndex = (y * width + x) * 4;
        data[pixelIndex] = Math.floor(finalColor[0] * 255);
        data[pixelIndex + 1] = Math.floor(finalColor[1] * 255);
        data[pixelIndex + 2] = Math.floor(finalColor[2] * 255);
        data[pixelIndex + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  // Wave-gradient shader implementation (inspired by Shinkai's style)
  private renderWaveGradient(
    ctx: any,
    width: number,
    height: number,
    uniforms: ShaderUniforms
  ): void {
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;
    const time = Date.now() * 0.001; // Simple time for animation effect
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const uv_x = x / width;
        const uv_y = y / height;
        
        // Adjust aspect ratio
        const aspect = width / height;
        const adj_x = uv_x * aspect;
        const adj_y = uv_y;
        
        // Base gradient with wave distortion
        const waveIntensity = 0.2 * uniforms.u_params.intensity;
        const waveScale = 1.5 * uniforms.u_params.scale;
        const gradientPos = adj_y + waveIntensity * Math.sin(adj_x * waveScale + time * 0.2);
        
        // Shinkai-style color palette using theme colors
        const skyTop = uniforms.u_colors.background;      // Deep background
        const skyMid = uniforms.u_colors.secondary;       // Mid tone
        const horizon = uniforms.u_colors.primary;        // Highlight
        const ground = uniforms.u_colors.accent;          // Accent color
        
        let color: [number, number, number];
        
        if (gradientPos > 0.7) {
          const t = (gradientPos - 0.7) / 0.3;
          color = [
            skyTop[0] * (1 - t) + skyMid[0] * t,
            skyTop[1] * (1 - t) + skyMid[1] * t,
            skyTop[2] * (1 - t) + skyMid[2] * t
          ];
        } else if (gradientPos > 0.4) {
          const t = (gradientPos - 0.4) / 0.3;
          color = [
            skyMid[0] * (1 - t) + horizon[0] * t,
            skyMid[1] * (1 - t) + horizon[1] * t,
            skyMid[2] * (1 - t) + horizon[2] * t
          ];
        } else {
          const t = gradientPos / 0.4;
          color = [
            ground[0] * (1 - t) + horizon[0] * t,
            ground[1] * (1 - t) + horizon[1] * t,
            ground[2] * (1 - t) + horizon[2] * t
          ];
        }
        
        // Add horizontal variation
        const horizontalVariation = 0.05 * Math.sin(adj_x * 10.0 + time);
        color[0] += horizontalVariation;
        color[1] += horizontalVariation * 0.5;
        
        // Add atmospheric dust/grain
        const dust = this.fbm(adj_x * 3.0, adj_y * 3.0) * 0.1 * uniforms.u_params.intensity;
        color[0] += dust;
        color[1] += dust * 0.9;
        color[2] += dust * 0.7;
        
        // Subtle vignette
        const center_x = adj_x - aspect * 0.5;
        const center_y = adj_y - 0.5;
        const vignette = 1.0 - Math.min(1.0, (center_x * center_x + center_y * center_y) * 0.8);
        color[0] *= 0.8 + 0.2 * vignette;
        color[1] *= 0.8 + 0.2 * vignette;
        color[2] *= 0.8 + 0.2 * vignette;
        
        // Clamp colors
        color[0] = Math.max(0, Math.min(1, color[0]));
        color[1] = Math.max(0, Math.min(1, color[1]));
        color[2] = Math.max(0, Math.min(1, color[2]));
        
        const pixelIndex = (y * width + x) * 4;
        data[pixelIndex] = Math.floor(color[0] * 255);
        data[pixelIndex + 1] = Math.floor(color[1] * 255);
        data[pixelIndex + 2] = Math.floor(color[2] * 255);
        data[pixelIndex + 3] = 255;
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  }


  // Main render function
  renderShaderBackground(
    width: number,
    height: number,
    theme: CodeTheme,
    shaderName: string,
    config?: Partial<ShaderConfig>
  ): Canvas {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Set up uniforms
    const uniforms: ShaderUniforms = {
      u_resolution: [width, height],
      u_colors: this.extractThemeColors(theme),
      u_params: {
        ...this.getDefaultParams(),
        ...config?.parameters
      }
    };
    
    // Override theme colors if provided in config
    if (config?.colors) {
      if (config.colors.primary) uniforms.u_colors.primary = this.hexToRgb(config.colors.primary);
      if (config.colors.secondary) uniforms.u_colors.secondary = this.hexToRgb(config.colors.secondary);
      if (config.colors.accent) uniforms.u_colors.accent = this.hexToRgb(config.colors.accent);
      if (config.colors.background) uniforms.u_colors.background = this.hexToRgb(config.colors.background);
    }
    
    try {
      switch (shaderName.toLowerCase()) {
        case 'halftone':
          this.renderHalftone(ctx, width, height, uniforms);
          break;
        case 'disruptor':
          this.renderDisruptor(ctx, width, height, uniforms);
          break;
        case 'wave-gradient':
        case 'wave':
          this.renderWaveGradient(ctx, width, height, uniforms);
          break;
        default:
          // Default gradient fallback
          const gradient = ctx.createLinearGradient(0, 0, 0, height);
          gradient.addColorStop(0, theme.gradientFrom || theme.background);
          gradient.addColorStop(1, theme.gradientTo || theme.background);
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
      }
    } catch (error) {
      logger.warn(`Failed to render shader ${shaderName}, using fallback: ${error}`);
      // Fallback to simple gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, theme.gradientFrom || theme.background);
      gradient.addColorStop(1, theme.gradientTo || theme.background);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }
    
    return canvas;
  }
  
  // Get available shader names
  getAvailableShaders(): string[] {
    return ['halftone', 'disruptor', 'wave-gradient'];
  }
}