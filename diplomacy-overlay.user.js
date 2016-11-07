/*jshint multistr: true */

// ==UserScript==
// @name         Screeps diplomacy overlay
// @namespace    https://screeps.com/
// @version      0.2.1
// @author       James Cook
// @include      https://screeps.com/a/
// @run-at       document-ready
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @require      https://github.com/Esryok/screeps-browser-ext/raw/master/screeps-browser-core.js
// @downloadUrl  https://github.com/Esryok/screeps-browser-ext/raw/master/diplomacy-overlay.user.js
// ==/UserScript==

let colorMap = {
    2: [255, 150, 0],
    3: [255, 150, 0],
    w: [0, 0, 0],
    r: [60, 60, 60],
    pb: [255, 255, 255],
    m: [170, 170, 170],
    p: [0, 200, 255],
    k: [100, 0, 0],
    c: [80, 80, 80],
    s: [255, 242, 70]
};

function generateColor(hue, saturation, lightness) {
    for (let i = 0; i < 100; i++) {
        let color = hslToRGB(
            5 * Math.round(30 * Math.random() / 5) + hue,
            .1 * Math.round(.2 * Math.random() / .1) + saturation,
            .1 * Math.round(.2 * Math.random() / .1) + lightness
        );
        if (!_.some(colorMap, (existing) => _.eq(color)))
            return color;
    }
}

const userColor = [0, 255, 0];
const zombieColor = [128, 128, 128];
function hslToRGB(a, b, c) {
    0 > a && (a += 360);
    var d, e, f, g = (1 - Math.abs(2 * c - 1)) * b, h = a / 60, i = g * (1 - Math.abs(h % 2 - 1));
    void 0 === a || isNaN(a) || null === a ? d = e = f = 0 : h >= 0 && 1 > h ? (d = g,
    e = i,
    f = 0) : h >= 1 && 2 > h ? (d = i,
    e = g,
    f = 0) : h >= 2 && 3 > h ? (d = 0,
    e = g,
    f = i) : h >= 3 && 4 > h ? (d = 0,
    e = i,
    f = g) : h >= 4 && 5 > h ? (d = i,
    e = 0,
    f = g) : h >= 5 && 6 > h && (d = g,
    e = 0,
    f = i);
    var j, k, l, m = c - g / 2;
    return j = 255 * (d + m),
    k = 255 * (e + m),
    l = 255 * (f + m),
    j = Math.round(j),
    k = Math.round(k),
    l = Math.round(l),
    [j, k, l]
}

function generateAndSetColor(userid, userName) {
    let color;
    let diplomacyScore;
    if (diplomacyData.users && diplomacyData.users[userName]) {
        diplomacyScore = diplomacyData.users[userName].state;
    }

    switch (diplomacyScore) {
        case -1: color = generateColor(-15, .8, .4); break;
        case  1: color = generateColor(210, .8, .5); break;

        default:
        case  0: color = generateColor(40, .8, .35); break;
    }
    colorMap[userid] = color;

    return color;
}

function getColor(type) {
    let color = colorMap[type];
    if (!color) {
        let userMap = {};
        if (angular.element('.world-map').length) {
            let worldMap = angular.element('.world-map').scope().WorldMap;
            userMap = worldMap.roomUsers;
        } else {
            let room = angular.element('.room').scope().Room;
            userMap = room.users;
        }

        if (!userMap[type]) {
            return false;
        }

        let userName = userMap[type].username;
        color = generateAndSetColor(type, userName);
    }
    return color;
}

