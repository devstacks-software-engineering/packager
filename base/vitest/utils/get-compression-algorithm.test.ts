import { describe, it, expect } from 'vitest';
import { getCompressionAlgorithm } from '../../src/utils.js';
import { CompressionAlgorithm } from '../../src/types.js';

describe('getCompressionAlgorithm', () => {
  it('returns correct compression algorithm for GZIP', () => {
    expect(getCompressionAlgorithm('gzip')).toBe(CompressionAlgorithm.GZIP);
    expect(getCompressionAlgorithm('GZIP')).toBe(CompressionAlgorithm.GZIP);
    expect(getCompressionAlgorithm('Gzip')).toBe(CompressionAlgorithm.GZIP);
    expect(getCompressionAlgorithm('gZiP')).toBe(CompressionAlgorithm.GZIP);
  });

  it('returns correct compression algorithm for BROTLI', () => {
    expect(getCompressionAlgorithm('brotli')).toBe(CompressionAlgorithm.BROTLI);
    expect(getCompressionAlgorithm('BROTLI')).toBe(CompressionAlgorithm.BROTLI);
    expect(getCompressionAlgorithm('Brotli')).toBe(CompressionAlgorithm.BROTLI);
    expect(getCompressionAlgorithm('BrOtLi')).toBe(CompressionAlgorithm.BROTLI);
  });

  it('returns correct compression algorithm for DEFLATE', () => {
    expect(getCompressionAlgorithm('deflate')).toBe(CompressionAlgorithm.DEFLATE);
    expect(getCompressionAlgorithm('DEFLATE')).toBe(CompressionAlgorithm.DEFLATE);
    expect(getCompressionAlgorithm('Deflate')).toBe(CompressionAlgorithm.DEFLATE);
    expect(getCompressionAlgorithm('DeFlAtE')).toBe(CompressionAlgorithm.DEFLATE);
  });

  it('throws error for invalid compression algorithm', () => {
    expect(() => getCompressionAlgorithm('invalid')).toThrow(
      'Unsupported compression algorithm: invalid'
    );
    expect(() => getCompressionAlgorithm('')).toThrow(
      'Unsupported compression algorithm: '
    );
    expect(() => getCompressionAlgorithm('zip')).toThrow(
      'Unsupported compression algorithm: zip'
    );
  });

  it('throws error for non-string inputs', () => {
    // @ts-expect-error Testing invalid input
    expect(() => getCompressionAlgorithm(123)).toThrow();
    // @ts-expect-error Testing invalid input
    expect(() => getCompressionAlgorithm(null)).toThrow();
    // @ts-expect-error Testing invalid input
    expect(() => getCompressionAlgorithm(undefined)).toThrow();
    // @ts-expect-error Testing invalid input
    expect(() => getCompressionAlgorithm({})).toThrow();
  });

  it('throws error for strings with whitespace', () => {
    // Testing current implementation behavior
    expect(() => getCompressionAlgorithm(' gzip')).toThrow();
    expect(() => getCompressionAlgorithm('brotli ')).toThrow();
    expect(() => getCompressionAlgorithm(' lzfse ')).toThrow();
  });
});