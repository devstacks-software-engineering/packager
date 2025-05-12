import { describe, it, expect } from 'vitest';
import { formatFileSize } from '../../src/utils.js';

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0.00 B');
    expect(formatFileSize(512)).toBe('512.00 B');
    expect(formatFileSize(1023)).toBe('1023.00 B');
  });

  it('formats kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.00 KB');
    expect(formatFileSize(1536)).toBe('1.50 KB');
    expect(formatFileSize(10240)).toBe('10.00 KB');
    expect(formatFileSize(1024 * 1023)).toBe('1023.00 KB');
  });

  it('formats megabytes correctly', () => {
    expect(formatFileSize(1048576)).toBe('1.00 MB');
    expect(formatFileSize(2097152)).toBe('2.00 MB');
    expect(formatFileSize(1048576 * 1.5)).toBe('1.50 MB');
    expect(formatFileSize(1048576 * 1023)).toBe('1023.00 MB');
  });

  it('formats gigabytes correctly', () => {
    expect(formatFileSize(1073741824)).toBe('1.00 GB');
    expect(formatFileSize(1610612736)).toBe('1.50 GB');
    expect(formatFileSize(1073741824 * 10)).toBe('10.00 GB');
    expect(formatFileSize(1073741824 * 1023)).toBe('1023.00 GB');
  });

  it('formats terabytes correctly', () => {
    expect(formatFileSize(1099511627776)).toBe('1.00 TB');
    expect(formatFileSize(2199023255552)).toBe('2.00 TB');
    expect(formatFileSize(1099511627776 * 1.5)).toBe('1.50 TB');
    expect(formatFileSize(1099511627776 * 100)).toBe('100.00 TB');
  });

  it('formats very large sizes correctly', () => {
    // Larger than the largest unit (TB) - should still use TB
    expect(formatFileSize(1099511627776 * 1024)).toBe('1024.00 TB');
    expect(formatFileSize(1099511627776 * 9999)).toBe('9999.00 TB');
  });

  it('formats decimal values correctly', () => {
    expect(formatFileSize(1.5)).toBe('1.50 B');
    expect(formatFileSize(1024 * 3.25)).toBe('3.25 KB');
    expect(formatFileSize(1048576 * 4.75)).toBe('4.75 MB');
  });

  it('handles negative values', () => {
    // Testing current implementation behavior
    expect(formatFileSize(-1024)).toBe('-1024.00 B');
    expect(formatFileSize(-2 * 1048576)).toBe('-2097152.00 B');
  });
});