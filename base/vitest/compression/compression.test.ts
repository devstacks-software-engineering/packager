import { describe, it, expect } from 'vitest';
import { compressData, decompressData } from '../../src/compression.js';
import { CompressionAlgorithm } from '../../src/types.js';

describe('Compression Module', () => {
  // Create a larger test string that will actually benefit from compression
  const testData = Buffer.from('This is some test data for compression. '.repeat(20));

  describe('compressData and decompressData', () => {
    it.each([
      [CompressionAlgorithm.GZIP, undefined],
      [CompressionAlgorithm.GZIP, 1],
      [CompressionAlgorithm.GZIP, 9],
      [CompressionAlgorithm.BROTLI, undefined],
      [CompressionAlgorithm.BROTLI, 1],
      [CompressionAlgorithm.BROTLI, 9],
      [CompressionAlgorithm.DEFLATE, undefined],
      [CompressionAlgorithm.DEFLATE, 1],
      [CompressionAlgorithm.DEFLATE, 9],
    ])('should compress and decompress correctly with %s algorithm and level %s', async (algorithm, level) => {
      // Compress data
      const compressed = await compressData(testData, { algorithm, level });

      // Verify data is compressed (should be smaller than original for test data)
      expect(compressed.length).toBeLessThan(testData.length);

      // Check GZIP signature (if applicable)
      if (algorithm === CompressionAlgorithm.GZIP) {
        expect(compressed[0]).toBe(0x1F);
        expect(compressed[1]).toBe(0x8B);
      }

      // Decompress data with explicit algorithm
      const decompressed = await decompressData(compressed, algorithm);

      // Verify the decompressed data matches the original
      expect(Buffer.compare(decompressed, testData)).toBe(0);
    });

    it('should handle empty buffer correctly', async () => {
      const emptyData = Buffer.alloc(0);

      // Compress empty data
      const compressed = await compressData(emptyData, { algorithm: CompressionAlgorithm.GZIP });

      // Verify GZIP signature
      expect(compressed[0]).toBe(0x1F);
      expect(compressed[1]).toBe(0x8B);

      // Decompress and verify
      const decompressed = await decompressData(compressed, CompressionAlgorithm.GZIP);
      expect(decompressed.length).toBe(0);
    });

    it('should throw error for undetectable compression format', async () => {
      const invalidData = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      await expect(decompressData(invalidData)).rejects.toThrow('Decompression failed');
    });

    it('should throw error for unsupported compression algorithm', async () => {
      await expect(
        compressData(testData, { algorithm: 'invalid' as unknown as CompressionAlgorithm })
      ).rejects.toThrow('Unsupported compression algorithm: invalid');
    });

    it('should support auto-detection of GZIP compression format', async () => {
      // Compress with GZIP
      const compressed = await compressData(testData, { algorithm: CompressionAlgorithm.GZIP });

      // Decompress without specifying algorithm
      const decompressed = await decompressData(compressed);

      // Verify the decompressed data matches the original
      expect(Buffer.compare(decompressed, testData)).toBe(0);
    });

    it('should handle large data correctly', async () => {
      // Create a larger test data (1MB of random data)
      const largeData = Buffer.alloc(1024 * 1024);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = Math.floor(Math.random() * 256);
      }

      // Compress and decompress
      const compressed = await compressData(largeData, { algorithm: CompressionAlgorithm.GZIP });
      const decompressed = await decompressData(compressed);

      // Verify
      expect(Buffer.compare(decompressed, largeData)).toBe(0);
    });

    it('should handle binary data correctly', async () => {
      // Create binary data with all possible byte values
      const binaryData = Buffer.alloc(256);
      for (let i = 0; i < 256; i++) {
        binaryData[i] = i;
      }

      // Compress and decompress
      const compressed = await compressData(binaryData, { algorithm: CompressionAlgorithm.BROTLI });
      const decompressed = await decompressData(compressed);

      // Verify
      expect(Buffer.compare(decompressed, binaryData)).toBe(0);
    });
  });
});