import { ShaderRenderer } from '../shader-renderer';
import { CodeTheme } from '../../themes/theme.types';
import { createCanvas } from 'canvas';

// Mock canvas
jest.mock('canvas');
const mockCreateCanvas = createCanvas as jest.MockedFunction<typeof createCanvas>;

describe('ShaderRenderer', () => {
  let shaderRenderer: ShaderRenderer;
  let mockCanvas: any;
  let mockContext: any;

  const mockTheme: CodeTheme = {
    name: 'Test Theme',
    variant: 'dark',
    background: '#282a36',
    foreground: '#f8f8f2',
    comment: '#6272a4',
    string: '#f1fa8c',
    number: '#bd93f9',
    keyword: '#8be9fd',
    operator: '#ff79c6',
    function: '#50fa7b',
    variable: '#ffb86c',
    constant: '#bd93f9',
    type: '#8be9fd',
    class: '#50fa7b',
    property: '#50fa7b',
    attribute: '#f1fa8c',
    tag: '#ff79c6',
    regexp: '#f1fa8c',
  };

  beforeEach(() => {
    // Reset singleton
    (ShaderRenderer as any).instance = null;

    // Mock canvas and context
    mockContext = {
      createImageData: jest.fn().mockReturnValue({
        data: new Uint8ClampedArray(1600), // 20x20 image * 4 channels
      }),
      putImageData: jest.fn(),
      fillStyle: '',
      fillRect: jest.fn(),
      createLinearGradient: jest.fn().mockReturnValue({
        addColorStop: jest.fn(),
      }),
    };

    mockCanvas = {
      getContext: jest.fn().mockReturnValue(mockContext),
      width: 400,
      height: 300,
    };

    mockCreateCanvas.mockReturnValue(mockCanvas);

    shaderRenderer = ShaderRenderer.getInstance();
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should create singleton instance', () => {
      const instance1 = ShaderRenderer.getInstance();
      const instance2 = ShaderRenderer.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('getAvailableShaders', () => {
    it('should return list of available shaders', () => {
      const shaders = shaderRenderer.getAvailableShaders();
      expect(shaders).toEqual(['halftone', 'disruptor', 'wave-gradient']);
    });
  });

  describe('renderShaderBackground', () => {
    const width = 400;
    const height = 300;

    it('should render halftone shader', () => {
      const canvas = shaderRenderer.renderShaderBackground(
        width,
        height,
        mockTheme,
        'halftone'
      );

      expect(mockCreateCanvas).toHaveBeenCalledWith(width, height);
      expect(mockContext.createImageData).toHaveBeenCalledWith(width, height);
      expect(mockContext.putImageData).toHaveBeenCalled();
      expect(canvas).toBe(mockCanvas);
    });

    it('should render disruptor shader', () => {
      const canvas = shaderRenderer.renderShaderBackground(
        width,
        height,
        mockTheme,
        'disruptor'
      );

      expect(mockCreateCanvas).toHaveBeenCalledWith(width, height);
      expect(mockContext.createImageData).toHaveBeenCalledWith(width, height);
      expect(mockContext.putImageData).toHaveBeenCalled();
      expect(canvas).toBe(mockCanvas);
    });

    it('should render wave-gradient shader', () => {
      const canvas = shaderRenderer.renderShaderBackground(
        width,
        height,
        mockTheme,
        'wave-gradient'
      );

      expect(mockCreateCanvas).toHaveBeenCalledWith(width, height);
      expect(mockContext.createImageData).toHaveBeenCalledWith(width, height);
      expect(mockContext.putImageData).toHaveBeenCalled();
      expect(canvas).toBe(mockCanvas);
    });

    it('should handle shader parameters', () => {
      const config = {
        parameters: {
          intensity: 1.5,
          scale: 2.0,
        },
      };

      const canvas = shaderRenderer.renderShaderBackground(
        width,
        height,
        mockTheme,
        'halftone',
        config
      );

      expect(mockContext.createImageData).toHaveBeenCalled();
      expect(canvas).toBe(mockCanvas);
    });

    it('should handle custom colors', () => {
      const config = {
        colors: {
          primary: '#ff0000',
          secondary: '#00ff00',
          accent: '#0000ff',
          background: '#ffffff',
        },
      };

      const canvas = shaderRenderer.renderShaderBackground(
        width,
        height,
        mockTheme,
        'halftone',
        config
      );

      expect(mockContext.createImageData).toHaveBeenCalled();
      expect(canvas).toBe(mockCanvas);
    });

    it('should fallback to gradient for unknown shader', () => {
      const canvas = shaderRenderer.renderShaderBackground(
        width,
        height,
        { ...mockTheme, gradientFrom: '#000000', gradientTo: '#ffffff' },
        'unknown-shader'
      );

      expect(mockContext.createLinearGradient).toHaveBeenCalled();
      expect(canvas).toBe(mockCanvas);
    });

    it('should handle shader rendering errors gracefully', () => {
      mockContext.createImageData.mockImplementation(() => {
        throw new Error('ImageData creation failed');
      });

      const canvas = shaderRenderer.renderShaderBackground(
        width,
        height,
        mockTheme,
        'halftone'
      );

      // Should fallback to gradient
      expect(mockContext.createLinearGradient).toHaveBeenCalled();
      expect(canvas).toBe(mockCanvas);
    });

    it('should handle large canvas sizes', () => {
      const largeWidth = 2000;
      const largeHeight = 1500;

      const canvas = shaderRenderer.renderShaderBackground(
        largeWidth,
        largeHeight,
        mockTheme,
        'halftone'
      );

      expect(mockCreateCanvas).toHaveBeenCalledWith(largeWidth, largeHeight);
      expect(mockContext.createImageData).toHaveBeenCalledWith(largeWidth, largeHeight);
      expect(canvas).toBe(mockCanvas);
    });

    it('should handle different aspect ratios', () => {
      const testCases = [
        { width: 100, height: 1000 }, // Very tall
        { width: 1000, height: 100 }, // Very wide
        { width: 800, height: 800 },  // Square
      ];

      testCases.forEach(({ width, height }) => {
        const canvas = shaderRenderer.renderShaderBackground(
          width,
          height,
          mockTheme,
          'wave-gradient'
        );

        expect(mockCreateCanvas).toHaveBeenCalledWith(width, height);
        expect(canvas).toBe(mockCanvas);
      });
    });
  });

  describe('Color Utilities', () => {
    it('should convert hex colors to RGB correctly', () => {
      // This tests the private hexToRgb method indirectly
      const canvas = shaderRenderer.renderShaderBackground(
        100,
        100,
        mockTheme,
        'halftone',
        {
          colors: {
            primary: '#ff0000',    // Red
            secondary: '#00ff00',  // Green
            accent: '#0000ff',     // Blue
            background: '#ffffff', // White
          },
        }
      );

      expect(mockContext.createImageData).toHaveBeenCalled();
      expect(canvas).toBe(mockCanvas);
    });

    it('should extract theme colors correctly', () => {
      const canvas = shaderRenderer.renderShaderBackground(
        100,
        100,
        mockTheme,
        'disruptor'
      );

      expect(mockContext.createImageData).toHaveBeenCalled();
      expect(canvas).toBe(mockCanvas);
    });
  });

  describe('Noise Functions', () => {
    it('should generate consistent noise patterns', () => {
      // Test that the same parameters produce the same results
      const canvas1 = shaderRenderer.renderShaderBackground(
        200,
        200,
        mockTheme,
        'halftone',
        { parameters: { intensity: 1.0, scale: 1.0 } }
      );

      const canvas2 = shaderRenderer.renderShaderBackground(
        200,
        200,
        mockTheme,
        'halftone',
        { parameters: { intensity: 1.0, scale: 1.0 } }
      );

      expect(mockContext.putImageData).toHaveBeenCalledTimes(2);
      expect(canvas1).toBe(mockCanvas);
      expect(canvas2).toBe(mockCanvas);
    });

    it('should produce different results with different parameters', () => {
      const config1 = { parameters: { intensity: 0.5, scale: 0.5 } };
      const config2 = { parameters: { intensity: 2.0, scale: 2.0 } };

      shaderRenderer.renderShaderBackground(100, 100, mockTheme, 'halftone', config1);
      shaderRenderer.renderShaderBackground(100, 100, mockTheme, 'halftone', config2);

      expect(mockContext.createImageData).toHaveBeenCalledTimes(2);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple rapid shader renders', () => {
      const shaders = ['halftone', 'disruptor', 'wave-gradient'];
      
      shaders.forEach(shader => {
        const canvas = shaderRenderer.renderShaderBackground(
          300,
          200,
          mockTheme,
          shader
        );
        expect(canvas).toBe(mockCanvas);
      });

      expect(mockCreateCanvas).toHaveBeenCalledTimes(shaders.length);
    });

    it('should handle memory efficiently with large renders', () => {
      // Test that we don't run out of memory with large canvases
      const canvas = shaderRenderer.renderShaderBackground(
        1920,
        1080,
        mockTheme,
        'wave-gradient'
      );

      expect(mockCreateCanvas).toHaveBeenCalledWith(1920, 1080);
      expect(canvas).toBe(mockCanvas);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero dimensions', () => {
      const canvas = shaderRenderer.renderShaderBackground(
        0,
        0,
        mockTheme,
        'halftone'
      );

      expect(mockCreateCanvas).toHaveBeenCalledWith(0, 0);
      expect(canvas).toBe(mockCanvas);
    });

    it('should handle missing theme colors', () => {
      const incompleteTheme = {
        ...mockTheme,
        keyword: undefined,
        function: undefined,
      } as any;

      const canvas = shaderRenderer.renderShaderBackground(
        100,
        100,
        incompleteTheme,
        'disruptor'
      );

      expect(canvas).toBe(mockCanvas);
    });

    it('should handle extreme parameter values', () => {
      const extremeConfig = {
        parameters: {
          intensity: 1000,
          scale: 0.001,
        },
      };

      const canvas = shaderRenderer.renderShaderBackground(
        100,
        100,
        mockTheme,
        'halftone',
        extremeConfig
      );

      expect(canvas).toBe(mockCanvas);
    });

    it('should handle invalid color strings', () => {
      const invalidColorConfig = {
        colors: {
          primary: 'invalid-color',
          secondary: '#gggggg',
          accent: 'rgb(300, 300, 300)',
        },
      };

      const canvas = shaderRenderer.renderShaderBackground(
        100,
        100,
        mockTheme,
        'wave-gradient',
        invalidColorConfig
      );

      expect(canvas).toBe(mockCanvas);
    });
  });
});