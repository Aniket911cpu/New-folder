// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const captureBtn = document.getElementById('captureBtn');
    const statusDiv = document.getElementById('status');

    captureBtn.addEventListener('click', () => {
        statusDiv.textContent = 'Initializing capture...';
        captureBtn.disabled = true;

        // Send message to background script to start the process
        chrome.runtime.sendMessage({ action: "capture" }, (response) => {
            if (chrome.runtime.lastError) {
                statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
                captureBtn.disabled = false;
            } else {
                // The popup might close if the user clicks away, but the background script continues.
                // We can listen for progress messages if we keep the popup open, 
                // but usually for full page capture the user waits or we show a content script overlay.
                // For now, simple feedback.
                statusDiv.textContent = 'Capture started...';
            }
        });
    });
});
