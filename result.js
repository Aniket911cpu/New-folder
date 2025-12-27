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

    // Stitching Logic with 32k Limit
    const MAX_CANVAS_HEIGHT = 32767;
    const devicePixelRatio = meta.devicePixelRatio || 1;
    const fullWidth = meta.fullWidth * devicePixelRatio;

    // Load images first
    const images = await Promise.all(capturedImages.map(item => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ img, y: item.y * devicePixelRatio, x: (item.x || 0) * devicePixelRatio });
            img.src = item.src;
        });
    }));

    // Group images into chunks that fit in MAX_CANVAS_HEIGHT
    let currentChunkHeight = 0;
    let chunks = [];
    let currentChunk = [];

    // This naive grouping assumes images are sequential and we split at image boundaries.
    // Ideally we should "cut" an image if it crosses the boundary, but that's complex.
    // For now, we start a new chunk if the *next* image pushes us over.
    // However, since we use absolute Y coordinates, we need to normalize them relative to the chunk.

    // Better approach: Just iterate and draw. If y > limit, use a new canvas.
    // But we need to know the *height* of the current canvas.

    // Let's create a list of Canvases.
    // If totalHeight < MAX, just one.
    // If > MAX, we split.

    let remainingHeight = meta.fullHeight * devicePixelRatio;
    let processedHeight = 0;
    let pageIndex = 1;

    const canvases = [];

    // Sort images by Y just in case
    images.sort((a, b) => a.y - b.y);

    while (processedHeight < (meta.fullHeight * devicePixelRatio)) {
        const chunkHeight = Math.min(remainingHeight, MAX_CANVAS_HEIGHT);

        const canvas = document.createElement('canvas');
        canvas.width = fullWidth;
        canvas.height = chunkHeight;
        canvas.style.marginBottom = "20px";
        canvas.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";

        const ctx = canvas.getContext('2d');

        // Draw relevant parts of images
        images.forEach(item => {
            const imgY = item.y;
            const imgH = item.img.height;

            // Check intersection with current chunk [processedHeight, processedHeight + chunkHeight]
            // Image range: [imgY, imgY + imgH]
            // Chunk range: [processedHeight, processedHeight + chunkHeight]

            if (imgY + imgH > processedHeight && imgY < processedHeight + chunkHeight) {
                // Determine drawing position
                // y relative to canvas = imgY - processedHeight
                const drawY = imgY - processedHeight;
                // x is just item.x * dpr, assuming no horizontal split
                const drawX = (item.x || 0);
                // wait, item.x is already scaled by dpr in the loader above
                ctx.drawImage(item.img, drawX, drawY);
            }
        });

        canvases.push(canvas);
        previewContainer.appendChild(canvas);

        // Add download button for this part
        const btn = document.createElement('button');
        btn.textContent = `Download Part ${pageIndex}`;
        btn.style.margin = "0 5px";
        btn.onclick = () => {
            const link = document.createElement('a');
            link.download = `screencapture-part${pageIndex}-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        document.querySelector('.controls').appendChild(btn);

        processedHeight += chunkHeight;
        remainingHeight -= chunkHeight;
        pageIndex++;
    }

    infoText.textContent = `Done! Split into ${canvases.length} part(s). Total Size: ${fullWidth}x${meta.fullHeight * devicePixelRatio}`;
    if (canvases.length > 1) {
        downloadBtn.style.display = 'none'; // Hide the original single download button
    } else {
        // If single canvas, wire up the original button
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = `screencapture-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
            link.href = canvases[0].toDataURL('image/png');
            link.click();
        };
    }
});
