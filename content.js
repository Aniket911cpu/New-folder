// content.js
console.log("Full Page Capture content script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "get_dimensions") {
        const body = document.body;
        const html = document.documentElement;

        // Calculate total height - max of various height properties to be safe
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
    return true;
});
