// content.js
console.log("Full Page Capture content script loaded");

let fixedElements = [];
let originalOverflow = "";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function hideFixedElements() {
    // Find all elements with position: fixed or sticky
    // We only want to hide them if they are visible
    const allElems = document.querySelectorAll('*');
    fixedElements = [];

    allElems.forEach(el => {
        const style = window.getComputedStyle(el);
        if ((style.position === 'fixed' || style.position === 'sticky') && style.display !== 'none' && style.visibility !== 'hidden') {
            fixedElements.push({
                element: el,
                originalVisibility: el.style.visibility,
                originalOpacity: el.style.opacity // Optional, sometimes safer
            });
            // Hide them
            el.style.visibility = 'hidden';
        }
    });

    // Also hide scrollbars
    originalOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
}

function restoreFixedElements() {
    fixedElements.forEach(item => {
        item.element.style.visibility = item.originalVisibility;
    });
    fixedElements = [];
    document.documentElement.style.overflow = originalOverflow;
}

function createProgressBar() {
    const overlay = document.createElement('div');
    overlay.id = 'fpc-progress-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '9999999999';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.flexDirection = 'column';

    const box = document.createElement('div');
    box.style.backgroundColor = 'white';
    box.style.padding = '20px';
    box.style.borderRadius = '8px';
    box.style.textAlign = 'center';
    box.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

    const text = document.createElement('div');
    text.id = 'fpc-progress-text';
    text.textContent = 'Capturing... 0%';
    text.style.marginBottom = '10px';
    text.style.fontFamily = 'sans-serif';
    text.style.fontSize = '16px';
    text.style.color = '#333';

    const barContainer = document.createElement('div');
    barContainer.style.width = '200px';
    barContainer.style.height = '10px';
    barContainer.style.backgroundColor = '#ddd';
    barContainer.style.borderRadius = '5px';
    barContainer.style.overflow = 'hidden';

    const bar = document.createElement('div');
    bar.id = 'fpc-progress-bar';
    bar.style.width = '0%';
    bar.style.height = '100%';
    bar.style.backgroundColor = '#3498db';
    bar.style.transition = 'width 0.2s';

    box.appendChild(text);
    box.appendChild(barContainer);
    barContainer.appendChild(bar);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
}

function updateProgressBar(percent) {
    const text = document.getElementById('fpc-progress-text');
    const bar = document.getElementById('fpc-progress-bar');
    if (text && bar) {
        text.textContent = `Capturing... ${Math.round(percent)}% `;
        bar.style.width = `${percent}% `;
    }
}

function removeProgressBar() {
    const overlay = document.getElementById('fpc-progress-overlay');
    if (overlay) overlay.remove();
}

// Region Selection Logic
let selectionOverlay = null;
let startX, startY, endX, endY;
let isSelecting = false;

