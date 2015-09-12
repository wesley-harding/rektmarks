'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

chrome.browserAction.setBadgeText({text: '\'Allo'});

console.log('\'Allo \'Allo! Event Page for Browser Action. Test');

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse){
        console.log('received message' +  request.action);
        if(request.action == 'deleteCard') {
            return deleteCard(request, sender, sendResponse);
        } else if(request.action == 'addCard') {
            return addCard(request, sender, sendResponse);
        } else if (request.action == 'syncCards') {
            return syncCards(request, sender, sendResponse);
        }
    }
);

function deleteCard(request, sender, sendResponse){
    chrome.storage.sync.get('cards', function(result){
        var cards = result['cards'] || [];
        var needleId = request.data.cardId;
        var foundCardIndex;
        var deletedCard;

        if(needleId) {
            cards.forEach(function(card, index){
                if(card.id == needleId) {
                    console.log("Found Card");
                    foundCardIndex = index;
                }
            });

            if(foundCardIndex){
                deletedCard = cards.splice(foundCardIndex,1);

                if(deletedCard.length > 0) {
                    deletedCard = deletedCard[0];
                } else {
                    deletedCard = undefined;
                }

            }
        }

        if(deletedCard) {
            console.log('Found card. Now deleting');
            chrome.storage.sync.set( {
                cards
            }, function () {
                sendResponse({
                    response: 'deleteCard',
                    data: {
                        deletedCard: deletedCard,
                        cards: cards
                    }
                });
            } );
        } else {
            sendResponse({
                response: 'deleteCard',
                data: {
                    deletedCard: undefined,
                    cards: cards
                }
            });
        }


    });
    return true;
}

function addCard(request, sender, sendResponse) {
    chrome.storage.sync.get( 'cards', function ( result ) {
        var cards = result[ 'cards' ] || [];
        var card = request.data.card;

        if(card) {
            cards.unshift(card);

            chrome.storage.sync.set({
                cards
            }, function(){
               sendResponse({
                   response: 'addCard',
                   data: {
                       card,
                       cards
                   }
               })
            });

        } else {
            sendResponse({
                response: 'addCard',
                data: {
                    addedCard: undefined,
                    cards: cards
                }
            })
        }

    });

    return true;
}

function syncCards(request, sender, sendResponse) {
    console.log('Syncing chards');
    chrome.storage.sync.get('cards', function(result){
        var cards = result['cards'] || [];
        console.log( 'send sync response' );
        console.info(cards);
        console.info(result);

        sendResponse({
            response: 'syncCards',
            data: {
                cards
            }
        });
    });
    return true;
}
