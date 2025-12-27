// background.js
// Production-grade background service worker with comprehensive error handling

const DEBUG = true;

function log(msg, data) {
    if (DEBUG) {
        console.log(`[SnapFlow] ${msg}`, data || '');
    }
}

function error(msg, err) {
    console.error(`[SnapFlow ERROR] ${msg}`, err);
}

// Keep track of the current tab logic
async function captureTab(tabId) {
    let cleanupNeeded = false;
    try {
        log("Starting full page capture for tab", tabId);

        // 1. Inject content script
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
        } catch (e) {
            error("Failed to inject content script", e);
            throw new Error("Could not inject content script into this page");
        }

        cleanupNeeded = true;

        // 2. Get Dimensions
        const dimensions = await sendMessageToTab(tabId, { action: "get_dimensions" });
        if (!dimensions) {
            throw new Error("Could not retrieve page dimensions");
        }

        log("Page dimensions", dimensions);
        const { fullHeight, fullWidth, windowHeight, windowWidth, devicePixelRatio } = dimensions;

        // Validate dimensions
        if (!fullHeight || !fullWidth || !windowHeight || !windowWidth) {
            throw new Error("Invalid page dimensions received");
        }

        // 3. Prepare (Hide fixed elements, show loader)
        await sendMessageToTab(tabId, { action: "prepare_capture" });

        // 4. Capture Loop with overlap
        const captures = [];
        let currentY = 0;
        let index = 0;

        // Small overlap to prevent gaps
        const overlap = Math.ceil(windowHeight * 0.1); // 10% overlap
        const totalScreenshots = Math.ceil((fullHeight - overlap) / (windowHeight - overlap)) *
            Math.ceil((fullWidth - overlap) / (windowWidth - overlap));

        log("Starting capture loop", { totalScreenshots, fullHeight, fullWidth });

        while (currentY < fullHeight) {
            let currentX = 0;
            while (currentX < fullWidth) {
                // Scroll
                const scrollResponse = await sendMessageToTab(tabId, {
                    action: "scroll_to",
                    x: currentX,
                    y: currentY,
                    index: index,
                    total: totalScreenshots
                });

                if (!scrollResponse) {
                    throw new Error(`Failed to scroll to position ${currentX}, ${currentY}`);
                }

                // Small delay for rendering
                await sleep(100);

                // Capture
                try {
                    const dataUrl = await chrome.tabs.captureVisibleTab(tabId, { format: "png" });
                    captures.push({
                        src: dataUrl,
                        y: scrollResponse.actualY,
                        x: scrollResponse.actualX
                    });
                    log(`Captured ${index + 1}/${totalScreenshots}`);
                } catch (e) {
                    error(`Failed to capture at position ${currentX}, ${currentY}`, e);
                    throw e;
                }

                currentX += (windowWidth - overlap);
                index++;
            }
            currentY += (windowHeight - overlap);
        }

        log("Capture complete", { totalCaptures: captures.length });

        // 5. Cleanup
        await sendMessageToTab(tabId, { action: "finish_capture" });
        cleanupNeeded = false;

        // 6. Save & Open Result
        await chrome.storage.local.set({
            capturedImages: captures,
            meta: {
                ...dimensions,
                captureDate: new Date().toISOString(),
                totalImages: captures.length
            }
        });

        chrome.tabs.create({ url: "result.html" });

    } catch (err) {
        error("Capture failed", err);

        // Try to cleanup if needed
        if (cleanupNeeded) {
            try {
                await sendMessageToTab(tabId, { action: "finish_capture" });
            } catch (e) {
                error("Cleanup failed", e);
            }
        }

        // Notify user of error
        chrome.tabs.create({
            url: `error.html?message=${encodeURIComponent(err.message || 'Unknown error occurred')}`
        });
    }
}

function sendMessageToTab(tabId, message) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("Message timeout - tab may be unresponsive"));
        }, 30000); // 30 second timeout

        try {
            chrome.tabs.sendMessage(tabId, message, (response) => {
                clearTimeout(timeout);

                if (chrome.runtime.lastError) {
                    console.warn(chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        } catch (e) {
            clearTimeout(timeout);
            reject(e);
        }
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureVisible(tabId) {
    try {
        log("Starting visible area capture");
        const dataUrl = await chrome.tabs.captureVisibleTab(tabId, { format: "png" });

        await chrome.storage.local.set({
            capturedImages: [{ src: dataUrl, y: 0, x: 0 }],
            meta: {
                fullWidth: 0,
                fullHeight: 0,
                devicePixelRatio: 1,
                mode: 'visible',
                captureDate: new Date().toISOString()
            }
        });
        chrome.tabs.create({ url: "result.html?mode=visible" });
    } catch (e) {
        error("Visible capture failed", e);
        chrome.tabs.create({
            url: `error.html?message=${encodeURIComponent('Failed to capture visible area: ' + e.message)}`
        });
    }
}

async function startRegionCapture(tabId) {
    try {
        log("Starting region capture overlay");
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });
        await sendMessageToTab(tabId, { action: "start_region_selection" });
    } catch (e) {
        error("Region capture initialization failed", e);
        chrome.tabs.create({
            url: `error.html?message=${encodeURIComponent('Could not start region selection: ' + e.message)}`
        });
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.action === "capture") {
            triggerCapture(sendResponse);
            return true;
        }
        else if (message.action === "capture_visible") {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) captureVisible(tabs[0].id);
                else sendResponse?.({ status: "no_tab" });
            });
            return true;
        }
        else if (message.action === "capture_region") {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) startRegionCapture(tabs[0].id);
                else sendResponse?.({ status: "no_tab" });
            });
            return true;
        }
        else if (message.action === "region_selected") {
            log("Region selected", message.rect);
            const tabId = sender.tab.id;
            chrome.tabs.captureVisibleTab(tabId, { format: "png" }, (dataUrl) => {
                if (chrome.runtime.lastError) {
                    error("Region capture failed", chrome.runtime.lastError);
                    chrome.tabs.create({
                        url: `error.html?message=${encodeURIComponent('Failed to capture region')}`
                    });
                    return;
                }

                chrome.storage.local.set({
                    capturedImages: [{ src: dataUrl }],
                    meta: {
                        region: message.rect,
                        dpr: message.devicePixelRatio,
                        mode: 'region',
                        captureDate: new Date().toISOString()
                    }
                }, () => {
                    chrome.tabs.create({ url: "result.html?mode=region" });
                });
            });
            return true;
        }
    } catch (e) {
        error("Message handling error", e);
        sendResponse?.({ status: "error", message: e.message });
    }
});

chrome.commands.onCommand.addListener((command) => {
    try {
        if (command === "capture_page") {
            log("Command triggered: capture_page");
            triggerCapture();
        }
    } catch (e) {
        error("Command handler error", e);
    }
});

function triggerCapture(sendResponse) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            log("Triggering capture for tab", tabs[0].id);
            captureTab(tabs[0].id);
            if (sendResponse) sendResponse({ status: "started" });
        } else {
            if (sendResponse) sendResponse({ status: "no_tab" });
        }
    });
}