function createSelectionOverlay(callback) {
    if (selectionOverlay) return; // Already active

    selectionOverlay = document.createElement('div');
    selectionOverlay.style.position = 'fixed';
    selectionOverlay.style.top = '0';
    selectionOverlay.style.left = '0';
    selectionOverlay.style.width = '100%';
    selectionOverlay.style.height = '100%';
    selectionOverlay.style.zIndex = '2147483647'; // Max z-index
    selectionOverlay.style.cursor = 'crosshair';
    selectionOverlay.style.background = 'rgba(0,0,0,0.3)'; // Darken background

    // Add instruction text
    const text = document.createElement('div');
    text.textContent = 'Drag to select area. Press Esc to cancel.';
    text.style.position = 'absolute';
    text.style.top = '20px';
    text.style.left = '50%';
    text.style.transform = 'translateX(-50%)';
    text.style.padding = '8px 16px';
    text.style.background = 'rgba(0,0,0,0.7)';
    text.style.color = 'white';
    text.style.borderRadius = '20px';
    text.style.fontFamily = 'sans-serif';
    text.style.pointerEvents = 'none';
    selectionOverlay.appendChild(text);

    // Selection Box
    const box = document.createElement('div');
    box.style.border = '2px dashed #fff';
    box.style.background = 'rgba(255,255,255,0.1)';
    box.style.position = 'absolute';
    box.style.display = 'none';
    selectionOverlay.appendChild(box);

    document.body.appendChild(selectionOverlay);

    // Events
    function onMouseDown(e) {
        isSelecting = true;
        startX = e.clientX;
        startY = e.clientY;
        box.style.left = startX + 'px';
        box.style.top = startY + 'px';
        box.style.width = '0px';
        box.style.height = '0px';
        box.style.display = 'block';
    }

    function onMouseMove(e) {
        if (!isSelecting) return;
        endX = e.clientX;
        endY = e.clientY;

        const currentLeft = Math.min(startX, endX);
        const currentTop = Math.min(startY, endY);
        const currentWidth = Math.abs(endX - startX);
        const currentHeight = Math.abs(endY - startY);

        box.style.left = currentLeft + 'px';
        box.style.top = currentTop + 'px';
        box.style.width = currentWidth + 'px';
        box.style.height = currentHeight + 'px';
    }

    function onMouseUp(e) {
        if (!isSelecting) return;
        isSelecting = false;

        // Calculate final rect
        const rect = {
            x: parseInt(box.style.left),
            y: parseInt(box.style.top),
            width: parseInt(box.style.width),
            height: parseInt(box.style.height)
        };

        // Remove overlay
        cleanup();

        // If generic click or tiny selection, ignore? or capture clicked element?
        // Let's enforce min size 5x5
        if (rect.width > 5 && rect.height > 5) {
            callback(rect);
        } else {
            console.log("Selection too small");
        }
    }

    function onKeyDown(e) {
        if (e.key === 'Escape') {
            cleanup();
        }
    }

    function cleanup() {
        if (selectionOverlay) selectionOverlay.remove();
        selectionOverlay = null;
        document.removeEventListener('keydown', onKeyDown);
    }

    selectionOverlay.addEventListener('mousedown', onMouseDown);
    selectionOverlay.addEventListener('mousemove', onMouseMove);
    selectionOverlay.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', onKeyDown);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_dimensions") {
        // 1. Calculate actual scrollable height
        // We scroll to top first to ensure calculations are continuous
        window.scrollTo(0, 0);

        const body = document.body;
        const html = document.documentElement;

        const fullHeight = Math.max(
            body.scrollHeight, body.offsetHeight,
            html.clientHeight, html.scrollHeight, html.offsetHeight
        );

        const fullWidth = Math.max(
            body.scrollWidth, body.offsetWidth,
            html.clientWidth, html.scrollWidth, html.offsetWidth
        );

        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        const devicePixelRatio = window.devicePixelRatio || 1;

        sendResponse({
            fullHeight,
            fullWidth,
            windowHeight,
            windowWidth,
            devicePixelRatio,
            originalScrollX: window.scrollX,
            originalScrollY: window.scrollY
        });
    }
    else if (request.action === "start_region_selection") {
        createSelectionOverlay((rect) => {
            // Send rect back to background
            // We can't use sendResponse directly easily because it's async callback
            chrome.runtime.sendMessage({
                action: "region_selected",
                rect: rect,
                devicePixelRatio: window.devicePixelRatio || 1
            });
        });
        sendResponse({ status: "overlay_shown" });
    }
    else if (request.action === "prepare_capture") {
        hideFixedElements();
        createProgressBar();
        sendResponse({ status: "ready" });
    }
    else if (request.action === "scroll_to") {
        const { x, y, index, total } = request;
        window.scrollTo(x, y);
        updateProgressBar((index / total) * 100);

        // Give a little time for browser to render/paint after scroll
        // 150ms is usually a safe bet for modern browsers
        setTimeout(() => {
            sendResponse({ status: "scrolled", actualY: window.scrollY, actualX: window.scrollX });
        }, 150);
        return true; // Keep channel open for async response
    }
    else if (request.action === "finish_capture") {
        restoreFixedElements();
        removeProgressBar();
        sendResponse({ status: "cleanup_done" });
    }
    return true;
});
