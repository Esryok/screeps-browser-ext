/*jshint multistr: true */

// ==UserScript==
// @name         Screeps alliance overlay
// @namespace    https://screeps.com/
// @version      0.2.5
// @author       James Cook
// @include      https://screeps.com/a/
// @run-at       document-ready
// @downloadUrl  https://raw.githubusercontent.com/Esryok/screeps-browser-ext/master/alliance-overlay.user.js
// @grant        GM_xmlhttpRequest
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @connect      www.leagueofautomatednations.com
// ==/UserScript==

// Need to find some way to lock down these colors & permanently synchronize with LOAN. Store in DB?
/* Palette configuration (http://jnnnnn.github.io/category-colors-constrained.html):
    function constraint(lab) {
        var noviceHcl = d3.hcl("#385A3A");
        var hcl = d3.hcl(lab);

        var avoidNovice = Math.abs(hcl.h - noviceHcl.h) > 40 || Math.abs(hcl.c - noviceHcl.c) > 60;//lab_dist(lab, d3.lab("#385A3A")) > 60;
        var colorful = hcl.c > 50;
        var bright = hcl.l > 50;
        return avoidNovice && colorful && bright;
    }
*/
const DEFAULT_COLORS = ["#0a72ff", "#08acfd", "#ff1902", "#0ffffb", "#827c01", "#fe07a6", "#fcff04", "#c602fe", "#fd8583", "#f2aafe", "#ff9801", "#1eff06", "#07a202", "#ff0258", "#adfe58", "#c1528c", "#17fd88", "#b36627", "#e1bf1b", "#7c6dc3", "#ffbc6f", "#da452f", "#fe26e5", "#8858fe", "#fe72d8", "#fe4c8d", "#f86506", "#a57fff", "#c18908", "#0582eb", "#41e43e", "#b6d304", "#fff793", "#ff884f", "#beba49", "#ba67bf", "#fff95f", "#d84357", "#ff8fc9", "#8efd02", "#d451fe", "#75c208", "#c25a47", "#8fa3ff", "#e586fe", "#d726b5", "#c8fe0a", "#f51231", "#d26e04", "#ee6f92", "#ff68f7", "#ffd564", "#d73697", "#bb9a41", "#ffb63b", "#ba93f6", "#ffe310", "#e29140", "#6172e4", "#b19b03", "#fe725f", "#f701ff", "#ff4b55", "#ff4f2b", ]

const loanBaseUrl = "http://www.leagueofautomatednations.com";

let allianceData;
let userAlliance;
function getAllianceLogo(allianceKey) {
    let data = allianceData[allianceKey];
    if (data) {
        return loanBaseUrl + "/obj/" + data.logo;
    }
}

function getAllianceColor(allianceKey) {
    let keys = Object.keys(allianceData);
    return DEFAULT_COLORS[keys.indexOf(allianceKey)];
}

// query for alliance data from the LOAN site
function ensureAllianceData(callback) {
    if (allianceData) {
        if (callback) callback();
        return;
    }

    GM_xmlhttpRequest({
        method: "GET",
        url: (loanBaseUrl + "/alliances.js"),
        onload: function(response) {
            allianceData = JSON.parse(response.responseText);
            userAlliance = {};

            for (let allianceKey in allianceData) {
                let alliance = allianceData[allianceKey];
                for (let userIndex in alliance.members) {
                    let userName = alliance.members[userIndex];
                    userAlliance[userName] = allianceKey;
                }
            }

            console.log("Alliance data loaded from LOAN.");
            if (callback) callback();
        }
    });
}

