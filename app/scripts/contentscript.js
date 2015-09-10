'use strict';

/*
  Functionality
 */
var $ = jQuery;
$(document).ready(function () {
    var rektmarks_marks = [{
        id: '1',
        date: new Date(),
        title: 'test',
        description: 'test description',
        url: 'https://media.giphy.com/media/Br7B9CakrA1ig/giphy.gif'
    }];

    var contextMenuDetails = {
        "title": "Rektmark This",
        "contexts": ["page", "link", "image", /*"video",*/"browser_action", "page_action"],
        "onclick": handleContextMenuClick
    };

    /* Dom selectors */
    var $cards, $sidebar, $dropzone, $close, $newcardarea, $submit_new;

    function initialize() {
        var doEventBinding = false;

        //Inject the sidebar
        if (typeof $sidebar === 'undefined') {
            $(sideBarMarkup()).appendTo('body');
            $sidebar = $('#rektmarks_sidebar');
            $dropzone = $('#rektmarks_dropzone');
            doEventBinding = true;
        }

        if (typeof $close === 'undefined') {
            $close = $('#rektmarks_close');
        }

        if (typeof $newcardarea === 'undefined') {
            $newcardarea = $('#rektmarks_new_card_container');
        }

        if (typeof chrome['contextMenus'] !== 'undefined') {
            chrome.contextMenus.create(contextMenuDetails, function () {
                console.log('Added context menu');
            });
        }

        //Inject the cards
        if (typeof $cards === 'undefined') {
            $cards = $('#rektmarks_cards');
            clearCards($cards);
            injectCards($cards);
        }

        if (doEventBinding) {
            bindEvents();
        }
    }

    function validateCard(cardDetails) {
        //TODO: Write validation
    }

    function addCard(cardDetails) {
        /* Required */
        var url = cardDetails.url;
        /* Optional */
        var title = cardDetails.title;
        var description = cardDetails.description;
        var type = cardDetails.type;
        /* Generated */
        var id = psuedoUUID();
        var date = new Date();

        var card = {
            id: id,
            date: date,
            url: url,
            title: title,
            description: description,
            type: type
        };

        // Unshift so were added to the beginning
        rektmarks_marks.unshift(card);

        return card;
    }

    function insertNewCard(cardDetails) {
        var markup = cardMarkup(cardDetails);
        $cards.prepend(markup);
    }

    function injectCards($target) {
        rektmarks_marks.forEach(function (card, index) {
            var markup = cardMarkup(card);
            $(markup).appendTo($target);
        });
    }

    function clearCards($target) {
        $target.html('');
    }

    function bindEvents() {
        $dropzone.on('drop', function (event) {
            event.stopPropagation();
            event.preventDefault();
        });
        $dropzone.on('dragend drop', function (event) {
            hideDropArea();
            event.stopPropagation();
        });
        $dropzone.on('dragenter', function () {
            $dropzone.addClass('rektmarks_over');
        });
        $dropzone.on('dragleave dragend drop', function () {
            $dropzone.removeClass('rektmarks_over');
        });
        $dropzone.on('drop', function (event) {
            var src = event.originalEvent.dataTransfer.getData('application/json');
            src = JSON.parse(src);
            showNewCard(src);
        });
        $close.on('click', function () {
            hideSidebar();
        });
        $('body').on('dragstart', function (event) {
            var src = extractSource(event.target);

            showSidebar();
            showDropArea();

            event.originalEvent.dataTransfer.effectAllowed = 'all';
            event.originalEvent.dataTransfer.setData('application/json', JSON.stringify(src));
        });
    }

    function extractSource(target) {
        if (target.tagName == 'IMG') {
            return {
                type: 'IMG',
                src: target.src
            };
        }

        if (target.tagName == 'a') {
            return {
                type: 'a',
                src: target.href
            };
        }

        return false;
    }

    function showSidebar() {
        $sidebar.show();
    }

    function hideSidebar() {
        $sidebar.hide();
        hideNewCard();
    }

    function showDropArea() {
        $dropzone.show();
    }
    function hideDropArea() {
        $dropzone.hide();
    }
    function showNewCard(details) {

        var markup = newCardMarkup(details);
        $newcardarea.html(markup);

        $submit_new = $('#rektmarks_save');
        $submit_new.on('click', submitNewCard);
    }
    function hideNewCard() {
        $newcardarea.html('');
    }
    function submitNewCard() {
        var title = $('#rektmarks_new_title').val();
        var url = $('#rektmarks_new_src').attr('src');
        var description = $('#rektmarks_new_description').val();
        var type = $('#rektmarks_new_type').val();

        var newCard = addCard({
            url: url,
            title: title,
            description: description,
            type: type
        });
        hideNewCard();
        insertNewCard(newCard);
    }

    function handleContextMenuClick() {
        console.log('Menu clicked');
    }

    function psuedoUUID() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : r & 0x3 | 0x8).toString(16);
        });
        return uuid;
    }

    function sideBarMarkup() {
        return '\n            <div id="rektmarks_sidebar" style="display: none;">\n                <div id="rektmarks_dropzone"  ondragover="event.preventDefault()" style="display: none">Get Rekt</div>\n                <div id="rektmarks_close">X</div>\n                <h1>Rektmarks</h1>\n                <h4><a href="http://github.com/wesley-harding/rektmarks" target="_blank">Rek my source!</a></h4>\n                <input type="search" placeholder="Search (coming soon)">\n                <div id="rektmarks_new_card_container">\n                </div>\n                <hr>\n                <div id="rektmarks_cards">\n                    <h5>Whoops! You have no bookmarks</h5>\n                </div>\n            </div>\n        ';
    }

    function cardMarkup(cardDetails) {
        return '\n            <div class="rektmarks_card" data-rektmarks-id="' + cardDetails.id + '">\n                <h2 class="rektmarks_card_title">' + (cardDetails.title || '') + '</h2>\n                <div class="rektmarks_card_preview">\n                    <!-- TODO: Let\'s actually check if this is an image -->\n                    <a href="' + cardDetails.url + '" target="_blank">\n                        <img class="rektmarks_card_url" src="' + cardDetails.url + '" alt="Preview">\n                    </a>\n                </div>\n                <a class="rektmarks_card_src" href="' + cardDetails.url + '" target="_blank">' + cardDetails.url.substring(0, 40) + '</a>\n                <p class="rektmarks_card_description">' + cardDetails.description + '</p>\n                <span class="rektmarks_card_date">' + cardDetails.date + '</span>\n            </div>\n        ';
    }

    function newCardMarkup(cardDetails) {
        return '\n            <hr>\n            <div id="rektmarks_new_card">\n                <input id="rektmarks_new_title" type="text" placeholder="Name">\n                <img id="rektmarks_new_src" src="' + cardDetails.src + '" alt="Preview">\n                <textarea id="rektmarks_new_description" placeholder="Description"></textarea>\n                <input id="rektmarks_new_type" type="hidden" value="' + cardDetails.type + '">\n                <button id="rektmarks_save">Rekt It</button>\n            </div>\n        ';
    }

    /*
     Run
     */

    console.info('Loading Rektmarks');
    initialize();
});
//# sourceMappingURL=contentscript.js.map
