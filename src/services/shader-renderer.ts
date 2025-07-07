import { logger } from '../utils/logger';

interface ShaderUniforms {
  u_time: number;
  u_resolution: [number, number];
  u_params: {
    intensity: number;
    scale: number;
  };
}

export class ShaderRenderer {
  private static instance: ShaderRenderer;

  private constructor() {}

  static getInstance(): ShaderRenderer {
    if (!ShaderRenderer.instance) {
      ShaderRenderer.instance = new ShaderRenderer();
    }
    return ShaderRenderer.instance;
  }

  async applyShader(
    ctx: any,
    shaderName: string,
    width: number,
    height: number,
    theme: any,
    params: any = {}
  ): Promise<void> {
    try {
      logger.debug(`Applying shader: ${shaderName}`);

      const uniforms: ShaderUniforms = {
        u_time: Date.now() * 0.001,
        u_resolution: [width, height],
        u_params: {
          intensity: params.intensity || 1.0,
          scale: params.scale || 1.0
        }
      };

      switch (shaderName) {
        case 'halftone':
          this.applyHalftoneShader(ctx, width, height, uniforms);
          break;
        case 'wave-gradient':
          this.applyWaveGradientShader(ctx, width, height, uniforms, theme);
          break;
        case 'disruptor':
          this.applyDisruptorShader(ctx, width, height, uniforms);
          break;
        default:
          logger.warn(`Unknown shader: ${shaderName}`);
      }
    } catch (error) {
      logger.error(`Failed to apply shader ${shaderName}:`, error);
    }
  }

  private applyHalftoneShader(
    ctx: any,
    width: number,
    height: number,
    uniforms: ShaderUniforms
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const scale = 15.0 * uniforms.u_params.scale;
    const time = uniforms.u_time;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        
        // Get original pixel
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];

        // Calculate luminance
        const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255.0;

        // Create halftone pattern
        const coordX = x / scale;
        const coordY = y / scale;
        const flow = Math.sin(coordX * 0.1 + time) * Math.cos(coordY * 0.1 + time);
        
        const dotSize = (0.1 + 0.05 * Math.sin(flow * 6.28)) * uniforms.u_params.intensity;
        const distance = Math.sqrt(
          Math.pow(coordX - Math.floor(coordX) - 0.5, 2) + 
          Math.pow(coordY - Math.floor(coordY) - 0.5, 2)
        );

        const mask = distance < (dotSize * (1.0 - luminance)) ? 1.0 : 0.3;

        // Apply halftone effect
        data[index] = Math.floor(r * mask);
        data[index + 1] = Math.floor(g * mask);
        data[index + 2] = Math.floor(b * mask);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private applyWaveGradientShader(
    ctx: any,
    width: number,
    height: number,
    uniforms: ShaderUniforms,
    theme: any
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const time = uniforms.u_time;
    const intensity = uniforms.u_params.intensity;
    const scale = uniforms.u_params.scale;

    // Get theme colors or use defaults
    const primary = this.hexToRgb(theme.shader?.colors?.primary || '#8be9fd');
    const secondary = this.hexToRgb(theme.shader?.colors?.secondary || '#50fa7b');
    const accent = this.hexToRgb(theme.shader?.colors?.accent || '#ff79c6');

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        
        // Get original pixel
        const originalR = data[index];
        const originalG = data[index + 1];
        const originalB = data[index + 2];

        // Create wave pattern
        const coordX = x / width;
        const coordY = y / height;
        
        const wave1 = Math.sin((coordX * 2.0 + time * 0.5) * scale * 3.14159);
        const wave2 = Math.cos((coordY * 3.0 + time * 0.3) * scale * 3.14159);
        const wave3 = Math.sin((coordX + coordY + time * 0.2) * scale * 3.14159);
        
        const pattern = (wave1 + wave2 + wave3) / 3.0;
        const normalizedPattern = (pattern + 1.0) / 2.0;

        // Create gradient colors
        let gradientR, gradientG, gradientB;
        
        if (normalizedPattern < 0.33) {
          const t = normalizedPattern / 0.33;
          gradientR = primary.r + (secondary.r - primary.r) * t;
          gradientG = primary.g + (secondary.g - primary.g) * t;
          gradientB = primary.b + (secondary.b - primary.b) * t;
        } else if (normalizedPattern < 0.66) {
          const t = (normalizedPattern - 0.33) / 0.33;
          gradientR = secondary.r + (accent.r - secondary.r) * t;
          gradientG = secondary.g + (accent.g - secondary.g) * t;
          gradientB = secondary.b + (accent.b - secondary.b) * t;
        } else {
          const t = (normalizedPattern - 0.66) / 0.34;
          gradientR = accent.r + (primary.r - accent.r) * t;
          gradientG = accent.g + (primary.g - accent.g) * t;
          gradientB = accent.b + (primary.b - accent.b) * t;
        }

        // Blend with original
        const blendFactor = intensity * 0.3;
        data[index] = Math.floor(originalR * (1 - blendFactor) + gradientR * blendFactor);
        data[index + 1] = Math.floor(originalG * (1 - blendFactor) + gradientG * blendFactor);
        data[index + 2] = Math.floor(originalB * (1 - blendFactor) + gradientB * blendFactor);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private applyDisruptorShader(
    ctx: any,
    width: number,
    height: number,
    uniforms: ShaderUniforms
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const time = uniforms.u_time;
    const intensity = uniforms.u_params.intensity;
    const scale = uniforms.u_params.scale;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        
        // Create disruption pattern
        const coordX = x / width;
        const coordY = y / height;
        
        const noise1 = Math.sin(coordX * 50.0 * scale + time * 2.0);
        const noise2 = Math.cos(coordY * 30.0 * scale + time * 1.5);
        const noise3 = Math.sin((coordX + coordY) * 25.0 * scale + time);
        
        const disruption = (noise1 + noise2 + noise3) * intensity * 0.1;
        
        // Calculate offset coordinates
        const offsetX = Math.floor(x + disruption * 10);
        const offsetY = Math.floor(y + disruption * 5);
        
        // Bounds check
        if (offsetX >= 0 && offsetX < width && offsetY >= 0 && offsetY < height) {
          const sourceIndex = (offsetY * width + offsetX) * 4;
          
          // Copy displaced pixel with color shift
          data[index] = Math.min(255, data[sourceIndex] + disruption * 20);
          data[index + 1] = data[sourceIndex + 1];
          data[index + 2] = Math.min(255, data[sourceIndex + 2] + disruption * 30);
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }

  getAvailableShaders(): string[] {
    return ['halftone', 'wave-gradient', 'disruptor'];
  }
}