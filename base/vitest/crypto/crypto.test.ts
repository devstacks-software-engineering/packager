import { describe, it, expect } from 'vitest';
import {
  generateKeyPair,
  derivePublicKey,
  signData,
  verifyData
} from '../../src/crypto.js';

describe('Crypto Module', () => {
  describe('generateKeyPair', () => {
    it('should generate valid key pair', () => {
      const { publicKey, privateKey } = generateKeyPair();

      // Ed25519 key sizes are fixed
      expect(publicKey.length).toBe(32); // 32 bytes (256 bits)
      expect(privateKey.length).toBe(64); // 64 bytes (512 bits)

      // Keys should be different
      expect(Buffer.compare(publicKey, privateKey)).not.toBe(0);
    });

    it('should generate unique key pairs on multiple calls', () => {
      const pair1 = generateKeyPair();
      const pair2 = generateKeyPair();

      // Different key pairs should generate different keys
      expect(Buffer.compare(pair1.publicKey, pair2.publicKey)).not.toBe(0);
      expect(Buffer.compare(pair1.privateKey, pair2.privateKey)).not.toBe(0);
    });

    it('should generate keys that match Ed25519 specifications', () => {
      // Generate multiple key pairs to ensure consistency
      for (let i = 0; i < 5; i++) {
        const { publicKey, privateKey } = generateKeyPair();

        // Ed25519 key sizes are fixed
        expect(publicKey.length).toBe(32); // 32 bytes (256 bits)
        expect(privateKey.length).toBe(64); // 64 bytes (512 bits)

        // privateKey should contain the publicKey in Ed25519
        const derivedPublic = derivePublicKey(privateKey);
        expect(Buffer.compare(derivedPublic, publicKey)).toBe(0);
      }
    });
  });

  describe('derivePublicKey', () => {
    it('should derive correct public key from private key', () => {
      const { publicKey, privateKey } = generateKeyPair();

      const derivedPublicKey = derivePublicKey(privateKey);

      // Derived public key should match the original public key
      expect(Buffer.compare(derivedPublicKey, publicKey)).toBe(0);
    });

    it('should consistently derive the same public key', () => {
      const { publicKey, privateKey } = generateKeyPair();

      // Derive multiple times and compare
      const derived1 = derivePublicKey(privateKey);
      const derived2 = derivePublicKey(privateKey);
      const derived3 = derivePublicKey(privateKey);

      expect(Buffer.compare(derived1, derived2)).toBe(0);
      expect(Buffer.compare(derived2, derived3)).toBe(0);
      expect(Buffer.compare(derived1, publicKey)).toBe(0);
    });

    it('should throw error for invalid private key', () => {
      // Too short
      const tooShort = Buffer.alloc(32);
      expect(() => derivePublicKey(tooShort)).toThrow();

      // Non-buffer
      // @ts-expect-error Testing invalid input
      expect(() => derivePublicKey('not a buffer')).toThrow();

      // Note: tweetnacl is actually quite forgiving with key content
      // and doesn't throw for all-255 values, so we're not testing that case
    });
  });

  describe('signData and verifyData', () => {
    it('should sign and verify data correctly', async () => {
      const testData = Buffer.from('This is some test data for signing');
      const { publicKey, privateKey } = generateKeyPair();

      // Sign data
      const signature = await signData(testData, { privateKey });

      // Signature should be 64 bytes for Ed25519
      expect(signature.length).toBe(64);

      // Verify with correct public key
      const isValid = await verifyData(testData, signature, { publicKey });
      expect(isValid).toBe(true);
    });

    it('should detect tampered data', async () => {
      const testData = Buffer.from('This is some test data for signing');
      const { publicKey, privateKey } = generateKeyPair();

      // Sign data
      const signature = await signData(testData, { privateKey });

      // Verify with incorrect data should fail
      const tampered = Buffer.from('This is tampered data');
      const isInvalidData = await verifyData(tampered, signature, { publicKey });
      expect(isInvalidData).toBe(false);
    });

    it('should detect invalid signatures', async () => {
      const testData = Buffer.from('This is some test data for signing');
      const { publicKey, privateKey } = generateKeyPair();

      // Sign data
      const signature = await signData(testData, { privateKey });

      // Modify signature
      const invalidSignature = Buffer.alloc(64);
      signature.copy(invalidSignature);
      invalidSignature[0] = invalidSignature[0] ^ 0xFF; // Flip some bits

      // Verify with tampered signature should fail
      const isInvalidSignature = await verifyData(testData, invalidSignature, { publicKey });
      expect(isInvalidSignature).toBe(false);
    });

    it('should fail verification with wrong key', async () => {
      const testData = Buffer.from('This is some test data for signing');
      const { privateKey } = generateKeyPair();
      const { publicKey: wrongPublicKey } = generateKeyPair();

      // Sign data
      const signature = await signData(testData, { privateKey });

      // Verify with incorrect key should fail
      const isInvalidKey = await verifyData(testData, signature, { publicKey: wrongPublicKey });
      expect(isInvalidKey).toBe(false);
    });

    it('should throw error if private key is not provided', async () => {
      const testData = Buffer.from('Some test data');

      await expect(signData(testData, {})).rejects.toThrow(
        'Private key or path to private key file is required'
      );
    });

    it('should throw error if public key is not provided', async () => {
      const testData = Buffer.from('Some test data');
      const signature = Buffer.alloc(64);

      await expect(verifyData(testData, signature, {})).rejects.toThrow(
        'Public key or path to public key file is required'
      );
    });

    it('should handle empty data', async () => {
      const emptyData = Buffer.alloc(0);
      const { publicKey, privateKey } = generateKeyPair();

      // Sign empty data
      const signature = await signData(emptyData, { privateKey });

      // Should still produce valid 64-byte signature
      expect(signature.length).toBe(64);

      // Should verify correctly
      const isValid = await verifyData(emptyData, signature, { publicKey });
      expect(isValid).toBe(true);
    });

    it('should handle large data', async () => {
      // Create 1MB data
      const largeData = Buffer.alloc(1024 * 1024);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = Math.floor(Math.random() * 256);
      }

      const { publicKey, privateKey } = generateKeyPair();

      // Sign large data
      const signature = await signData(largeData, { privateKey });

      // Verify large data
      const isValid = await verifyData(largeData, signature, { publicKey });
      expect(isValid).toBe(true);
    });
  });
});