function colorPositions(image, positions, color, mapScale) {
    if (positions && positions.length) {
        for (var e = 0; mapScale > e; e++) {
            for (var f = 0; mapScale > f; f++) {
                positions.forEach(function(pos) {
                    image.data[50 * mapScale * (mapScale * pos[1] + f) * 4 + 4 * (mapScale * pos[0] + e) + 0] = color[0];
                    image.data[50 * mapScale * (mapScale * pos[1] + f) * 4 + 4 * (mapScale * pos[0] + e) + 1] = color[1];
                    image.data[50 * mapScale * (mapScale * pos[1] + f) * 4 + 4 * (mapScale * pos[0] + e) + 2] = color[2];
                    image.data[50 * mapScale * (mapScale * pos[1] + f) * 4 + 4 * (mapScale * pos[0] + e) + 3] = 255;
                });
            }
        }
    }
}

let diplomacyDataLoaded = false;
let diplomacyData;
function ensureDiplomacyData(callback) {
    ScreepsAdapter.Connection.getMemoryByPath(ScreepsAdapter.User._id, "diplomacy").then((data) => {
        diplomacyDataLoaded = true;
        if (!data) {
            console.log("No diplomacy data available");
        } else {
            diplomacyData = data;
            colorMap[ScreepsAdapter.User._id] = userColor;
        }
        callback();
    });
}

function prepareRoomObjects(scope, element, roomName, mapScale) {
    let graphics = element[0].getContext("2d");
    element[0].listenerEvent = ScreepsAdapter.Socket.bindEventToScope(scope, "roomMap2:" + roomName, function(objects) {
        let image = graphics.createImageData(50 * mapScale, 50 * mapScale);
        if (objects) {
            if (_.any(objects, (obj) => !getColor(obj.itemType)));
            _.forEach(objects, function(positions, itemType) {
                let color = getColor(itemType);
                if (!color) {
                    ScreepsAdapter.Api.get("user/find?id=" + itemType).then((data) => {
                        if (getColor(itemType)) return; // someone already loaded this

                        let userName = data.user.username;
                        generateAndSetColor(itemType, userName);
                    });
                    colorPositions(image, positions, zombieColor, mapScale);
                } else {
                    colorPositions(image, positions, color, mapScale);
                }
            });
        }
        graphics.putImageData(image, 0, 0);
    })

    element[0].roomName = roomName;
}

function recalculateWorldMapDiplomacyOverlay() {
    const content = `<canvas class='room-diplomacy-objects' height='150' width='150' map-scale='3'></canvas>`;
    
    let mapFloatElem = angular.element('.map-float-info');
    let mapContainerElem = angular.element('.map-container');
    let worldMap = mapContainerElem.scope().WorldMap;

    let mapSectors = $('.map-sector');
    for (let i = 0; i < mapSectors.length; i++) {
        let sectorElem = angular.element(mapSectors[i]);
        let scope = sectorElem.scope();
        let sector = scope.$parent.sector;

        let element = $(sectorElem).find('.room-diplomacy-objects');
        if (element.length) {
            if (element[0].roomName !== sector.name) {
                if (element[0].listenerEvent) {
                    element[0].listenerEvent.remove();
                    element[0].listenerEvent = null;
                }
                prepareRoomObjects(scope, element, sector.name, 3);
            }
        } else {
            // create a new div
            element = $(content).appendTo(sectorElem);
            prepareRoomObjects(scope, element, sector.name, 3);
        }
    }
}

let pendingWorldMapDiplomacyRedraws = 0;
function deferWorldMapDiplomacyRedraw() {
    let scope = angular.element(".map-container").scope();
    let worldMap = scope.WorldMap;
    
    $('.room-diplomacy-objects').hide();
    $('.room-diplomacy-objects').each((index, elem) => {
        if (elem.listenerEvent) elem.listenerEvent.remove();
        $(elem).remove();
    });
        
    if (diplomacyData && worldMap.zoom === 3 && worldMap.displayOptions.diplomacyUnits) { 
        pendingWorldMapDiplomacyRedraws++;
        setTimeout(() => {
            pendingWorldMapDiplomacyRedraws--;
            if (pendingWorldMapDiplomacyRedraws === 0) {
                recalculateWorldMapDiplomacyOverlay();
                $('.room-diplomacy-objects').show();
            }
        }, 500);
    }
}

