// content.js
// Content script for SnapFlow extension
// Handles page capture, element manipulation, and region selection

console.log("SnapFlow content script loaded");

let fixedElements = [];
let originalOverflow = "";
let debugMode = false;

// Utility function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function logDebug(msg, data) {
    if (debugMode) {
        console.log(`[SnapFlow] ${msg}`, data || '');
    }
}

function logError(msg, error) {
    console.error(`[SnapFlow ERROR] ${msg}`, error || '');
}

// Hide fixed/sticky elements
function hideFixedElements() {
    try {
        const allElems = document.querySelectorAll('*');
        fixedElements = [];

        allElems.forEach(el => {
            const style = window.getComputedStyle(el);
            if ((style.position === 'fixed' || style.position === 'sticky') &&
                style.display !== 'none' &&
                style.visibility !== 'hidden') {
                fixedElements.push({
                    element: el,
                    originalVisibility: el.style.visibility,
                    originalOpacity: el.style.opacity
                });
                el.style.visibility = 'hidden';
            }
        });

        // Hide scrollbars
        originalOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';

        logDebug('Hidden fixed elements', { count: fixedElements.length });
    } catch (error) {
        logError('Error hiding fixed elements', error);
    }
}

function restoreFixedElements() {
    try {
        fixedElements.forEach(item => {
            item.element.style.visibility = item.originalVisibility;
        });
        fixedElements = [];
        document.documentElement.style.overflow = originalOverflow;
        logDebug('Restored fixed elements');
    } catch (error) {
        logError('Error restoring fixed elements', error);
    }
}

// Progress bar UI
function createProgressBar() {
    try {
        const overlay = document.createElement('div');
        overlay.id = 'fpc-progress-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2147483647;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            min-width: 250px;
        `;

        const text = document.createElement('div');
        text.id = 'fpc-progress-text';
        text.textContent = 'Capturing... 0%';
        text.style.cssText = `
            margin-bottom: 10px;
            font-family: sans-serif;
            font-size: 16px;
            color: #333;
            font-weight: 500;
        `;

        const barContainer = document.createElement('div');
        barContainer.style.cssText = `
            width: 200px;
            height: 10px;
            background: #ddd;
            border-radius: 5px;
            overflow: hidden;
            margin: 0 auto;
        `;

        const bar = document.createElement('div');
        bar.id = 'fpc-progress-bar';
        bar.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #3498db, #2980b9);
            transition: width 0.2s;
        `;

        box.appendChild(text);
        box.appendChild(barContainer);
        barContainer.appendChild(bar);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        logDebug('Progress bar created');
    } catch (error) {
        logError('Error creating progress bar', error);
    }
}

function updateProgressBar(percent) {
    try {
        const text = document.getElementById('fpc-progress-text');
        const bar = document.getElementById('fpc-progress-bar');
        if (text && bar) {
            text.textContent = `Capturing... ${Math.round(percent)}%`;
            bar.style.width = `${percent}%`;
        }
    } catch (error) {
        logError('Error updating progress bar', error);
    }
}

function removeProgressBar() {
    try {
        const overlay = document.getElementById('fpc-progress-overlay');
        if (overlay) overlay.remove();
        logDebug('Progress bar removed');
    } catch (error) {
        logError('Error removing progress bar', error);
    }
}

// Region Selection UI
let selectionOverlay = null;
let startX, startY, endX, endY;
let isSelecting = false;

function createSelectionOverlay(callback) {
    if (selectionOverlay) return; // Already active

    try {
        selectionOverlay = document.createElement('div');
        selectionOverlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            z-index: 2147483647;
            cursor: crosshair;
            background: rgba(0,0,0,0.3);
        `;

        const text = document.createElement('div');
        text.textContent = 'Drag to select area. Press Esc to cancel.';
        text.style.cssText = `
            position: absolute;
            top: 20px; left: 50%;
            transform: translateX(-50%);
            padding: 8px 16px;
            background: rgba(0,0,0,0.7);
            color: white;
            border-radius: 20px;
            font-family: sans-serif;
            font-size: 14px;
            pointer-events: none;
            z-index: 2147483648;
        `;
        selectionOverlay.appendChild(text);

        const box = document.createElement('div');
        box.style.cssText = `
            border: 2px dashed #fff;
            background: rgba(255,255,255,0.1);
            position: absolute;
            display: none;
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.5);
        `;
        selectionOverlay.appendChild(box);
        document.body.appendChild(selectionOverlay);

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

            const rect = {
                x: parseInt(box.style.left),
                y: parseInt(box.style.top),
                width: parseInt(box.style.width),
                height: parseInt(box.style.height)
            };

            cleanup();

            // Enforce minimum size
            if (rect.width > 5 && rect.height > 5) {
                logDebug('Region selected', rect);
                callback(rect);
            } else {
                logDebug('Selection too small');
            }
        }

        function onKeyDown(e) {
            if (e.key === 'Escape') {
                cleanup();
            }
        }

        function cleanup() {
            if (selectionOverlay) {
                selectionOverlay.remove();
                selectionOverlay = null;
            }
            document.removeEventListener('keydown', onKeyDown);
        }

        selectionOverlay.addEventListener('mousedown', onMouseDown);
        selectionOverlay.addEventListener('mousemove', onMouseMove);
        selectionOverlay.addEventListener('mouseup', onMouseUp);
        document.addEventListener('keydown', onKeyDown);

        logDebug('Selection overlay created');
    } catch (error) {
        logError('Error creating selection overlay', error);
    }
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === "get_dimensions") {
            logDebug('Getting page dimensions');
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

            logDebug('Dimensions calculated', {
                fullHeight, fullWidth, windowHeight, windowWidth, devicePixelRatio
            });

            sendResponse({
                fullHeight, fullWidth, windowHeight, windowWidth,
                devicePixelRatio,
                originalScrollX: window.scrollX,
                originalScrollY: window.scrollY
            });
        }
        else if (request.action === "start_region_selection") {
            createSelectionOverlay((rect) => {
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

            // Allow browser to render
            setTimeout(() => {
                sendResponse({
                    status: "scrolled",
                    actualY: window.scrollY,
                    actualX: window.scrollX
                });
            }, 150);
            return true; // Keep channel open
        }
        else if (request.action === "finish_capture") {
            restoreFixedElements();
            removeProgressBar();
            sendResponse({ status: "cleanup_done" });
        }
    } catch (error) {
        logError('Error in message handler', error);
        sendResponse({ status: "error", message: error.message });
    }
    return true;
});

// Load debug setting
chrome.storage.sync.get(['debugLogging'], (result) => {
    debugMode = result.debugLogging || false;
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
