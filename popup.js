// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    const optionsLink = document.getElementById('optionsLink');
    const themeToggle = document.getElementById('themeToggle');
    const rateUsBtn = document.getElementById('rateUsBtn');

    // Initialize theme
    loadTheme();

    // Theme toggle listener
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Rate us button
    if (rateUsBtn) {
        rateUsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({
                url: 'https://chromewebstore.google.com/detail/snapflow/[EXTENSION_ID]'
            });
        });
    }

    function handleCapture(action) {
        statusDiv.textContent = 'Initializing...';
        statusDiv.style.color = 'var(--text-secondary)';

        chrome.runtime.sendMessage({ action: action }, (response) => {
            if (chrome.runtime.lastError) {
                statusDiv.textContent = '❌ Error: ' + chrome.runtime.lastError.message;
                statusDiv.style.color = '#ef4444';
            } else {
                statusDiv.textContent = '✓ Capture started...';
                statusDiv.style.color = '#10b981';
                if (action === "capture_region") {
                    setTimeout(() => window.close(), 500); // Close popup so user can select
                }
            }
        });
    }

    document.getElementById('captureFullBtn').addEventListener('click', () => handleCapture('capture'));
    document.getElementById('captureVisibleBtn').addEventListener('click', () => handleCapture('capture_visible'));
    document.getElementById('captureRegionBtn').addEventListener('click', () => handleCapture('capture_region'));

    if (optionsLink) {
        optionsLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.openOptionsPage();
        });
    }

    function loadTheme() {
        chrome.storage.sync.get(['theme'], (result) => {
            const theme = result.theme || 'light';
            applyTheme(theme);
        });
    }

    function toggleTheme() {
        chrome.storage.sync.get(['theme'], (result) => {
            const currentTheme = result.theme || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';

            chrome.storage.sync.set({ theme: newTheme }, () => {
                applyTheme(newTheme);
            });
        });
    }

    function applyTheme(theme) {
        const html = document.documentElement;
        if (theme === 'dark') {
            html.classList.add('dark-mode');
            if (themeToggle) {
                themeToggle.innerHTML = '☀️';
                themeToggle.title = 'Switch to Light Mode';
            }
        } else {
            html.classList.remove('dark-mode');
            if (themeToggle) {
                themeToggle.innerHTML = '🌙';
                themeToggle.title = 'Switch to Dark Mode';
            }
        }
    }
});

