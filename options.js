// options.js
document.addEventListener('DOMContentLoaded', () => {
    // Load
    chrome.storage.sync.get(['imageFormat', 'filenamePrefix'], (items) => {
        document.getElementById('imageFormat').value = items.imageFormat || 'png';
        document.getElementById('filenamePrefix').value = items.filenamePrefix || 'screencapture';
    });

    // Save
    document.getElementById('save').addEventListener('click', () => {
        const imageFormat = document.getElementById('imageFormat').value;
        const filenamePrefix = document.getElementById('filenamePrefix').value;

        chrome.storage.sync.set({
            imageFormat,
            filenamePrefix
        }, () => {
            const status = document.getElementById('status');
            status.style.display = 'block';
            setTimeout(() => {
                status.style.display = 'none';
            }, 1500);
        });
    });
});
