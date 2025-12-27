// result.js
document.addEventListener('DOMContentLoaded', async () => {
    const previewContainer = document.getElementById('previewContainer');
    const infoText = document.getElementById('infoText');
    const downloadBtn = document.getElementById('downloadBtn');

    // Retrieve the captured data from storage
    const { capturedImages, meta } = await chrome.storage.local.get(['capturedImages', 'meta']);

    if (!capturedImages || !capturedImages.length) {
        infoText.textContent = "No capture data found.";
        return;
    }

    infoText.textContent = `captured ${capturedImages.length} chunks. Stitching...`;

    // Stitching Logic
    const fullCanvas = document.createElement('canvas');
    const ctx = fullCanvas.getContext('2d');

    // Calculate total dimensions
    const totalWidth = meta.fullWidth * meta.devicePixelRatio;
    const totalHeight = meta.fullHeight * meta.devicePixelRatio; // Approximate, depends on stitching

    // We need to iterate through images and stitch them.
    // NOTE: This is a robust placeholder. Actual stitching logic depends on exactly how we captured (overlaps etc).
    // For now assuming we just stack them vertically.

    fullCanvas.width = totalWidth;
    fullCanvas.height = 0; // Will accumulate

    let currentY = 0;

    // Load all images first
    const images = await Promise.all(capturedImages.map(src => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = src;
        });
    }));

    // Simple vertical stack (naive stitching for scaffolding)
    // Real logic will need crop adjustment if we captured with overlap or fixed headers

    let totalCanvasHeight = 0;
    images.forEach(img => totalCanvasHeight += img.height);

    // Check for max canvas size
    const MAX_CANVAS_HEIGHT = 32767;
    if (totalCanvasHeight > MAX_CANVAS_HEIGHT) {
        infoText.textContent = `Warning: Image too large (${totalCanvasHeight}px). It may be split or truncated.`;
        // Logic to split would go here
    }

    fullCanvas.height = totalCanvasHeight;

    images.forEach(img => {
        ctx.drawImage(img, 0, currentY);
        currentY += img.height;
    });

    previewContainer.appendChild(fullCanvas);
    infoText.textContent = `Done! Size: ${totalWidth}x${totalCanvasHeight}`;

    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `screencapture-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
        link.href = fullCanvas.toDataURL('image/png');
        link.click();
    });
});
