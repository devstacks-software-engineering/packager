import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMocks, mockSpinner } from './common.test.js';

// Setup mocks before importing modules
setupMocks();

// Import modules after mocks are configured
import {
  handleSign,
  handleVerify,
  handleGenerateKeys,
  handleDerivePublicKey
} from '../../../src/cli/commands.js';
import * as utils from '../../../src/cli/utils.js';
import * as core from '../../../src/index.js';
import * as fs from 'node:fs';

describe('Crypto Commands', () => {
  // Reset mocks before each test to ensure clean state
  beforeEach(() => {
    vi.resetAllMocks();
    // Default mock implementations for fs functions used in handlers
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ isDirectory: () => false } as any);
  });

  describe('handleSign', () => {
    it('should sign a file with a private key', async () => {
      // Arrange
      const sourcePath = '/source/path.txt';
      const outputPath = '/output/path.sig';
      const options = {
        privkey: '/path/to/private.key'
      };

      // Act
      await handleSign(sourcePath, outputPath, options);

      // Assert
      expect(utils.validatePath).toHaveBeenCalledWith(sourcePath, 'file');
      expect(utils.validatePath).toHaveBeenCalledWith('/path/to/private.key', 'file');
      expect(core.signFile).toHaveBeenCalledWith(
        sourcePath,
        outputPath,
        { privateKeyPath: '/path/to/private.key' }
      );
    });

    it('should handle signature creation failures', async () => {
      // Arrange
      const sourcePath = '/source/path.txt';
      const outputPath = '/output/path.sig';
      const options = {
        privkey: '/path/to/private.key'
      };
      const testError = new Error('Signature creation failed');

      // Mock signFile to throw an error
      vi.mocked(core.signFile).mockRejectedValueOnce(testError);

      // Act
      await handleSign(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to create signature: Signature creation failed');
    });

    it('should handle unknown signature creation errors', async () => {
      // Arrange
      const sourcePath = '/source/path.txt';
      const outputPath = '/output/path.sig';
      const options = {
        privkey: '/path/to/private.key'
      };

      // Mock signFile to throw a non-Error object
      vi.mocked(core.signFile).mockRejectedValueOnce('Not an error object');

      // Act
      await handleSign(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to create signature: Unknown error');
    });

    it('should handle sign validation failures', async () => {
      // Arrange
      const sourcePath = '';  // Empty path should fail validation
      const outputPath = '/output/path.sig';
      const options = {
        privkey: '/path/to/private.key'
      };

      // Act
      await handleSign(sourcePath, outputPath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith(expect.stringContaining('Validation error'));
      expect(core.signFile).not.toHaveBeenCalled();
    });

    it('should handle privkey path validation failures', async () => {
      // Arrange
      const sourcePath = '/source/path.txt';
      const outputPath = '/output/path.sig';
      const options = {
        privkey: '/path/to/private.key'
      };

      // First validatePath call passes for sourcePath
      vi.mocked(utils.validatePath)
        .mockReturnValueOnce(true)
        // Second validatePath fails for privkey path
        .mockReturnValueOnce(false);

      // Act
      await handleSign(sourcePath, outputPath, options);

      expect(core.signFile).not.toHaveBeenCalled();
    });
  });

  describe('handleVerify', () => {
    it('should verify a file signature with a public key', async () => {
      // Arrange
      const filePath = '/path/to/file.txt';
      const signaturePath = '/path/to/file.sig';
      const options = {
        pubkey: '/path/to/public.key'
      };

      // Mock verifyFile to return true
      vi.mocked(core.verifyFile).mockResolvedValueOnce(true);

      // Act
      await handleVerify(filePath, signaturePath, options);

      // Assert
      expect(utils.validatePath).toHaveBeenCalledWith(filePath, 'file');
      expect(utils.validatePath).toHaveBeenCalledWith(signaturePath, 'file');
      expect(utils.validatePath).toHaveBeenCalledWith('/path/to/public.key', 'file');
      expect(core.verifyFile).toHaveBeenCalledWith(
        filePath,
        signaturePath,
        { publicKeyPath: '/path/to/public.key' }
      );
    });

    it('should handle invalid signature verification', async () => {
      // Arrange
      const filePath = '/path/to/file.txt';
      const signaturePath = '/path/to/file.sig';
      const options = {
        pubkey: '/path/to/public.key'
      };

      // Mock verifyFile to return false (invalid signature)
      vi.mocked(core.verifyFile).mockResolvedValueOnce(false);

      // Act
      await handleVerify(filePath, signaturePath, options);

      // Assert
      expect(mockSpinner.fail).toHaveBeenCalledWith('Signature is invalid');
    });

    it('should handle verification failures', async () => {
      // Arrange
      const filePath = '/path/to/file.txt';
      const signaturePath = '/path/to/file.sig';
      const options = {
        pubkey: '/path/to/public.key'
      };
      const testError = new Error('Verification failed');

      // Mock verifyFile to throw an error
      vi.mocked(core.verifyFile).mockRejectedValueOnce(testError);

      // Act
      await handleVerify(filePath, signaturePath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to verify signature: Verification failed');
    });

    it('should handle unknown verification errors', async () => {
      // Arrange
      const filePath = '/path/to/file.txt';
      const signaturePath = '/path/to/file.sig';
      const options = {
        pubkey: '/path/to/public.key'
      };

      // Mock verifyFile to throw a non-Error object
      vi.mocked(core.verifyFile).mockRejectedValueOnce('Not an error object');

      // Act
      await handleVerify(filePath, signaturePath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to verify signature: Unknown error');
    });

    it('should handle path validation failures in verify', async () => {
      // Arrange
      const filePath = '/path/to/file.txt';
      const signaturePath = '/path/to/file.sig';
      const options = {
        pubkey: '/path/to/public.key'
      };

      // First validatePath call fails for filePath
      vi.mocked(utils.validatePath).mockReturnValueOnce(false);

      // Act
      await handleVerify(filePath, signaturePath, options);

      // Assert
      expect(core.verifyFile).not.toHaveBeenCalled();
    });

    it('should handle signature path validation failures in verify', async () => {
      // Arrange
      const filePath = '/path/to/file.txt';
      const signaturePath = '/path/to/file.sig';
      const options = {
        pubkey: '/path/to/public.key'
      };

      // First validatePath call passes for filePath
      vi.mocked(utils.validatePath)
        .mockReturnValueOnce(true)
        // Second validatePath fails for signaturePath
        .mockReturnValueOnce(false);

      // Act
      await handleVerify(filePath, signaturePath, options);

      // Assert
      expect(core.verifyFile).not.toHaveBeenCalled();
    });

    it('should handle pubkey path validation failures in verify', async () => {
      // Arrange
      const filePath = '/path/to/file.txt';
      const signaturePath = '/path/to/file.sig';
      const options = {
        pubkey: '/path/to/public.key'
      };

      // First and second validatePath calls pass
      vi.mocked(utils.validatePath)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        // Third validatePath fails for pubkey path
        .mockReturnValueOnce(false);

      // Act
      await handleVerify(filePath, signaturePath, options);

      // Assert
      expect(core.verifyFile).not.toHaveBeenCalled();
    });

    it('should handle verify validation failures', async () => {
      // Arrange
      const filePath = '';  // Empty path should fail validation
      const signaturePath = '/path/to/file.sig';
      const options = {
        pubkey: '/path/to/public.key'
      };

      // Act
      await handleVerify(filePath, signaturePath, options);

      // Assert
      expect(utils.error).toHaveBeenCalledWith(expect.stringContaining('Validation error'));
      expect(core.verifyFile).not.toHaveBeenCalled();
    });
  });

  describe('handleGenerateKeys', () => {
    it('should generate a new key pair', async () => {
      // Arrange
      const privateKeyPath = '/path/to/private.key';
      const publicKeyPath = '/path/to/public.key';

      // Act
      await handleGenerateKeys(privateKeyPath, publicKeyPath);

      // Assert
      expect(core.generateAndSaveKeyPair).toHaveBeenCalledWith({
        privateKeyPath,
        publicKeyPath
      });
      expect(utils.warning).toHaveBeenCalledWith(expect.stringContaining('Keep your private key secure'));
    });

    it('should handle key generation failures', async () => {
      // Arrange
      const privateKeyPath = '/path/to/private.key';
      const publicKeyPath = '/path/to/public.key';
      const testError = new Error('Failed to generate key pair');

      // Mock generateAndSaveKeyPair to throw an error
      vi.mocked(core.generateAndSaveKeyPair).mockRejectedValueOnce(testError);

      // Act
      await handleGenerateKeys(privateKeyPath, publicKeyPath);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to generate key pair: Failed to generate key pair');
    });

    it('should handle unknown key generation errors', async () => {
      // Arrange
      const privateKeyPath = '/path/to/private.key';
      const publicKeyPath = '/path/to/public.key';

      // Mock generateAndSaveKeyPair to throw a non-Error object
      vi.mocked(core.generateAndSaveKeyPair).mockRejectedValueOnce('Not an error object');

      // Act
      await handleGenerateKeys(privateKeyPath, publicKeyPath);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to generate key pair: Unknown error');
    });

    it('should handle key generation validation failures', async () => {
      // Arrange
      const privateKeyPath = '';  // Empty path should fail validation
      const publicKeyPath = '/path/to/public.key';

      // Act
      await handleGenerateKeys(privateKeyPath, publicKeyPath);

      // Assert
      expect(utils.error).toHaveBeenCalledWith(expect.stringContaining('Validation error'));
      expect(core.generateAndSaveKeyPair).not.toHaveBeenCalled();
    });
  });

  describe('handleDerivePublicKey', () => {
    it('should derive a public key from private key', async () => {
      // Arrange
      const privateKeyPath = '/path/to/private.key';
      const publicKeyPath = '/path/to/public.key';

      // Act
      await handleDerivePublicKey(privateKeyPath, publicKeyPath);

      // Assert
      expect(utils.validatePath).toHaveBeenCalledWith(privateKeyPath, 'file');
      expect(core.deriveAndSavePublicKey).toHaveBeenCalledWith(privateKeyPath, publicKeyPath);
    });

    it('should handle key derivation failures', async () => {
      // Arrange
      const privateKeyPath = '/path/to/private.key';
      const publicKeyPath = '/path/to/public.key';
      const testError = new Error('Failed to derive public key');

      // Mock deriveAndSavePublicKey to throw an error
      vi.mocked(core.deriveAndSavePublicKey).mockRejectedValueOnce(testError);

      // Act
      await handleDerivePublicKey(privateKeyPath, publicKeyPath);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to derive public key: Failed to derive public key');
    });

    it('should handle unknown key derivation errors', async () => {
      // Arrange
      const privateKeyPath = '/path/to/private.key';
      const publicKeyPath = '/path/to/public.key';

      // Mock deriveAndSavePublicKey to throw a non-Error object
      vi.mocked(core.deriveAndSavePublicKey).mockRejectedValueOnce('Not an error object');

      // Act
      await handleDerivePublicKey(privateKeyPath, publicKeyPath);

      // Assert
      expect(utils.error).toHaveBeenCalledWith('Failed to derive public key: Unknown error');
    });

    it('should handle private key path validation failures in derive public key', async () => {
      // Arrange
      const privateKeyPath = '/path/to/private.key';
      const publicKeyPath = '/path/to/public.key';

      // Mock validatePath to fail
      vi.mocked(utils.validatePath).mockReturnValueOnce(false);

      // Act
      await handleDerivePublicKey(privateKeyPath, publicKeyPath);

      // Assert
      expect(core.deriveAndSavePublicKey).not.toHaveBeenCalled();
    });

    it('should handle key derivation validation failures', async () => {
      // Arrange
      const privateKeyPath = '';  // Empty path should fail validation
      const publicKeyPath = '/path/to/public.key';

      // Act
      await handleDerivePublicKey(privateKeyPath, publicKeyPath);

      // Assert
      expect(utils.error).toHaveBeenCalledWith(expect.stringContaining('Validation error'));
      expect(core.deriveAndSavePublicKey).not.toHaveBeenCalled();
    });
  });
});