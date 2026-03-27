// Manifest V3 service worker install — only keep if this is truly a SW context,
// otherwise remove this block entirely for a standard background script.
self.addEventListener('install', function(event) {
  event.waitUntil(self.skipWaiting());
});

// Allowed URL schemes for downloading
function isSafeUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch (e) {
    return false;
  }
}

chrome.bookmarks.onCreated.addListener(function(id, bookmark) {
  if (!bookmark.url || !isSafeUrl(bookmark.url)) {
    // FIX 1: Silently reject missing or non-http(s) URLs
    return;
  }

  chrome.storage.local.get({ downloadedUrls: [] }, function(data) {
    if (chrome.runtime.lastError) {
      // FIX 3: Handle storage read errors
      console.error('Storage read error:', chrome.runtime.lastError.message);
      return;
    }

    const downloadedUrls = data.downloadedUrls;

    // FIX 4: Guard against corrupt storage data
    if (!Array.isArray(downloadedUrls)) return;

    if (downloadedUrls.indexOf(bookmark.url) === -1) {
      downloadUrl(bookmark.url, function(success) {
        if (success) {
          // FIX 3: Only persist URL after confirming the download started
          // FIX 4: Enforce a storage cap
          const MAX_STORED = 10000;
          const updated = downloadedUrls.slice(-(MAX_STORED - 1));
          updated.push(bookmark.url);

          chrome.storage.local.set({ downloadedUrls: updated }, function() {
            if (chrome.runtime.lastError) {
              // FIX 3: Handle storage write errors
              console.error('Storage write error:', chrome.runtime.lastError.message);
            }
          });
        }
      });
    }
  });
});

function downloadUrl(url, callback) {
  // FIX 2 (partial): chrome.downloads is not available in a true SW context —
  // if using Manifest V3, this call must be offloaded to an offscreen document.
  chrome.downloads.download({ url: url }, function(downloadId) {
    if (chrome.runtime.lastError || downloadId === undefined) {
      // FIX 3: Handle download errors, do NOT mark as downloaded
      console.error('Download error:', chrome.runtime.lastError?.message);
      callback(false);
    } else {
      callback(true);
    }
  });
}