'use strict';

/*
  Functionality
 */
var $ = jQuery;
$(document ).ready(function(){
    var rektmarks_marks = [];

    var contextMenuDetails = {
        "title": "Rektmark This",
        "contexts": [
            "page", "link", "image", /*"video",*/ "browser_action", "page_action" ],
        "onclick": handleContextMenuClick
    };

    /* Dom selectors */
    var $cards, $sidebar, $dropzone, $close, $newcardarea, $submit_new;

    /* Other variables */
    var syncAvailable;

    function initialize() {
        var doEventBinding = false;

        //If chrome runtime is available
        syncAvailable = true;//typeof chrome[ 'runtime' ] !== 'undefined';

        //Inject the sidebar
        if(typeof $sidebar === 'undefined') {
            $( sideBarMarkup() ).appendTo( 'body' );
            $sidebar = $( '#rektmarks_sidebar' );
            $dropzone = $('#rektmarks_dropzone');
            doEventBinding = true;
        }


        if(typeof $close === 'undefined') {
            $close = $('#rektmarks_close');
        }

        if(typeof $newcardarea === 'undefined'){
            $newcardarea = $('#rektmarks_new_card_container')
        }

        if(typeof chrome['contextMenus'] !== 'undefined'){
            chrome.contextMenus.create(contextMenuDetails, function(){
                console.log('Added context menu');
            });
        }

        //Inject the cards
        if(typeof $cards === 'undefined') {
            $cards = $('#rektmarks_cards');

        }

        if( doEventBinding ){
            bindEvents();
        }

        syncCards( function () {
            console.log('Cards sync\'d injecting cards')
            clearCards( $cards );
            injectCards( $cards );
        } );
    }


    function validateCard(cardDetails) {
        //TODO: Write validation
    }

    /**
     * Creates a card
     * @param cardDetails
     * @param disableEvent disables sending an event to background script
     * @returns {{id: *, date: Date, url: *, title: *, description: (string|description|*|d|e|Document.description), type: *}}
     */
    function addCard(cardDetails, disableEvent){
        /* Required */
        var url = cardDetails.url;
        /* Optional */
        var title = cardDetails.title;
        var description = cardDetails.description;
        var type = cardDetails.type;
        /* Generated */
        var id = psuedoUUID();
        var date = (new Date()).toString();

        var card = {
            id,
            date,
            url,
            title,
            description,
            type
        };

        // Unshift so were added to the beginning
        rektmarks_marks.unshift(card);

        //Tell the Backend
        if(syncAvailable) {
            console.log('Sending Message');
            chrome.runtime.sendMessage( {
                action: 'addCard',
                data: {
                    card: card
                }
            }, function () {
                console.info( 'Rektmarks: Successfully Deleted mark' );
            } );
        }

        return card;
    }

    /**
     * Deletes a card
     * @param id  ID of the card to delete
     * @param disableEvent disables sending an event to background script
     */
    function deleteCard(id, disableEvent){
        var needleIndex;
        var deletedCard;

        rektmarks_marks.forEach(function(card,index) {
            var cardId = card.id;

            if(id == cardId) {
                needleIndex = index;
            }
        });

        if(needleIndex !== undefined){
            deletedCard = rektmarks_marks.splice(needleIndex, 1);

            if(deletedCard.length > 0) {
                deletedCard = deletedCard[0]; //We only care about the first element, so we'll extract it from the array
            } else {
                deletedCard = undefined;
            }

        }

        if(!disableEvent && syncAvailable) {
            //Tell the Backend
            chrome.runtime.sendMessage({
                action: 'deleteCard',
                data: {
                    cardId: id
                }
            }, function(){
                console.info('Rektmarks: Successfully Deleted mark');
            });
        }

        return deletedCard;
    }

    function syncCards(callback){
        console.log('Sync cards');

        if(!syncAvailable){
            return callback(rektmarks_marks);
        }
        chrome.runtime.sendMessage({
            action: 'syncCards'
        }, function(result){
            console.log('Sync Complete');
            if(result.data.cards.length > 0) {
                rektmarks_marks = result.data.cards;
            }
            callback(rektmarks_marks);
        });
    }

    function insertNewCard(cardDetails) {
        var markup = cardMarkup(cardDetails);
        $cards.prepend(markup);
    }

    function injectCards($target) {
        rektmarks_marks.forEach(function(card, index){
            var markup = cardMarkup(card);
            $(markup).appendTo($target);
        });
    }

    function clearCards($target) {
        $target.html('');
    }

    function bindEvents() {
        $dropzone.on('drop', function(event){
            event.stopPropagation();
            event.preventDefault();
        });
        $dropzone.on('dragend drop', function(event){
            hideDropArea();
            event.stopPropagation();
        });
        $dropzone.on('dragenter', function(){
            $dropzone.addClass('rektmarks_over');
        });
        $dropzone.on('dragleave dragend drop', function(){
            $dropzone.removeClass( 'rektmarks_over' );
        });
        $dropzone.on('drop', function(event){
            var src = event.originalEvent.dataTransfer.getData( 'application/json' );
            src = JSON.parse(src);
            showNewCard(src);
        });
        $close.on('click', function(){
            hideSidebar();
        });
        $( 'body' ).on( 'dragstart', function ( event ) {
            var src = extractSource(event.target);

            showSidebar();
            showDropArea();

            event.originalEvent.dataTransfer.effectAllowed = 'all';
            event.originalEvent.dataTransfer.setData( 'application/json',  JSON.stringify(src));
        } );

        $('#rektmarks_sidebar').on('click', '.rektmarks_card_delete', function(event){
            event.preventDefault();
            var cardId = $(this).data('rektmarks-id');
            var deletedCard = deleteCard(cardId);

            if(deletedCard) {
                clearCards( $cards );
                injectCards( $cards );
            }
        });

        if(syncAvailable){
            //Listen for messages passed from the backend
            chrome.runtime.onMessage.addListener(
                function ( request, sender, sendResponse ) {
                    console.log('Content script received message');
                    console.info(request);
                    if(request.action == 'deleteCard') {
                        var cardId = request.data.cardId;
                        var cards = request.data.cards;

                        if(cardId) {
                            deleteCard(cardId, true);
                            clearCards( $cards );
                            injectCards( $cards );
                        }

                    } else if (request.action == 'addCard'){
                        var card = request.data.card;
                        var cards = request.data.cards;
                        if(card){
                            addCard(card, true);
                            clearCards( $cards );
                            injectCards( $cards );
                        }
                    } else if(request.action == 'syncCards'){
                        var cards = request.data.cards;
                        rektmarks_marks = cards;
                        clearCards( $cards );
                        injectCards( $cards );
                    }
                }
            );
        }
    }

    function extractSource(target) {
        if(target.tagName == 'IMG') {
            return {
                type: 'IMG',
                src: target.src
            };
        }

        if(target.tagName == 'a') {
            return {
                type: 'a',
                src: target.href
            }
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

    function showDropArea(){
        $dropzone.show();
    }
    function hideDropArea(){
        $dropzone.hide();
    }
    function showNewCard(details){

        var markup = newCardMarkup(details);
        $newcardarea.html(markup);

        $submit_new = $( '#rektmarks_save' );
        $submit_new.on('click', submitNewCard);
    }
    function hideNewCard(){
        $newcardarea.html('');
    }
    function submitNewCard() {
        var title = $('#rektmarks_new_title').val();
        var url = $('#rektmarks_new_src').attr('src');
        var description = $('#rektmarks_new_description').val();
        var type = $('#rektmarks_new_type').val();

        console.log('Saving new card');

        var newCard = addCard( {
            url,
            title,
            description,
            type
        } );
        hideNewCard();
        insertNewCard( newCard );
    }

    function handleContextMenuClick(){
        console.log('Menu clicked');
    }

    function psuedoUUID() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace( /[xy]/g, function ( c ) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor( d / 16 );
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString( 16 );
        } );
        return uuid;
    }

    function sideBarMarkup() {
        return `
            <div id="rektmarks_sidebar" style="display: none;">
                <div id="rektmarks_dropzone"  ondragover="event.preventDefault()" style="display: none">Get Rekt</div>
                <div id="rektmarks_close">X</div>
                <div id="rektmarks_header">
                    <h2 id="rektmarks_main_title">Rektmarks</h2>
                    <span id="rektmarks_rekt_source"><a href="http://github.com/wesley-harding/rektmarks" target="_blank">Rek my source!</a></span>
                    <input id="rektmarks_search" type="search" placeholder="Search (coming soon)">
                    <div id="rektmarks_new_card_container">
                    </div>
                    <hr>
                    <h2>Your Rektmarks</h2>
                </div>
                <div id="rektmarks_cards">
                    <!--<h5>Whoops! You have no bookmarks</h5>-->
                </div>
            </div>
        `;
    }

    function cardMarkup(cardDetails) {
        return `
            <div class="rektmarks_card" data-rektmarks-id="${cardDetails.id}">
                <h3 class="rektmarks_card_title">${cardDetails.title || ''}</h3>
                <div class="rektmarks_card_preview">
                    <!-- TODO: Let's actually check if this is an image -->
                    <a href="${cardDetails.url}" target="_blank">
                        <img class="rektmarks_card_url" src="${cardDetails.url}" alt="Preview">
                    </a>
                </div>
                <a class="rektmarks_card_src" href="${cardDetails.url}" target="_blank">${cardDetails.url.substring(0, 40)}</a>
                <p class="rektmarks_card_description">${cardDetails.description || ''}</p>
                <span class="rektmarks_card_date">${cardDetails.date}</span>
                <br>
                <a href="#" class="rektmarks_card_delete" data-rektmarks-id="${cardDetails.id}">Delete</a>
            </div>
        `;
    }

    function newCardMarkup(cardDetails){
        return `
            <h3 id="rektmarks_new_copy">Rek Something</h3>
            <div id="rektmarks_new_card">
                <input id="rektmarks_new_title" type="text" placeholder="Name">
                <img id="rektmarks_new_src" src="${cardDetails.src}" alt="Preview">
                <textarea id="rektmarks_new_description" placeholder="Description"></textarea>
                <input id="rektmarks_new_type" type="hidden" value="${cardDetails.type}">
                <button id="rektmarks_save">Rekt It</button>
            </div>
        `;
    }

    /*
     Run
     */


    console.info( 'Loading Rektmarks' );
    initialize();
});
