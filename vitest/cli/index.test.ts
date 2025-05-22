import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import * as commands from '../../src/cli/commands.js';

// Create stub command handlers
vi.spyOn(commands, 'handleArchive');
vi.spyOn(commands, 'handleCompress');
vi.spyOn(commands, 'handleDecompress');
vi.spyOn(commands, 'handleSign');
vi.spyOn(commands, 'handleVerify');
vi.spyOn(commands, 'handleGenerateKeys');
vi.spyOn(commands, 'handleDerivePublicKey');
vi.spyOn(commands, 'handlePackage');

// Create mock Commander objects
const mockCommand = {
  alias: vi.fn().mockReturnThis(),
  description: vi.fn().mockReturnThis(),
  argument: vi.fn().mockReturnThis(),
  option: vi.fn().mockReturnThis(),
  requiredOption: vi.fn().mockReturnThis(),
  action: vi.fn().mockReturnThis(),
};

const mockProgram = {
  name: vi.fn().mockReturnThis(),
  description: vi.fn().mockReturnThis(),
  version: vi.fn().mockReturnThis(),
  command: vi.fn().mockReturnValue(mockCommand),
  parse: vi.fn(),
  help: vi.fn(),
};

// Mock the commander module
vi.mock('commander', () => ({
  program: mockProgram,
}));

