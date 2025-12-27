// result.js
document.addEventListener('DOMContentLoaded', async () => {
    const previewContainer = document.getElementById('previewContainer');
    const infoText = document.getElementById('infoText');
    const controls = document.getElementById('controls');
    const themeToggle = document.getElementById('themeToggle');

    // Initialize theme
    loadTheme();

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

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

    if (meta && meta.mode === 'region') {
        // Handle Region Capture (Crop)
        const src = capturedImages[0].src;
        const img = await loadImage(src);

        const dpr = meta.dpr || 1;
        const rect = meta.region;

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        ctx.drawImage(img, rect.x * dpr, rect.y * dpr, rect.width * dpr, rect.height * dpr, 0, 0, canvas.width, canvas.height);

        totalWidth = canvas.width;
        totalHeight = canvas.height;

    } else {
        // Full / Visible logic
        const devicePixelRatio = meta?.devicePixelRatio || 1;
        totalWidth = meta?.fullWidth ? meta.fullWidth * devicePixelRatio : 0;
        totalHeight = meta?.fullHeight ? meta.fullHeight * devicePixelRatio : 0;

        const images = await Promise.all(capturedImages.map(item => loadImage(item.src)));

        if (totalWidth === 0) {
            totalWidth = images[0].width;
            totalHeight = images[0].height;
        }

        canvas.width = totalWidth;
        canvas.height = totalHeight;

        capturedImages.forEach((item, i) => {
            const img = images[i];
            const drawX = (item.x || 0) * devicePixelRatio;
            const drawY = (item.y || 0) * devicePixelRatio;
            ctx.drawImage(img, drawX, drawY);
        });
    }

    previewContainer.appendChild(canvas);
    infoText.textContent = `Captured ${Math.round(canvas.width)}×${Math.round(canvas.height)} px`;

    // Display metadata
    if (meta) {
        const metadata = document.getElementById('metadata');
        if (metadata) {
            const savedAt = meta.savedAt ? new Date(meta.savedAt).toLocaleString() : '';
            metadata.textContent = savedAt ? `Captured at ${savedAt}` : '';
        }
    }

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

        if (currentTool === 'highlight') {
            ctx.globalCompositeOperation = 'multiply';
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
        ctx.globalCompositeOperation = 'source-over';
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
        if (history.length > 20) history.shift();
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
            history.pop();
            const prev = history[history.length - 1];
            ctx.putImageData(prev, 0, 0);
        }
    });

    actionCopy.addEventListener('click', () => {
        canvas.toBlob(blob => {
            const item = new ClipboardItem({ 'image/png': blob });
            navigator.clipboard.write([item]).then(() => {
                const originalText = infoText.textContent;
                infoText.textContent = "✓ Copied to clipboard!";
                setTimeout(() => infoText.textContent = originalText, 2000);
            }).catch(err => {
                console.error('Copy failed:', err);
                infoText.textContent = "✗ Failed to copy to clipboard";
            });
        });
    });

    function updateToolUI() {
        modePen.style.background = currentTool === 'pen' ? '#e0e7ff' : 'var(--surface)';
        modeHighlight.style.background = currentTool === 'highlight' ? '#fef3c7' : 'var(--surface)';
        canvas.style.cursor = currentTool ? 'crosshair' : 'default';
    }

    function loadImage(src) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = src;
        });
    }

    // Download Button
    const btn = document.createElement('button');
    btn.className = 'primary';
    btn.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z" /></svg> Download PNG`;
    btn.onclick = () => {
        canvas.toBlob(blob => {
            const filename = `snapflow-${new Date().toISOString().split('T')[0]}-${new Date().getTime() % 100000}.png`;
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            infoText.textContent = "✓ Downloaded!";
            setTimeout(() => {
                infoText.textContent = `Captured ${Math.round(canvas.width)}×${Math.round(canvas.height)} px`;
            }, 2000);
        });
    };
    controls.appendChild(btn);

    const printBtn = document.createElement('button');
    printBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path fill="currentColor" d="M18,3H6V7H18M19,12A1,1 0 0,1 18,11A1,1 0 0,1 19,10A1,1 0 0,1 20,11A1,1 0 0,1 19,12M16,19H8V14H16M19,8H5A3,3 0 0,0 2,11V17H6V21H18V17H22V11A3,3 0 0,0 19,8Z"/></svg> PDF`;
    printBtn.onclick = () => window.print();
    controls.appendChild(printBtn);

    // Add CSS for printing to ensure only canvas prints
    const style = document.createElement('style');
    style.innerHTML = `
@media print {
    body * {
        visibility: hidden;
    }
    .preview-container, .preview-container * {
        visibility: visible;
    }
    .preview-container {
        position: absolute;
        left: 0;
        top: 0;
        border: none;
        margin: 0;
        padding: 0;
        max-height: none;
        overflow: visible;
    }
    canvas {
        margin: 0;
        box-shadow: none;
        max-width: 100%;
        page-break-inside: avoid;
    }
    header, .controls, .info { display: none; }
}
`;
    document.head.appendChild(style);

    // Theme management
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
