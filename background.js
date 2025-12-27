// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "capture") {
    // Start the capture process
    console.log("Capture initiated");
    // TODO: Implement capture logic
  }
  return true;
});