function replaceUnitsToggle() {
    let content = `
        <md:button id="#diplomacy-units" app-stop-click-propagation app-stop-propagation='mouseout mouseover mousemove'
            class='md-raised btn-units' ng-if='WorldMap.zoom == 3'
            ng:class="{'md-primary': WorldMap.displayOptions.diplomacyUnits}"
            ng:click='WorldMap.toggleDiplomacyUnits()' tooltip-placement='bottom' tooltip='Toggle units'>
            <i class='fa fa-eye'></i>
        </md:button>`;

    if ($("#diplomacy-units").length)
        return;

    let mapContainerElem = angular.element('.map-container');
    let worldMap = mapContainerElem.scope().WorldMap;
    worldMap.displayOptions.units = false;
    worldMap.displayOptions.diplomacyUnits = localStorage.getItem("diplomacyUnits") !== "false";

    let compiledContent = DomHelper.generateCompiledElement(mapContainerElem, content);
    $(compiledContent).appendTo(mapContainerElem);

    worldMap.toggleDiplomacyUnits = function () {
        worldMap.displayOptions.diplomacyUnits = !worldMap.displayOptions.diplomacyUnits;
        localStorage.setItem("diplomacyUnits", worldMap.displayOptions.diplomacyUnits);
        deferWorldMapDiplomacyRedraw();
    };
}

function bindWorldMapStatsMonitor() {
    replaceUnitsToggle();

    let scope = angular.element(".map-container").scope();
    ensureDiplomacyData(() => {
        scope.$on("mapSectorsRecalced", deferWorldMapDiplomacyRedraw);
        scope.$on("mapStatsUpdated", deferWorldMapDiplomacyRedraw);
        deferWorldMapDiplomacyRedraw();
    });
}

function bindRoomStatsMonitor() {
    const content = `<canvas class='room-diplomacy-objects' height='50' width='50' map-scale='1'></canvas>`;
    $('.room-diplomacy-objects').remove();

    function deferredMinimapOverlay() {
        let minimapRoot = angular.element('.world-minimap');
        if (minimapRoot.length) {
            ensureDiplomacyData(() => {
                let roomOverlays = $('.world-minimap canvas.room-objects');
                for (let i = 0; i < roomOverlays.length; i++) {
                    let roomOverlayElem = angular.element(roomOverlays[i]);
                    let scope = roomOverlayElem.scope();
                    let roomName = $(roomOverlayElem).attr("app:game-map-room-objects");
                    
                    let element = $(roomOverlayElem).parent().find('.room-diplomacy-objects');
                    if (element.length) {
                        if (element[0].roomName !== roomName) {
                            if (element[0].listenerEvent) {
                                element[0].listenerEvent.remove();
                                element[0].listenerEvent = null;
                            }
                            prepareRoomObjects(scope, element, roomName, 1);
                        }
                    } else {
                        // create a new div
                        element = $(content).insertBefore(roomOverlayElem);
                        prepareRoomObjects(scope, element, roomName, 1);
                    }
                }
            });
        } else {
            setTimeout(deferredMinimapOverlay, 100);
        }
    }

    setTimeout(deferredMinimapOverlay, 100);
}

// Entry point
$(document).ready(() => {
    DomHelper.addStyle(`
        .room-objects { display: none; }
    `);

    ScreepsAdapter.onViewChange(function(view) {
        if (view === "worldMapEntered") {
            ScreepsAdapter.$timeout(bindWorldMapStatsMonitor);
        }
    });

    let $routeParams = angular.element(document.body).injector().get("$routeParams");
    let rootScope = angular.element(document.body).scope();
    rootScope.$watch(() => $routeParams.room, (newVal, oldVal) => {
        if (newVal) {
            ScreepsAdapter.$timeout(bindRoomStatsMonitor);
        }
    });
});