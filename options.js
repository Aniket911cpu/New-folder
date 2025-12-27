// options.js - Comprehensive settings management

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const saveBtn = document.getElementById('save');
    const resetBtn = document.getElementById('reset');
    const statusDiv = document.getElementById('status');

    // Initialize theme
    loadTheme();

    // Load all settings
    loadAllSettings();

    // Event listeners
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    saveBtn.addEventListener('click', saveSettings);
    resetBtn.addEventListener('click', resetSettings);

    // Capture Settings
    const imageFormat = document.getElementById('imageFormat');
    const jpegQuality = document.getElementById('jpegQuality');
    const autoCopyClipboard = document.getElementById('autoCopyClipboard');
    const hideFixed = document.getElementById('hideFixed');

    // Download Settings
    const filenamePattern = document.getElementById('filenamePattern');
    const autoDownload = document.getElementById('autoDownload');
    const downloadLocation = document.getElementById('downloadLocation');

    // Notifications
    const showNotifications = document.getElementById('showNotifications');
    const soundNotification = document.getElementById('soundNotification');
    const autoOpenResult = document.getElementById('autoOpenResult');
    const themeSelect = document.getElementById('themeSelect');

    // Advanced Settings
    const scrollOverlap = document.getElementById('scrollOverlap');
    const captureTimeout = document.getElementById('captureTimeout');
    const debugLogging = document.getElementById('debugLogging');

    function loadAllSettings() {
        chrome.storage.sync.get(getDefaultSettings(), (items) => {
            // Capture Settings
            imageFormat.value = items.imageFormat || 'png';
            jpegQuality.value = items.jpegQuality || 90;
            autoCopyClipboard.checked = items.autoCopyClipboard !== false;
            hideFixed.checked = items.hideFixed !== false;

            // Download Settings
            filenamePattern.value = items.filenamePattern || 'snapflow-{date}-{time}';
            autoDownload.checked = items.autoDownload || false;
            downloadLocation.value = items.downloadLocation || 'default';

            // Notifications
            showNotifications.checked = items.showNotifications !== false;
            soundNotification.checked = items.soundNotification || false;
            autoOpenResult.checked = items.autoOpenResult !== false;
            themeSelect.value = items.theme || 'light';

            // Advanced
            scrollOverlap.value = items.scrollOverlap || 10;
            captureTimeout.value = items.captureTimeout || 60;
            debugLogging.checked = items.debugLogging || false;

            // Check storage usage
            updateStorageUsage();
        });

        // Get version
        const manifest = chrome.runtime.getManifest();
        document.getElementById('version').textContent = manifest.version;
    }

    function getDefaultSettings() {
        return {
            imageFormat: 'png',
            jpegQuality: 90,
            autoCopyClipboard: true,
            hideFixed: true,
            filenamePattern: 'snapflow-{date}-{time}',
            autoDownload: false,
            downloadLocation: 'default',
            showNotifications: true,
            soundNotification: false,
            autoOpenResult: true,
            theme: 'light',
            scrollOverlap: 10,
            captureTimeout: 60,
            debugLogging: false
        };
    }

    function saveSettings() {
        const settings = {
            imageFormat: imageFormat.value,
            jpegQuality: parseInt(jpegQuality.value),
            autoCopyClipboard: autoCopyClipboard.checked,
            hideFixed: hideFixed.checked,
            filenamePattern: filenamePattern.value,
            autoDownload: autoDownload.checked,
            downloadLocation: downloadLocation.value,
            showNotifications: showNotifications.checked,
            soundNotification: soundNotification.checked,
            autoOpenResult: autoOpenResult.checked,
            theme: themeSelect.value,
            scrollOverlap: parseInt(scrollOverlap.value),
            captureTimeout: parseInt(captureTimeout.value),
            debugLogging: debugLogging.checked
        };

        chrome.storage.sync.set(settings, () => {
            if (chrome.runtime.lastError) {
                showStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showStatus('✓ Settings saved successfully!', 'success');
                updateStorageUsage();
            }
        });
    }

    function resetSettings() {
        if (confirm('Are you sure you want to reset all settings to their default values?')) {
            chrome.storage.sync.clear(() => {
                chrome.storage.sync.set(getDefaultSettings(), () => {
                    loadAllSettings();
                    showStatus('✓ Settings reset to defaults!', 'success');
                });
            });
        }
    }

    function showStatus(message, type) {
        statusDiv.textContent = message;
        statusDiv.className = type;
        setTimeout(() => {
            statusDiv.className = '';
            statusDiv.textContent = '';
        }, 3000);
    }

    function updateStorageUsage() {
        chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
            const kb = (bytesInUse / 1024).toFixed(2);
            const quota = chrome.storage.local.QUOTA_BYTES;
            const percentUsed = ((bytesInUse / quota) * 100).toFixed(1);
            document.getElementById('storageUsage').textContent =
                `Using ${kb} KB of ${(quota / 1024 / 1024).toFixed(1)} MB (${percentUsed}%)`;
        });
    }

    function loadTheme() {
        chrome.storage.sync.get(['theme'], (result) => {
            const theme = result.theme || 'light';
            applyTheme(theme);
        });
    }

    function toggleTheme() {
        const html = document.documentElement;
        const isDark = html.classList.contains('dark-mode');
        const newTheme = isDark ? 'light' : 'dark';

        chrome.storage.sync.set({ theme: newTheme }, () => {
            applyTheme(newTheme);
            themeSelect.value = newTheme;
        });
    }

    function applyTheme(theme) {
        const html = document.documentElement;
        if (theme === 'dark') {
            html.classList.add('dark-mode');
            themeToggle.innerHTML = '☀️';
            themeToggle.title = 'Switch to Light Mode';
        } else {
            html.classList.remove('dark-mode');
            themeToggle.innerHTML = '🌙';
            themeToggle.title = 'Switch to Dark Mode';
        }
    }

    // Support links
    window.openFeedback = function () {
        chrome.tabs.create({ url: 'feedback.html' });
    };

    window.openHelp = function () {
        chrome.tabs.create({ url: 'welcome.html' });
    };

    window.rateExtension = function () {
        chrome.tabs.create({
            url: 'https://chromewebstore.google.com/detail/snapflow/[EXTENSION_ID]'
        });
    };
});
