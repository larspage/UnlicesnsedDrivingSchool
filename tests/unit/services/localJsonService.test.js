process.env.DATA_DIR = './data'; // Set default before requiring module
const localJsonService = require('../../../server/services/localJsonService');

// Mock fs and path modules
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn()
  }
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/'))
}));

const fs = require('fs');
const path = require('path');

describe('Local JSON Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.DATA_DIR = './data';
  });

  describe('ensureDataDirectory', () => {
    it('should not create directory if it already exists', async () => {
      fs.promises.access.mockResolvedValue();

      await localJsonService.ensureDataDirectory();

      expect(fs.promises.access).toHaveBeenCalledWith('./data');
      expect(fs.promises.mkdir).not.toHaveBeenCalled();
    });

    it('should create directory if it does not exist', async () => {
      fs.promises.access.mockRejectedValue(new Error('Directory not found'));
      fs.promises.mkdir.mockResolvedValue();

      await localJsonService.ensureDataDirectory();

      expect(fs.promises.access).toHaveBeenCalledWith('./data');
      expect(fs.promises.mkdir).toHaveBeenCalledWith('./data', { recursive: true });
    });

    it('should throw error if mkdir fails', async () => {
      fs.promises.access.mockRejectedValue(new Error('Directory not found'));
      fs.promises.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(localJsonService.ensureDataDirectory()).rejects.toThrow('Permission denied');
    });
  });

  describe('readJsonFile', () => {
    beforeEach(() => {
      fs.promises.access.mockResolvedValue();
      fs.promises.mkdir.mockResolvedValue();
    });

    it('should read and parse valid JSON file', async () => {
      const mockData = [{ id: '1', name: 'test' }];
      fs.promises.readFile.mockResolvedValue(JSON.stringify(mockData));

      const result = await localJsonService.readJsonFile('test');

      expect(result).toEqual(mockData);
      expect(fs.promises.readFile).toHaveBeenCalledWith('./data/test.json', 'utf8');
    });

    it('should return empty array for non-existent file', async () => {
      fs.promises.readFile.mockRejectedValue({ code: 'ENOENT' });

      const result = await localJsonService.readJsonFile('nonexistent');

      expect(result).toEqual([]);
    });

    it('should return empty array for empty file', async () => {
      fs.promises.readFile.mockResolvedValue('');

      const result = await localJsonService.readJsonFile('empty');

      expect(result).toEqual([]);
    });

    it('should return empty array for whitespace-only file', async () => {
      fs.promises.readFile.mockResolvedValue('   \n\t   ');

      const result = await localJsonService.readJsonFile('whitespace');

      expect(result).toEqual([]);
    });

    it('should handle JSON parse errors gracefully', async () => {
      fs.promises.readFile.mockResolvedValue('invalid json {');

      const result = await localJsonService.readJsonFile('corrupted');

      expect(result).toEqual([]);
    });

    it('should retry on read errors and eventually succeed', async () => {
      fs.promises.readFile
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce(JSON.stringify([{ id: '1' }]));

      const result = await localJsonService.readJsonFile('retry');

      expect(result).toEqual([{ id: '1' }]);
      expect(fs.promises.readFile).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      fs.promises.readFile.mockRejectedValue(new Error('Persistent error'));

      await expect(localJsonService.readJsonFile('failing')).rejects.toThrow(
        'Failed to read JSON file failing after 3 attempts'
      );
    });

    it('should handle undefined or null data', async () => {
      fs.promises.readFile.mockResolvedValue(undefined);

      const result = await localJsonService.readJsonFile('undefined');

      expect(result).toEqual([]);
    });
  });

  describe('writeJsonFile', () => {
    beforeEach(() => {
      fs.promises.access.mockResolvedValue();
      fs.promises.mkdir.mockResolvedValue();
      fs.promises.writeFile.mockResolvedValue();
      fs.promises.rename.mockResolvedValue();
    });

    it('should write data to JSON file atomically', async () => {
      const data = [{ id: '1', name: 'test' }];

      await localJsonService.writeJsonFile('test', data);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        './data/test.json.tmp',
        JSON.stringify(data, null, 2),
        'utf8'
      );
      expect(fs.promises.rename).toHaveBeenCalledWith('./data/test.json.tmp', './data/test.json');
    });

    it('should handle Windows file locking with retries', async () => {
      // Simulate Windows file locking
      Object.defineProperty(process, 'platform', { value: 'win32' });
      fs.promises.unlink.mockResolvedValue();
      fs.promises.rename
        .mockRejectedValueOnce({ code: 'EPERM' })
        .mockResolvedValueOnce();

      const data = [{ id: '1' }];

      await localJsonService.writeJsonFile('test', data);

      expect(fs.promises.unlink).toHaveBeenCalledWith('./data/test.json');
      expect(fs.promises.rename).toHaveBeenCalledTimes(2);
    });

    it('should clean up temp file on error', async () => {
      fs.promises.writeFile.mockRejectedValue(new Error('Write failed'));
      fs.promises.unlink.mockResolvedValue();

      await expect(localJsonService.writeJsonFile('test', [{ id: '1' }]))
        .rejects.toThrow('Failed to write JSON file test');

      expect(fs.promises.unlink).toHaveBeenCalledWith('./data/test.json.tmp');
    });

    it('should throw error after max retries on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      fs.promises.rename.mockRejectedValue({ code: 'EPERM' });

      await expect(localJsonService.writeJsonFile('test', [{ id: '1' }]))
        .rejects.toThrow('Failed to write JSON file test');
    });
  });

  describe('CRUD Operations', () => {
    beforeEach(() => {
      fs.promises.access.mockResolvedValue();
      fs.promises.mkdir.mockResolvedValue();
      fs.promises.readFile.mockResolvedValue('[]');
      fs.promises.writeFile.mockResolvedValue();
      fs.promises.rename.mockResolvedValue();
    });

    describe('getAllRows', () => {
      it('should get all rows from JSON file', async () => {
        const mockData = [{ id: '1', name: 'test' }];
        fs.promises.readFile.mockResolvedValue(JSON.stringify(mockData));

        const result = await localJsonService.getAllRows('spreadsheet1', 'sheet1');

        expect(result).toEqual(mockData);
      });

      it('should ignore spreadsheetId parameter', async () => {
        const mockData = [{ id: '1' }];
        fs.promises.readFile.mockResolvedValue(JSON.stringify(mockData));

        await localJsonService.getAllRows('ignored-id', 'sheet1');

        expect(fs.promises.readFile).toHaveBeenCalledWith('./data/sheet1.json', 'utf8');
      });
    });

    describe('appendRow', () => {
      it('should append row to existing data', async () => {
        const existingData = [{ id: '1', name: 'existing' }];
        const newRow = { id: '2', name: 'new' };

        fs.promises.readFile.mockResolvedValue(JSON.stringify(existingData));

        const result = await localJsonService.appendRow('spreadsheet1', 'sheet1', newRow);

        expect(result).toEqual(newRow);
        expect(fs.promises.writeFile).toHaveBeenCalledWith(
          './data/sheet1.json.tmp',
          JSON.stringify([...existingData, newRow], null, 2),
          'utf8'
        );
      });

      it('should append to empty file', async () => {
        fs.promises.readFile.mockResolvedValue('[]');
        const newRow = { id: '1', name: 'first' };

        const result = await localJsonService.appendRow('spreadsheet1', 'sheet1', newRow);

        expect(result).toEqual(newRow);
        expect(fs.promises.writeFile).toHaveBeenCalledWith(
          './data/sheet1.json.tmp',
          JSON.stringify([newRow], null, 2),
          'utf8'
        );
      });
    });

    describe('updateRow', () => {
      it('should update existing row', async () => {
        const existingData = [
          { id: '1', name: 'original', status: 'active' },
          { id: '2', name: 'other', status: 'active' }
        ];
        const updateData = { name: 'updated', status: 'inactive' };

        fs.promises.readFile.mockResolvedValue(JSON.stringify(existingData));

        const result = await localJsonService.updateRow('spreadsheet1', 'sheet1', '1', updateData);

        expect(result).toEqual({
          id: '1',
          name: 'updated',
          status: 'inactive'
        });
      });

      it('should throw error for non-existent row', async () => {
        fs.promises.readFile.mockResolvedValue(JSON.stringify([{ id: '1' }]));

        await expect(localJsonService.updateRow('spreadsheet1', 'sheet1', '999', {}))
          .rejects.toThrow('Row with ID 999 not found in sheet1');
      });
    });

    describe('deleteRow', () => {
      it('should delete existing row and return true', async () => {
        const existingData = [
          { id: '1', name: 'first' },
          { id: '2', name: 'second' },
          { id: '3', name: 'third' }
        ];

        fs.promises.readFile.mockResolvedValue(JSON.stringify(existingData));

        const result = await localJsonService.deleteRow('spreadsheet1', 'sheet1', '2');

        expect(result).toBe(true);
        expect(fs.promises.writeFile).toHaveBeenCalledWith(
          './data/sheet1.json.tmp',
          JSON.stringify([
            { id: '1', name: 'first' },
            { id: '3', name: 'third' }
          ], null, 2),
          'utf8'
        );
      });

      it('should return false for non-existent row', async () => {
        const existingData = [{ id: '1', name: 'first' }];
        fs.promises.readFile.mockResolvedValue(JSON.stringify(existingData));

        const result = await localJsonService.deleteRow('spreadsheet1', 'sheet1', '999');

        expect(result).toBe(false);
        expect(fs.promises.writeFile).not.toHaveBeenCalled();
      });
    });

    describe('findRowById', () => {
      it('should find row by ID', async () => {
        const existingData = [
          { id: '1', name: 'first' },
          { id: '2', name: 'second' }
        ];
        fs.promises.readFile.mockResolvedValue(JSON.stringify(existingData));

        const result = await localJsonService.findRowById('spreadsheet1', 'sheet1', '2');

        expect(result).toEqual({ id: '2', name: 'second' });
      });

      it('should return null for non-existent row', async () => {
        fs.promises.readFile.mockResolvedValue(JSON.stringify([{ id: '1' }]));

        const result = await localJsonService.findRowById('spreadsheet1', 'sheet1', '999');

        expect(result).toBeNull();
      });
    });

    describe('getRowsByFilter', () => {
      it('should filter rows using provided function', async () => {
        const existingData = [
          { id: '1', status: 'active', priority: 'high' },
          { id: '2', status: 'inactive', priority: 'low' },
          { id: '3', status: 'active', priority: 'medium' }
        ];
        fs.promises.readFile.mockResolvedValue(JSON.stringify(existingData));

        const result = await localJsonService.getRowsByFilter(
          'spreadsheet1',
          'sheet1',
          (row) => row.status === 'active'
        );

        expect(result).toEqual([
          { id: '1', status: 'active', priority: 'high' },
          { id: '3', status: 'active', priority: 'medium' }
        ]);
      });

      it('should return empty array when no rows match filter', async () => {
        const existingData = [{ id: '1', status: 'inactive' }];
        fs.promises.readFile.mockResolvedValue(JSON.stringify(existingData));

        const result = await localJsonService.getRowsByFilter(
          'spreadsheet1',
          'sheet1',
          (row) => row.status === 'active'
        );

        expect(result).toEqual([]);
      });
    });
  });

  describe('ensureSheetExists', () => {
    it('should not create file if it already exists', async () => {
      fs.promises.access.mockResolvedValue();

      await localJsonService.ensureSheetExists('spreadsheet1', 'existingSheet');

      expect(fs.promises.writeFile).not.toHaveBeenCalled();
    });

    it('should create empty JSON file if it does not exist', async () => {
      fs.promises.access.mockRejectedValue(new Error('File not found'));
      fs.promises.writeFile.mockResolvedValue();
      fs.promises.rename.mockResolvedValue();

      await localJsonService.ensureSheetExists('spreadsheet1', 'newSheet');

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        './data/newSheet.json.tmp',
        JSON.stringify([], null, 2),
        'utf8'
      );
      expect(fs.promises.rename).toHaveBeenCalledWith('./data/newSheet.json.tmp', './data/newSheet.json');
    });
  });

  describe('Environment configuration', () => {
    it('should use custom DATA_DIR from environment', async () => {
      process.env.DATA_DIR = '/custom/data';

      fs.promises.access.mockResolvedValue();

      await localJsonService.ensureDataDirectory();

      expect(fs.promises.access).toHaveBeenCalledWith('/custom/data');
    });
  });

  describe('Error handling', () => {
    it('should handle read errors gracefully', async () => {
      fs.promises.readFile.mockRejectedValue(new Error('Read error'));

      await expect(localJsonService.readJsonFile('error')).rejects.toThrow(
        'Failed to read JSON file error after 3 attempts'
      );
    });

    it('should handle write errors', async () => {
      fs.promises.writeFile.mockRejectedValue(new Error('Write error'));

      await expect(localJsonService.writeJsonFile('error', [])).rejects.toThrow(
        'Failed to write JSON file error'
      );
    });
  });
});