window.addEventListener('DOMContentLoaded', (event) => {
  // Paypal code
  document.getElementById('donate-button').addEventListener('click', () => {
    const paypalUrl = "https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=brocksprogramming@gmail.com&item_name=Support+Chrome+Bookmarked+Website+Downloader&currency_code=USD";
    
    // Open the donation page in a new tab
    chrome.tabs.create({ url: paypalUrl });
});
  // Only allow http/https URLs for downloading
  function isSafeUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch (e) {
      return false;
    }
  }

  // Builds a single bookmark row using Bootstrap 5.3.3 input-group markup.
  // Bootstrap 5 removed input-group-prepend/append — input-group-text is now
  // placed directly inside input-group with no extra wrapper div.
  function buildBookmarkRow(url, title, isChecked) {
    const wrapper = $('<div class="input-group mb-3"></div>');

    // BS5: input-group-text goes directly in input-group (no prepend wrapper)
    const inputText = $('<span class="input-group-text"></span>');
    const checkbox  = $('<input type="checkbox" aria-label="Checkbox for following text input">');

    checkbox.val(url);
    if (isChecked) {
      checkbox.prop('checked', true);
      checkbox.prop('disabled', true);
    }

    // FIX: style="width:500px" removed — width now comes from .bookmark-title in popup.css
    const textInput = $(
      '<input type="text" aria-label="Text input with checkbox" ' +
      'readonly="readonly" class="form-control bookmark-title">'
    );
    textInput.val(title); // .val() is XSS-safe

    inputText.append(checkbox);
    wrapper.append(inputText).append(textInput);
    return wrapper;
  }

  function addBookmarks() {
    chrome.storage.local.get("downloadedUrls", function (result) {
      const downloadedUrls = Array.isArray(result.downloadedUrls) ? result.downloadedUrls : [];
      chrome.bookmarks.getTree(function(bookmarkTreeNodes) {
        const list = $('#bookmarks');
        for (let i = 0; i < bookmarkTreeNodes.length; i++) {
          addBookmarkNode(bookmarkTreeNodes[i], list, downloadedUrls);
        }
      });
    });
  }

  function addBookmarkNode(node, list, downloadedUrls) {
    if (node.title && !node.children) {
      if (!isSafeUrl(node.url)) return;
      const isChecked = downloadedUrls.includes(node.url);
      list.append(buildBookmarkRow(node.url, node.title, isChecked));
    } else if (node.children && node.children.length > 0) {
      for (let i = 0; i < node.children.length; i++) {
        addBookmarkNode(node.children[i], list, downloadedUrls);
      }
    }
  }

  $('#selectall').click(function() {
    $(":checkbox:not(:disabled)").prop("checked", true);
  });

  $('#unselectall').click(function() {
    $(":checkbox:not(:disabled)").prop("checked", false);
  });

  $('#getbookmarks').click(function() {
    setTimeout(downloadBookmarks, 1000);
  });

  function areThereChildren(nodes, list, downloadedUrls) {
    for (let i = 0; i < nodes.length; i++) {
      if (Object.hasOwn(nodes[i], 'title') && !Object.hasOwn(nodes[i], 'children')) {
        if (nodes[i].title.length > 0 && isSafeUrl(nodes[i].url)) {
          const isChecked = downloadedUrls.includes(nodes[i].url);
          list.append(buildBookmarkRow(nodes[i].url, nodes[i].title, isChecked));
        }
      }
      if (Object.hasOwn(nodes[i], 'children')) {
        areThereChildren(nodes[i].children, list, downloadedUrls);
      }
    }
  }

  function downloadBookmarks() {
    chrome.storage.local.get("downloadedUrls", function (result) {
      const downloadedUrls = Array.isArray(result.downloadedUrls) ? result.downloadedUrls : [];
      const checkedBookmarks = [];

      $("input[type='checkbox']").each(function() {
        const is_checked  = $(this).is(':checked');
        const is_disabled = $(this).is(':disabled');
        const url         = $(this).val();

        if (is_checked && !is_disabled && !downloadedUrls.includes(url)) {
          if (isSafeUrl(url)) {
            chrome.downloads.download({ url: url });
            checkedBookmarks.push(url);
          } else {
            console.warn("Skipped unsafe URL: " + url);
          }
        }
      });

      chrome.storage.local.set({ 'downloadedUrls': downloadedUrls.concat(checkedBookmarks) });
    });
  }

  addBookmarks();
});