describe('CLI Index Module', () => {
  const originalArgv = process.argv;
  const originalExit = process.exit;

  beforeAll(() => {
    // The Commander module is mocked at the beginning
    process.argv = ['node', 'script.js', 'command-name'];
    // Mock process.exit with a more specific type
    process.exit = vi.fn() as unknown as (code?: number) => never;
  });

  afterAll(() => {
    process.argv = originalArgv;
    process.exit = originalExit;
  });

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  // Import the CLI module in its own scope so that we're sure the mocks are set up first
  async function importCliModule() {
    return await import('../../src/cli/index.js');
  }

  it('should initialize the CLI program', async () => {
    await importCliModule();

    expect(mockProgram.name).toHaveBeenCalledWith('packager');
    expect(mockProgram.description).toHaveBeenCalledWith(
      expect.stringContaining('Archive, compress, and sign')
    );
    expect(mockProgram.version).toHaveBeenCalled();
  });

  it('should register all CLI commands', async () => {
    await importCliModule();

    expect(mockProgram.command).toHaveBeenCalledWith('archive');
    expect(mockProgram.command).toHaveBeenCalledWith('compress');
    expect(mockProgram.command).toHaveBeenCalledWith('decompress');
    expect(mockProgram.command).toHaveBeenCalledWith('sign');
    expect(mockProgram.command).toHaveBeenCalledWith('verify');
    expect(mockProgram.command).toHaveBeenCalledWith('generate-keys');
    expect(mockProgram.command).toHaveBeenCalledWith('derive-public-key');
    expect(mockProgram.command).toHaveBeenCalledWith('package');
  });

  it('should register command aliases', async () => {
    await importCliModule();

    expect(mockCommand.alias).toHaveBeenCalledWith('a');
    expect(mockCommand.alias).toHaveBeenCalledWith('c');
    expect(mockCommand.alias).toHaveBeenCalledWith('d');
    expect(mockCommand.alias).toHaveBeenCalledWith('s');
    expect(mockCommand.alias).toHaveBeenCalledWith('v');
    expect(mockCommand.alias).toHaveBeenCalledWith('g');
    expect(mockCommand.alias).toHaveBeenCalledWith('p');
    expect(mockCommand.alias).toHaveBeenCalledWith('pkg');
  });

  it('should register command arguments', async () => {
    await importCliModule();

    // This test is a bit tricky because we're dealing with mock call data
    // Check that our mock has been called a reasonable number of times
    expect(mockCommand.argument).toHaveBeenCalled();
    expect(mockCommand.argument.mock.calls.length).toBeGreaterThan(10);

    // Let's check at least some key arguments we expect to see in commands
    expect(mockCommand.argument).toHaveBeenCalledWith('<source>', expect.any(String));
    expect(mockCommand.argument).toHaveBeenCalledWith('<file>', expect.any(String));
    expect(mockCommand.argument).toHaveBeenCalledWith('<privateKey>', expect.any(String));
    expect(mockCommand.argument).toHaveBeenCalledWith('<publicKey>', expect.any(String));

    // Check for the specific output commands
    const outputParams = mockCommand.argument.mock.calls.filter(call =>
      call[1] && call[1].includes('Output')
    );
    expect(outputParams.length).toBeGreaterThan(0);
  });

  it('should register command options', async () => {
    await importCliModule();

    expect(mockCommand.option).toHaveBeenCalledWith('-i, --include <pattern>', expect.any(String));
    expect(mockCommand.option).toHaveBeenCalledWith('-e, --exclude <pattern>', expect.any(String));
    expect(mockCommand.option).toHaveBeenCalledWith('-a, --algorithm <algorithm>', expect.stringContaining('gzip, brotli'));
    expect(mockCommand.option).toHaveBeenCalledWith('-l, --level <level>', expect.any(String));

    expect(mockCommand.requiredOption).toHaveBeenCalledWith('--privkey <path>', expect.any(String));
    expect(mockCommand.requiredOption).toHaveBeenCalledWith('--pubkey <path>', expect.any(String));
  });

  it('should link handlers to commands', async () => {
    await importCliModule();

    // Get the names of all the handler functions to check
    const handlerFunctionNames = [
      'handleArchive',
      'handleCompress',
      'handleDecompress',
      'handleSign',
      'handleVerify',
      'handleGenerateKeys',
      'handleDerivePublicKey',
      'handlePackage'
    ];

    // Get a list of the function names from the actual calls
    const calledHandlerNames = mockCommand.action.mock.calls
      .map(call => call[0]?.name)
      .filter(Boolean);

    // Check that each of our required handlers is in the list
    handlerFunctionNames.forEach(name => {
      expect(calledHandlerNames).toContain(name);
    });
  });

  it('should parse process arguments', async () => {
    await importCliModule();

    expect(mockProgram.parse).toHaveBeenCalled();
  });

  it('should show help when no arguments are provided', async () => {
    // Set process.argv to be empty for this test only
    const originalArgs = process.argv;
    process.argv = ['node', 'script.js'];

    await importCliModule();

    expect(mockProgram.help).toHaveBeenCalled();

    // Restore
    process.argv = originalArgs;
  });

  it('should not show help when arguments are provided', async () => {
    // Make sure process.argv has arguments
    const originalArgs = process.argv;
    process.argv = ['node', 'script.js', 'archive', 'src', 'dest'];

    await importCliModule();

    expect(mockProgram.help).not.toHaveBeenCalled();

    // Restore
    process.argv = originalArgs;
  });

  it('should configure compress command correctly', async () => {
    await importCliModule();

    // Test compress command configuration
    expect(mockProgram.command).toHaveBeenCalledWith('compress');
    expect(mockCommand.alias).toHaveBeenCalledWith('c');
    expect(mockCommand.description).toHaveBeenCalledWith('Compress a file or directory');
    expect(mockCommand.option).toHaveBeenCalledWith('-a, --algorithm <algorithm>', expect.stringContaining('gzip, brotli'));
    expect(mockCommand.option).toHaveBeenCalledWith('-l, --level <level>', expect.any(String));
  });

  it('should configure package command correctly', async () => {
    await importCliModule();

    // Test package command configuration
    expect(mockProgram.command).toHaveBeenCalledWith('package');
    expect(mockCommand.alias).toHaveBeenCalledWith('pkg');
    expect(mockCommand.description).toHaveBeenCalledWith('Archive, compress, and optionally sign a directory into a single file');
    expect(mockCommand.option).toHaveBeenCalledWith('-a, --algorithm <algorithm>', expect.stringContaining('gzip, brotli'));
    expect(mockCommand.option).toHaveBeenCalledWith('--privkey <path>', expect.any(String));
  });
});
