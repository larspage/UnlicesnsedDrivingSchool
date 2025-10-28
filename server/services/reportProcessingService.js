/**
 * Report Processing Service
 * 
 * Monitors the data/queue directory for new report JSON files and processes them.
 * This service ensures that only one process handles report processing at a time,
 * preventing file contention and race conditions.
 */

const fs = require('fs').promises;
const path = require('path');
const { watch } = require('fs');
const reportService = require('./reportService');
const localJsonService = require('./localJsonService');

class ReportProcessingService {
  constructor() {
    this.queueDir = path.join(process.cwd(), 'data', 'queue');
    this.processingDir = path.join(process.cwd(), 'data', 'processing');
    this.completedDir = path.join(process.cwd(), 'data', 'completed');
    this.failedDir = path.join(process.cwd(), 'data', 'failed');
    this.isProcessing = false;
    this.watcher = null;
    this.processQueue = [];
  }

  /**
   * Initialize the report processing service
   * Creates necessary directories and starts watching the queue
   */
  async initialize() {
    try {
      console.log('[REPORT PROCESSING] Initializing report processing service...');
      
      // Create necessary directories
      await this.ensureDirectories();
      
      // Start watching the queue directory
      this.startWatching();
      
      console.log('[REPORT PROCESSING] Report processing service initialized successfully');
    } catch (error) {
      console.error('[REPORT PROCESSING] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Ensure all required directories exist
   */
  async ensureDirectories() {
    const dirs = [this.queueDir, this.processingDir, this.completedDir, this.failedDir];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`[REPORT PROCESSING] Directory ensured: ${dir}`);
      } catch (error) {
        console.error(`[REPORT PROCESSING] Failed to create directory ${dir}:`, error);
        throw error;
      }
    }
  }

  /**
   * Start watching the queue directory for new files
   */
  startWatching() {
    try {
      this.watcher = watch(this.queueDir, async (eventType, filename) => {
        if (eventType === 'rename' && filename && filename.endsWith('.json')) {
          console.log(`[REPORT PROCESSING] Detected new file: ${filename}`);
          
          // Add to processing queue
          this.processQueue.push(filename);
          
          // Process queue if not already processing
          if (!this.isProcessing) {
            this.processNextInQueue();
          }
        }
      });
      
      console.log('[REPORT PROCESSING] Started watching queue directory');
    } catch (error) {
      console.error('[REPORT PROCESSING] Failed to start watching:', error);
      throw error;
    }
  }

  /**
   * Process the next file in the queue
   */
  async processNextInQueue() {
    if (this.processQueue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const filename = this.processQueue.shift();

    try {
      await this.processReportFile(filename);
    } catch (error) {
      console.error(`[REPORT PROCESSING] Error processing ${filename}:`, error);
    } finally {
      this.isProcessing = false;
      
      // Process next file if queue is not empty
      if (this.processQueue.length > 0) {
        setImmediate(() => this.processNextInQueue());
      }
    }
  }

  /**
   * Process a single report file from the queue
   * 
   * @param {string} filename - Name of the file to process
   */
  async processReportFile(filename) {
    const queueFilePath = path.join(this.queueDir, filename);
    const processingFilePath = path.join(this.processingDir, filename);
    const completedFilePath = path.join(this.completedDir, filename);
    const failedFilePath = path.join(this.failedDir, filename);

    try {
      console.log(`[REPORT PROCESSING] Processing file: ${filename}`);

      // Move file to processing directory (atomic operation)
      try {
        await fs.rename(queueFilePath, processingFilePath);
      } catch (error) {
        // File might have already been moved or deleted
        console.warn(`[REPORT PROCESSING] Could not move file to processing: ${error.message}`);
        return;
      }

      // Read the report data
      const fileContent = await fs.readFile(processingFilePath, 'utf-8');
      const reportData = JSON.parse(fileContent);

      console.log(`[REPORT PROCESSING] Parsed report data for school: ${reportData.schoolName}`);

      // Process the report using reportService
      const report = await reportService.createReport(reportData, reportData.reporterIp || 'queue-processor');

      console.log(`[REPORT PROCESSING] Report created successfully: ${report.id}`);

      // Move file to completed directory
      await fs.rename(processingFilePath, completedFilePath);
      console.log(`[REPORT PROCESSING] File moved to completed: ${filename}`);

    } catch (error) {
      console.error(`[REPORT PROCESSING] Error processing file ${filename}:`, error);

      try {
        // Move file to failed directory
        const processingExists = await this.fileExists(processingFilePath);
        if (processingExists) {
          await fs.rename(processingFilePath, failedFilePath);
        }
        console.log(`[REPORT PROCESSING] File moved to failed: ${filename}`);
      } catch (moveError) {
        console.error(`[REPORT PROCESSING] Failed to move file to failed directory:`, moveError);
      }
    }
  }

  /**
   * Check if a file exists
   * 
   * @param {string} filePath - Path to check
   * @returns {Promise<boolean>} - True if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Stop watching the queue directory
   */
  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('[REPORT PROCESSING] Stopped watching queue directory');
    }
  }

  /**
   * Get queue statistics
   * 
   * @returns {Promise<Object>} - Statistics about the queue
   */
  async getStats() {
    try {
      const queueFiles = await fs.readdir(this.queueDir);
      const processingFiles = await fs.readdir(this.processingDir);
      const completedFiles = await fs.readdir(this.completedDir);
      const failedFiles = await fs.readdir(this.failedDir);

      return {
        queued: queueFiles.filter(f => f.endsWith('.json')).length,
        processing: processingFiles.filter(f => f.endsWith('.json')).length,
        completed: completedFiles.filter(f => f.endsWith('.json')).length,
        failed: failedFiles.filter(f => f.endsWith('.json')).length,
        isProcessing: this.isProcessing,
        queueLength: this.processQueue.length
      };
    } catch (error) {
      console.error('[REPORT PROCESSING] Error getting stats:', error);
      return {
        error: error.message
      };
    }
  }

  /**
   * Retry failed reports
   * Moves files from failed directory back to queue for reprocessing
   */
  async retryFailed() {
    try {
      const failedFiles = await fs.readdir(this.failedDir);
      let retryCount = 0;

      for (const file of failedFiles) {
        if (file.endsWith('.json')) {
          const failedPath = path.join(this.failedDir, file);
          const queuePath = path.join(this.queueDir, file);

          try {
            await fs.rename(failedPath, queuePath);
            this.processQueue.push(file);
            retryCount++;
            console.log(`[REPORT PROCESSING] Retrying failed file: ${file}`);
          } catch (error) {
            console.error(`[REPORT PROCESSING] Failed to retry ${file}:`, error);
          }
        }
      }

      console.log(`[REPORT PROCESSING] Retried ${retryCount} failed files`);

      // Start processing if not already processing
      if (!this.isProcessing && this.processQueue.length > 0) {
        this.processNextInQueue();
      }

      return { retryCount };
    } catch (error) {
      console.error('[REPORT PROCESSING] Error retrying failed reports:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new ReportProcessingService();