// Stuff references to the alliance data in the world map object. Not clear whether this is actually doing useful things.
function exposeAllianceDataForAngular() {
    let app = angular.element(document.body);
    let $timeout = angular.element('body').injector().get('$timeout');

    $timeout(()=>{
        let worldMapElem = angular.element($('.world-map'));
        let worldMap = worldMapElem.scope().WorldMap;

        worldMap.allianceData = allianceData;
        worldMap.userAlliance = userAlliance;

        recalculateAllianceOverlay();
    });

    for (let allianceKey in allianceData) {
        addStyle(".alliance-" + allianceKey + " { background-color: " + getAllianceColor(allianceKey) + " }");
        addStyle(".alliance-logo-3.alliance-" + allianceKey + " { background-image: url('" + getAllianceLogo(allianceKey) + "') }");
    }
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

function generateCompiledElement(parent, content) {
    let $scope = parent.scope();
    let $compile = parent.injector().get("$compile");

    return $compile(content)($scope);
}

// Bind the WorldMap alliance display option to the localStorage value
function bindAllianceSetting() {
    let alliancesEnabled = localStorage.getItem("alliancesEnabled") === "true";
    let worldMapElem = angular.element($('.world-map'));
    let worldMap = worldMapElem.scope().WorldMap;
    worldMap.displayOptions.alliances = alliancesEnabled;

    worldMap.toggleAlliances = function () {
        worldMap.displayOptions.alliances = !worldMap.displayOptions.alliances;
        localStorage.setItem("alliancesEnabled", worldMap.displayOptions.alliances);

        if (worldMap.displayOptions.alliances && !worldMap.userAlliances) {
            ensureAllianceData(exposeAllianceDataForAngular);
        } else {
            $('.alliance-logo').remove();
        }
    };

    worldMap.getAllianceName = function (userId) {
        if (!worldMap.userAlliance) return "Loading...";

        let userName = this.roomUsers[userId].username;
        let allianceKey = worldMap.userAlliance[userName];
        if (!allianceKey) return "None";

        return this.allianceData[allianceKey].name;
    };

    if (alliancesEnabled) {
        ensureAllianceData(exposeAllianceDataForAngular);
        recalculateAllianceOverlay();
    }
}

// insert the alliance toggle into the map container layer
function addAllianceToggle() {
    let content = "\
        <md:button \
            app-stop-click-propagation app-stop-propagation='mouseout mouseover mousemove' \
            class='md-raised btn-units alliance-toggle' ng:class=\"{'md-primary': WorldMap.displayOptions.alliances, 'solitary': WorldMap.zoom !== 3}\" \
            ng:click='WorldMap.toggleAlliances()' \
            tooltip-placement='bottom' tooltip='Toggle alliances'>\
                <span>&#9733;</span>\
        </md:button>";

    addStyle("\
        section.world-map .map-container .btn-units.alliance-toggle { right: 50px; font-size: 16px; padding: 4px; } \
        section.world-map .map-container .btn-units.alliance-toggle.solitary { right: 10px; } \
        section.world-map .map-container .layer-select { right: 90px; } \
    ");

    let mapContainerElem = angular.element($('.map-container'));
    let compiledContent = generateCompiledElement(mapContainerElem, content);
    $(compiledContent).appendTo(mapContainerElem);
}

// Add an "alliance" row to the room info overlay
function addAllianceToInfoOverlay() {
    let content = "\
        <div class='owner' ng:if='WorldMap.displayOptions.alliances && WorldMap.roomStats[MapFloatInfo.float.roomName].own'>\
            <label>Alliance:</label>\
            <span>\
                {{WorldMap.getAllianceName(WorldMap.roomStats[MapFloatInfo.float.roomName].own.user)}}\
            </span>\
        </div>";

    let mapFloatElem = angular.element($('.map-float-info'));
    let compiledContent = generateCompiledElement(mapFloatElem, content);
    $(compiledContent).insertAfter($(mapFloatElem).children('.owner')[0]);
}

function recalculateAllianceOverlay() {
    let mapContainerElem = angular.element(".map-container");
    let scope = mapContainerElem.scope();
    let worldMap = scope.WorldMap;
    if (!worldMap.displayOptions.alliances || !worldMap.allianceData) return;

    function drawRoomAllianceOverlay(roomName, left, top) {
        let roomDiv = $('<div class="alliance-logo" id="' + roomName + '"></div>');
        let roomStats = worldMap.roomStats[roomName];
        if (roomStats && roomStats.own) {
            let userName = worldMap.roomUsers[roomStats.own.user].username;
            let allianceKey = worldMap.userAlliance[userName];
            if (allianceKey) {
                $(roomDiv).addClass('alliance-' + allianceKey);

                $(roomDiv).removeClass("alliance-logo-1 alliance-logo-2 alliance-logo-3");
                $(roomDiv).css('left', left);
                $(roomDiv).css('top', top);
                $(roomDiv).addClass("alliance-logo-" + worldMap.zoom);

                $(mapContainerElem).append(roomDiv);
            }
        }
    }

    let $location = mapContainerElem.injector().get("$location");
    if ($location.search().pos) {
        let roomPixels;
        let roomsPerSectorEdge;
        switch (worldMap.zoom) {
            case 1: { roomPixels = 20;  roomsPerSectorEdge = 10; break; }
            case 2: { roomPixels = 50;  roomsPerSectorEdge =  4; break; }
            case 3: { roomPixels = 150; roomsPerSectorEdge =  1; break; }
        }

        let posStr = $location.search().pos;
        if (!posStr) return;

        //if (worldMap.zoom !== 3) return; // Alliance images are pretty ugly at high zoom.

        for (var u = 0; u < worldMap.sectors.length; u++) {
            let sector = worldMap.sectors[u];
            if (!sector || !sector.pos) continue;

            if (worldMap.zoom === 3) {
                // we're at zoom level 3, only render one room
                drawRoomAllianceOverlay(sector.name, sector.left, sector.top);
            } else if (sector.rooms) {
                // high zoom, render a bunch of rooms
                let rooms = sector.rooms.split(",");
                for (let x = 0; x < roomsPerSectorEdge; x++) {
                    for (let y = 0; y < roomsPerSectorEdge; y++) {
                        let roomName = rooms[x * roomsPerSectorEdge + y];
                        drawRoomAllianceOverlay(
                            roomName,
                            sector.left + x * roomPixels,
                            sector.top + y * roomPixels);
                    }
                }
            }
        }
    }
}

let pendingRedraws = 0;
function addSectorAllianceOverlay() {
    addStyle("\
        .alliance-logo { position: absolute; z-index: 2; opacity: 0.4 }\
        .alliance-logo-1 { width: 20px; height: 20px; }\
        .alliance-logo-2 { width: 50px; height: 50px; }\
        .alliance-logo-3 { width: 50px; height: 50px; background-size: 50px 50px; opacity: 0.8 }\
    ");

    let mapContainerElem = angular.element(".map-container");
    let scope = mapContainerElem.scope();

    let deferRecalculation = function () {
        // remove alliance logos during redraws
        $('.alliance-logo').remove();

        pendingRedraws++;
        setTimeout(() => {
            pendingRedraws--;
            if (pendingRedraws === 0) {
                recalculateAllianceOverlay();
            }
        }, 500);
    }
    scope.$on("mapSectorsRecalced", deferRecalculation);
    scope.$on("mapStatsUpdated", deferRecalculation);
}

function addAllianceColumnToLeaderboard() {
    function deferredLeaderboardLoad() {
        let leaderboardScope = angular.element('.leaderboard table').scope();
        if (leaderboardScope) {
            let rows = angular.element('.leaderboard table tr')
            let leaderboard = leaderboardScope.$parent.LeaderboardList;

            let $timeout = angular.element('body').injector().get('$timeout');
            
            ensureAllianceData(() => {
                for (let i = 0; i < rows.length; i++) {
                    if (i === 0) {
                        let playerElem = $(rows[i]).children('th:nth-child(2)');
                        $("<th class='alliance-leaderboard'>Alliance</th>").insertAfter(playerElem);
                    } else {
                        let playerElem = $(rows[i]).children('td:nth-child(2)');
                        let userId = leaderboard.list[i - 1].user;
                        let userName = leaderboard.users[userId].username;
                        let allianceKey = userAlliance[userName];
                        let allianceName = (allianceKey ? allianceData[allianceKey].name : "");
                        
                        $("<td class='alliance-leaderboard'>" + allianceName +" </td>").insertAfter(playerElem);
                    }
                }
            });
        } else {
            setTimeout(deferredLeaderboardLoad, 100);
        }
    }

    setTimeout(deferredLeaderboardLoad, 100);
}

// Entry point
$(document).ready(() => {
    let app = angular.element(document.body);
    let tutorial = app.injector().get("Tutorial");
    let $timeout = angular.element('body').injector().get('$timeout');

    // intercept viewer state changes
    tutorial._trigger = tutorial.trigger;
    tutorial.trigger = function(triggerName, unknownB) {
        console.log("Alliance overlay trigger override", triggerName)
        if (triggerName === "worldMapEntered") {
            $timeout(()=>{
                bindAllianceSetting();
                addAllianceToggle();
                addAllianceToInfoOverlay();

                addSectorAllianceOverlay();
            });
        }
        tutorial._trigger(triggerName, unknownB);
    };

    let lastHash;
    let lastSearch;
    app.scope().$on("routeSegmentChange", function() {
        if (window.location.hash && window.location.hash !== lastHash) {
            var match = window.location.hash.match(/#!\/(.+?)\//);
            if (match && match.length > 1 && match[1] === "rank") {
                let search = app.injector().get("$location").search();
                if (search.page) addAllianceColumnToLeaderboard();
            }
        }

        lastHash = window.location.hash;
    });
});