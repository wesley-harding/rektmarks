'use strict';

console.log('\'Allo \'Allo! Popup');

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    console.log(tabs);
    chrome.tabs.sendMessage(tabs[0]['id'], {
        action: 'showSideBar'
    });
});
//# sourceMappingURL=popup.js.map
