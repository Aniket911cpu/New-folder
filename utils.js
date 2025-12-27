// utils.js - Utility functions for production-grade extension
// Provides error handling, logging, storage management, and helper functions

class Logger {
    constructor(debugMode = false) {
        this.debugMode = debugMode;
        this.logs = [];
    }

    log(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, level: 'INFO', message, data };
        this.logs.push(logEntry);

        if (this.debugMode) {
            console.log(`[SnapFlow] ${message}`, data || '');
        }
    }

    warn(message, data = null) {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, level: 'WARN', message, data };
        this.logs.push(logEntry);
        console.warn(`[SnapFlow WARN] ${message}`, data || '');
    }

    error(message, error = null) {
        const timestamp = new Date().toISOString();
        const errorDetails = error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
        } : error;

        const logEntry = { timestamp, level: 'ERROR', message, error: errorDetails };
        this.logs.push(logEntry);
        console.error(`[SnapFlow ERROR] ${message}`, error || '');
    }

    getLogs(limit = 100) {
        return this.logs.slice(-limit);
    }

    clearLogs() {
        this.logs = [];
    }

    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }
}

class ErrorHandler {
    static handle(error, context = '') {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : '';

        // Log the error
        logger.error(`Error in ${context}`, error);

        // Show user-friendly error message
        return {
            success: false,
            message: message,
            context: context,
            timestamp: new Date().toISOString()
        };
    }

    static async handleAsync(promise, context = '') {
        try {
            return await promise;
        } catch (error) {
            return this.handle(error, context);
        }
    }
}

class StorageManager {
    static async saveCapture(capturedImages, metadata) {
        try {
            const storageData = {
                capturedImages,
                meta: {
                    ...metadata,
                    savedAt: new Date().toISOString()
                }
            };

            return new Promise((resolve, reject) => {
                chrome.storage.local.set(storageData, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        logger.log('Capture saved successfully', {
                            imageCount: capturedImages.length,
                            totalSize: JSON.stringify(storageData).length
                        });
                        resolve(storageData);
                    }
                });
            });
        } catch (error) {
            return ErrorHandler.handle(error, 'StorageManager.saveCapture');
        }
    }

    static async getCapture() {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['capturedImages', 'meta'], (result) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(result);
                }
            });
        });
    }

    static async clearOldCaptures(daysToKeep = 7) {
        // Implement cleanup of old captures if needed
        logger.log('Cleanup scheduled for captures older than ' + daysToKeep + ' days');
    }

    static async getStorageStats() {
        return new Promise((resolve) => {
            chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
                const quota = chrome.storage.local.QUOTA_BYTES;
                resolve({
                    used: bytesInUse,
                    quota: quota,
                    percentUsed: ((bytesInUse / quota) * 100).toFixed(1),
                    remaining: quota - bytesInUse
                });
            });
        });
    }
}

class SettingsManager {
    static defaultSettings = {
        // Capture
        imageFormat: 'png',
        jpegQuality: 90,
        autoCopyClipboard: true,
        hideFixed: true,

        // Download
        filenamePattern: 'snapflow-{date}-{time}',
        autoDownload: false,
        downloadLocation: 'default',

        // Notifications
        showNotifications: true,
        soundNotification: false,
        autoOpenResult: true,
        theme: 'light',

        // Advanced
        scrollOverlap: 10,
        captureTimeout: 60,
        debugLogging: false
    };

    static async getSetting(key, defaultValue = null) {
        return new Promise((resolve) => {
            chrome.storage.sync.get([key], (result) => {
                resolve(result[key] ?? defaultValue ?? this.defaultSettings[key]);
            });
        });
    }

    static async setSetting(key, value) {
        return new Promise((resolve) => {
            chrome.storage.sync.set({ [key]: value }, () => {
                logger.log(`Setting updated: ${key}`, value);
                resolve(true);
            });
        });
    }

    static async getAllSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(this.defaultSettings, (result) => {
                resolve(result);
            });
        });
    }

    static async resetSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.clear(() => {
                chrome.storage.sync.set(this.defaultSettings, () => {
                    logger.log('Settings reset to defaults');
                    resolve(true);
                });
            });
        });
    }
}

class NotificationManager {
    static async showNotification(title, options = {}) {
        const settings = await SettingsManager.getSetting('showNotifications', true);
        if (!settings) return;

        try {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: title,
                message: options.message || '',
                priority: options.priority || 0,
                ...options
            });
        } catch (error) {
            logger.warn('Notification failed', error);
        }
    }

    static async playSound() {
        const settings = await SettingsManager.getSetting('soundNotification', false);
        if (!settings) return;

        // Create a simple beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }
}

class FileUtils {
    static generateFilename(pattern = 'snapflow-{date}-{time}') {
        const now = new Date();
        const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS

        return pattern
            .replace('{date}', date)
            .replace('{time}', time)
            .replace('{timestamp}', now.getTime());
    }

    static async downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    static getFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }
}

class ValidationUtils {
    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    static isValidDimensions(width, height) {
        return width > 0 && height > 0 && width < 32000 && height < 32000;
    }

    static isValidRegion(region) {
        return region &&
            typeof region.x === 'number' &&
            typeof region.y === 'number' &&
            typeof region.width === 'number' &&
            typeof region.height === 'number' &&
            region.width > 5 &&
            region.height > 5;
    }
}

class PerformanceMonitor {
    constructor() {
        this.marks = {};
        this.measures = {};
    }

    startMeasure(name) {
        this.marks[name] = performance.now();
    }

    endMeasure(name) {
        if (!this.marks[name]) {
            logger.warn(`No start mark found for measure: ${name}`);
            return 0;
        }

        const duration = performance.now() - this.marks[name];
        this.measures[name] = duration;
        logger.log(`Performance: ${name}`, `${duration.toFixed(2)}ms`);
        return duration;
    }

    getMetrics() {
        return this.measures;
    }
}

// Initialize global logger
const logger = new Logger(false);

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Logger,
        ErrorHandler,
        StorageManager,
        SettingsManager,
        NotificationManager,
        FileUtils,
        ValidationUtils,
        PerformanceMonitor,
        logger
    };
}
