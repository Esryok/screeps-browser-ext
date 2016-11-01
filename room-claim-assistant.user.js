/*jshint multistr: true */

// ==UserScript==
// @name         Screeps room claim assistant
// @namespace    https://screeps.com/
// @version      0.1.1
// @author       James Cook
// @include      https://screeps.com/a/
// @run-at       document-ready
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @downloadUrl  https://github.com/Esryok/screeps-browser-ext/raw/master/room-claim-assistant.user.js
// ==/UserScript==

function generateCompiledElement(parent, content) {
    let $scope = parent.scope();
    let $compile = parent.injector().get("$compile");

    return $compile(content)($scope);
}

// inject a new CSS style
function addStyle(css) {
    let head = document.head;
    if (!head) return;

    let style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;

    head.appendChild(style);
}

let socket;
let roomObjectCounts = {};
function getRoomObjectCounts(roomName, callback) {
    let scope = angular.element(document.body).scope();
    if (roomObjectCounts[roomName]) {
        callback(roomObjectCounts[roomName]);
    } else {
        //console.log("Bind socket event", roomName)
        let eventFunc = socket.bindEventToScope(scope, "roomMap2:" + roomName, function(objectCounts) {
            roomObjectCounts[roomName] = objectCounts;
            eventFunc.remove();
            // console.log("Data loaded", roomName);
            callback(objectCounts);
        });
    }
}

var interceptingApiPost = false;
function interceptClaim0StatsRequest() {
    if (interceptingApiPost) return;
    interceptingApiPost = true;

    let api = angular.element(document.body).injector().get('Api');
    let post = api.post;
    api.post = (uri, body) => {
        //console.log("interceptClaim0StatsRequest", uri, body);
        if (uri === "game/map-stats" && body.statName === "claim0") {
            body.statName = "minerals0";
        }
        return post(uri, body);
    }
}

function recalculateClaimOverlay() {
    // $(".room-prohibited").hide();

    // console.log("recalculateClaimOverlay");
    let user = angular.element(document.body).scope().Me();
    let mapContainerElem = angular.element($('.map-container'));
    let worldMap = mapContainerElem.scope().WorldMap;

    for (let i in worldMap.sectors) {
        let sector = worldMap.sectors[i];
        if (sector.name) {
            let objectsDiv = $(mapContainerElem).find(`[app\\:game-map-room-objects=${sector.name}]`);
            if (objectsDiv.length) {
                let roomName = sector.name;
                let sectorDiv = angular.element($(objectsDiv).parent());
                let roomStats = worldMap.roomStats[roomName];
                if (!roomStats || roomStats.status === "out of borders") continue; // can't get the room objects for this, don't bother

                getRoomObjectCounts(roomName, (counts) => {
                    if (!counts) return;
                    if (!counts.s) {
                        console.log("Bad object list for". roomName, counts)
                        return;
                    }

                    let userOwned = (roomStats.own && roomStats.own.user === user._id);
                    
                    // show minerals if:
                    let showMinerals =
                        (userOwned && roomStats.own.level > 0) || //  user has claimed it OR
                        counts.s.length > 1; // it has 2+ sources
                    
                    let state = "not-recommended";
                    if (userOwned && roomStats.own.level > 0) {
                        state = "owned";
                    } else if (roomStats.own && !userOwned) {
                        state = "prohibited";
                    } else if (counts.c.length === 0) {
                        state = "unclaimable";
                    } else if (counts.s.length >= 2 &&
                        (!roomStats.own || (userOwned && roomStats.own.level === 0))) {
                        // recommend if it has two sources and a controller, nobody else owns it,
                        // and user hasn't already claimed
                        state = "recommended";
                    }

                    let claimAssistDiv = $(sectorDiv).find('.claim-assist');
                    if (!claimAssistDiv.length) {
                        claimAssistDiv = $("<div></div>");
                        $(sectorDiv).append(claimAssistDiv);
                    }

                    let claimRoom = $(claimAssistDiv).attr("room");
                    if (claimRoom !== roomName) {
                        if (showMinerals && roomStats.minerals0) {
                            claimAssistDiv.html(`
                                <div class='room-mineral-type room-mineral-type-${roomStats.minerals0.type} room-mineral-density-${roomStats.minerals0.density}'>
                                    ${roomStats.minerals0.type}
                                </div>`);
                        } else {
                            claimAssistDiv.html('');
                        }

                        claimAssistDiv.attr("class", `room-stats claim-assist ${state}`);
                    }

                    $(claimAssistDiv).attr("room", roomName);
                });
            }
        }
    }
}

var pendingClaimRedraws = 0;
function bindMapStatsMonitor() {
    let mapContainerElem = angular.element(".map-container");
    let scope = mapContainerElem.scope();
    let worldMap = scope.WorldMap;

    let deferRecalculation = function () {
        if (worldMap.displayOptions.layer === "claim0") {
            if (worldMap.zoom === 3) {
                $('.claim-assist').hide();
                pendingClaimRedraws++;
                setTimeout(() => {
                    pendingClaimRedraws--;
                    if (pendingClaimRedraws === 0) {
                        recalculateClaimOverlay();
                        $('.claim-assist').show();
                    }
                }, 500);
            }
        } else {
            $('.claim-assist').remove();
        }
    }
    scope.$on("mapSectorsRecalced", deferRecalculation);
    scope.$on("mapStatsUpdated", deferRecalculation);
}

// Entry point
$(document).ready(() => {
    addStyle(`
        .claim-assist { pointer-events: none; }
        .claim-assist.not-recommended { background: rgba(192, 192, 50, 0.3); }
        .claim-assist.recommended { background: rgba(25, 255, 25, 0.2); }
        .claim-assist.owned { background: rgba(50, 50, 255, 0.2); }
        .claim-assist.prohibited { background: rgba(255, 50, 50, 0.2); }
        .room-prohibited { display: none; }
    `);

    let app = angular.element(document.body);
    let tutorial = app.injector().get("Tutorial");
    let $timeout = angular.element('body').injector().get('$timeout');
    
    socket = app.injector().get('Socket');

    // intercept viewer state changes
    var originalTutorialTrigger = tutorial.trigger;
    tutorial.trigger = function(triggerName, unknownB) {
        // console.log("Room claim assistant trigger override", triggerName)
        if (triggerName === "worldMapEntered") {
            interceptClaim0StatsRequest();
            $timeout(()=>{
                bindMapStatsMonitor();
            });
        }
        originalTutorialTrigger(triggerName, unknownB);
    };
});