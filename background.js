// background.js

// Keep track of the current tab logic
async function captureTab(tabId) {
    try {
        // 1. Inject or ensure content script is ready
        // (Assuming manifest has it, but good to be safe or just use scripting.executeScript if not)
        // Manifest "content_scripts" is not set in my plan, I used "activeTab".
        // So I must inject it.
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });

        // 2. Get Dimensions
        const dimensions = await sendMessageToTab(tabId, { action: "get_dimensions" });
        if (!dimensions) {
            console.error("Could not get dimensions");
            return;
        }

        const { fullHeight, fullWidth, windowHeight, devicePixelRatio } = dimensions;

        // 3. Prepare (Hide fixed elements, show loader)
        await sendMessageToTab(tabId, { action: "prepare_capture" });

        // 4. Capture Loop
        const captures = [];
        let currentY = 0;
        let index = 0;

        // We capture visible vp, then scroll.
        // Step size should be windowHeight.
        // We might want to overlap slightly to avoid lines? 
        // For simplicity, let's just do windowHeight. 
        // NOTE: Chrome captures the *visible viewport*.

        // Actually windowWidth is from dimensions
        const windowWidth = dimensions.windowWidth;
        const totalScreenshots = Math.ceil(fullHeight / windowHeight) * Math.ceil(fullWidth / windowWidth);

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

                // Capture
                const dataUrl = await chrome.tabs.captureVisibleTab(tabId, { format: "png" });
                captures.push({
                    src: dataUrl,
                    y: scrollResponse ? scrollResponse.actualY : currentY,
                    x: scrollResponse ? scrollResponse.actualX : currentX
                });

                currentX += windowWidth;
                index++;
            }
            currentY += windowHeight;
        }

        // 5. Cleanup
        await sendMessageToTab(tabId, { action: "finish_capture" });

        // 6. Save & Open Result
        await chrome.storage.local.set({
            capturedImages: captures,
            meta: dimensions
        });

        chrome.tabs.create({ url: "result.html" });

    } catch (err) {
        console.error("Capture failed", err);
        // Try to cleanup if possible
        try {
            await sendMessageToTab(tabId, { action: "finish_capture" });
        } catch (e) { }
    }
}

function sendMessageToTab(tabId, message) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                console.warn(chrome.runtime.lastError);
                resolve(null);
            } else {
                resolve(response);
            }
        });
    });
}

// background.js

async function captureVisible(tabId) {
    try {
        const dataUrl = await chrome.tabs.captureVisibleTab(tabId, { format: "png" });
        // Just one image
        await chrome.storage.local.set({
            capturedImages: [{ src: dataUrl, y: 0, x: 0 }],
            meta: { fullWidth: 0, fullHeight: 0, devicePixelRatio: 1 } // Dummy meta, result.js should handle single image
        });
        chrome.tabs.create({ url: "result.html?mode=visible" });
    } catch (e) {
        console.error(e);
    }
}

async function startRegionCapture(tabId) {
    try {
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        });
        await sendMessageToTab(tabId, { action: "start_region_selection" });
    } catch (e) { console.error(e); }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "capture") {
        triggerCapture(sendResponse);
        return true;
    }
    else if (message.action === "capture_visible") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) captureVisible(tabs[0].id);
        });
    }
    else if (message.action === "capture_region") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) startRegionCapture(tabs[0].id);
        });
    }
    else if (message.action === "region_selected") {
        // Received rect from content script
        // Capture visible tab, then crop in result? 
        // Note: region capture is usually visible region.
        const tabId = sender.tab.id;
        chrome.tabs.captureVisibleTab(tabId, { format: "png" }, (dataUrl) => {
            chrome.storage.local.set({
                capturedImages: [{ src: dataUrl }], // We'll store the full image
                meta: {
                    region: message.rect,
                    dpr: message.devicePixelRatio,
                    mode: 'region'
                }
            }, () => {
                chrome.tabs.create({ url: "result.html?mode=region" });
            });
        });
    }
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "capture_page") {
        console.log("Command triggered");
        triggerCapture();
    }
});

function triggerCapture(sendResponse) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            captureTab(tabs[0].id);
            if (sendResponse) sendResponse({ status: "started" });
        } else {
            if (sendResponse) sendResponse({ status: "no_tab" });
        }
    });
}
