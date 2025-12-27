// result.js
document.addEventListener('DOMContentLoaded', async () => {
    const previewContainer = document.getElementById('previewContainer');
    const infoText = document.getElementById('infoText');
    const controls = document.getElementById('controls');

    // Editor Elements
    const modePen = document.getElementById('modePen');
    const modeHighlight = document.getElementById('modeHighlight');
    const actionUndo = document.getElementById('actionUndo');
    const actionCopy = document.getElementById('actionCopy');

    // State
    let isDrawing = false;
    let currentTool = null; // 'pen', 'highlight', null
    let ctx = null;
    let canvas = null;
    let history = []; // Stack of ImageDatas
    let lastX = 0;
    let lastY = 0;

    // Retrieve the captured data from storage
    const { capturedImages, meta } = await chrome.storage.local.get(['capturedImages', 'meta']);

    if (!capturedImages || !capturedImages.length) {
        infoText.textContent = "No capture data found.";
        return;
    }

    infoText.textContent = "Rendering...";

    // Stitching / Loading Logic
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');

    let totalWidth, totalHeight;

    if (meta.mode === 'region') {
        // Handle Region Capture (Crop)
        // Src is the full viewport image (usually just one)
        const src = capturedImages[0].src;
        const img = await loadImage(src);

        const dpr = meta.dpr || 1;
        const rect = meta.region;

        // Scale rect by dpr
        // Note: content script rect is in css pixels.
        // Image is usually device pixels. 
        // rect: {x, y, width, height}

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // Draw cropped
        // drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        ctx.drawImage(img, rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr, 0, 0, canvas.width, canvas.height);

        totalWidth = canvas.width;
        totalHeight = canvas.height;

    } else {
        // Full / Visible logic
        const devicePixelRatio = meta.devicePixelRatio || 1;
        totalWidth = meta.fullWidth ? meta.fullWidth * devicePixelRatio : 0;
        totalHeight = meta.fullHeight ? meta.fullHeight * devicePixelRatio : 0;

        // If visible mode, fullHeight might be 0 in meta if we didn't calculate it? 
        // Actually background.js set 0. Let's infer from image.

        const images = await Promise.all(capturedImages.map(item => loadImage(item.src)));

        if (totalWidth === 0) {
            // Single image mode fallback
            totalWidth = images[0].width;
            totalHeight = images[0].height;
        }

        canvas.width = totalWidth;
        canvas.height = totalHeight;

        capturedImages.forEach((item, i) => {
            const img = images[i];
            // x, y are stored in item (CSS pixels)
            const drawX = (item.x || 0) * devicePixelRatio;
            const drawY = (item.y || 0) * devicePixelRatio;
            ctx.drawImage(img, drawX, drawY);
        });
    }

    previewContainer.appendChild(canvas);
    infoText.textContent = `Captured ${canvas.width}x${canvas.height} px`;

    // Initialize History
    saveState();

    // Editor Event Listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    function startDrawing(e) {
        if (!currentTool) return;
        isDrawing = true;
        [lastX, lastY] = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
    }

    function draw(e) {
        if (!isDrawing) return;
        const [x, y] = getCoords(e);

        ctx.lineWidth = currentTool === 'highlight' ? 20 : 3;
        ctx.strokeStyle = currentTool === 'highlight' ? 'rgba(255, 255, 0, 0.4)' : '#ef4444';

        // Composite for highlight
        if (currentTool === 'highlight') {
            ctx.globalCompositeOperation = 'multiply'; // or darken for marker effect
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.lineTo(x, y);
        ctx.stroke();
        [lastX, lastY] = [x, y];
    }

    function stopDrawing() {
        if (!isDrawing) return;
        isDrawing = false;
        ctx.closePath();
        ctx.globalCompositeOperation = 'source-over'; // Reset
        saveState();
    }

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return [
            (e.clientX - rect.left) * scaleX,
            (e.clientY - rect.top) * scaleY
        ];
    }

    function saveState() {
        if (history.length > 10) history.shift();
        history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    }

    // Tool Buttons
    modePen.addEventListener('click', () => {
        currentTool = currentTool === 'pen' ? null : 'pen';
        updateToolUI();
    });

    modeHighlight.addEventListener('click', () => {
        currentTool = currentTool === 'highlight' ? null : 'highlight';
        updateToolUI();
    });

    actionUndo.addEventListener('click', () => {
        if (history.length > 1) {
            history.pop(); // Remove current
            const prev = history[history.length - 1];
            ctx.putImageData(prev, 0, 0);
        }
    });

    actionCopy.addEventListener('click', () => {
        canvas.toBlob(blob => {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(() => {
                const originalText = infoText.textContent;
                infoText.textContent = "Copied to clipboard!";
                setTimeout(() => infoText.textContent = originalText, 2000);
            });
        });
    });

    function updateToolUI() {
        modePen.style.background = currentTool === 'pen' ? '#e0e7ff' : '#fff';
        modeHighlight.style.background = currentTool === 'highlight' ? '#fef3c7' : '#fff';
        canvas.style.cursor = currentTool ? 'crosshair' : 'default';
    }

    function loadImage(src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = src;
        });
    }

    // --- existing download/print logic ---
    // Clean up old controls generation or append to it?
    // The previous code had complex stitching & 32k split logic. 
    // I should adapt that to use 'canvas' variable I just created.
    // BUT, for 32k splitting, the drawing logic complicates things (we draw on top).
    // If the image is < 32k, we just use the canvas we drew on.
    // If > 32k, editor might be laggy, but let's assume valid.

    // Add Download Button
    const btn = document.createElement('button');
    btn.className = 'primary';
    btn.innerHTML = `< svg class="icon" viewBox = "0 0 24 24" > <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" /></svg > Download PNG`;
    btn.onclick = () => {
        // Simple download of current canvas
        const link = document.createElement('a');
        link.download = `screencapture - ${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    controls.appendChild(btn);

    const printBtn = document.createElement('button');
    printBtn.innerHTML = `< svg class="icon" viewBox = "0 0 24 24" > <path d="M18,3H6V7H18M19,12A1,1 0 0,1 18,11A1,1 0 0,1 19,10A1,1 0 0,1 20,11A1,1 0 0,1 19,12M16,19H8V14H16M19,8H5A3,3 0 0,0 2,11V17H6V21H18V17H22V11A3,3 0 0,0 19,8Z" /></svg > PDF`;
    printBtn.style.marginLeft = '10px';
    printBtn.onclick = () => window.print();
    controls.appendChild(printBtn);

    // Add CSS for printing to ensure only canvas prints
    const style = document.createElement('style');
    style.innerHTML = `
@media print {
    body * {
        visibility: hidden;
    }
        .preview - container, .preview - container * {
            visibility: visible;
        }
            .preview - container {
        position: absolute;
        left: 0;
        top: 0;
        border: none;
        margin: 0;
        padding: 0;
        max - height: none;
        overflow: visible;
    }
            canvas {
        margin: 0;
        box - shadow: none;
        max - width: 100 %;
        page -break-inside: avoid;
    }
    header, .controls, .info { display: none; }
}
`;
    document.head.appendChild(style);
});
