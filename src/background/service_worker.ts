chrome.runtime.onInstalled.addListener(() => {
  console.log("🚀 Extension installed");
});

chrome.runtime.onMessage.addListener(
  (
    message: { urls?: string[] },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (Array.isArray(message.urls)) {
      message.urls.forEach((url, index) => {
        setTimeout(() => {
          chrome.tabs.create({ url, active: false });
        }, index * 400);
      });
      sendResponse({ success: true });
      return true;
    }
  }
);
