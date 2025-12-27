// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    const optionsLink = document.getElementById('optionsLink');

    function handleCapture(action) {
        statusDiv.textContent = 'Initializing...';
        chrome.runtime.sendMessage({ action: action }, (response) => {
            if (chrome.runtime.lastError) {
                statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
            } else {
                statusDiv.textContent = 'Capture started...';
                if (action === "capture_region") {
                    window.close(); // Close popup so user can select
                }
            }
        });
    }

    document.getElementById('captureFullBtn').addEventListener('click', () => handleCapture('capture'));
    document.getElementById('captureVisibleBtn').addEventListener('click', () => handleCapture('capture_visible'));
    document.getElementById('captureRegionBtn').addEventListener('click', () => handleCapture('capture_region'));

    optionsLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });
});
