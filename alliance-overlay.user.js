/*jshint multistr: true */

// ==UserScript==
// @name         Screeps alliance overlay
// @namespace    https://screeps.com/
// @version      0.1
// @author       James Cook
// @match        https://screeps.com/a/
// @run-at       document-ready
// @grant        GM_xmlhttpRequest
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @connect      www.leagueofautomatednations.com
// ==/UserScript==

const loanBaseUrl = "http://www.leagueofautomatednations.com";

let allianceData;
let userAlliance;
function getAllianceLogo(allianceKey) {
    let data = allianceData[allianceKey];
    if (data) {
        return loanBaseUrl + "/obj/" + data.logo;
    }
}

// query for alliance data from the LOAN site
function ensureAllianceData(callback) {
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
    });
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

// Entry point
$(document).ready(() => {
    let app = angular.element(document.body);
    let tutorial = app.injector().get("Tutorial");
    let $timeout = angular.element('body').injector().get('$timeout');

    // intercept viewer state changes
    tutorial._trigger = tutorial.trigger;
    tutorial.trigger = function(triggerName, unknownB) {
        if (triggerName === "worldMapEntered") {
            $timeout(()=>{
                bindAllianceSetting();
                addAllianceToggle();
                addAllianceToInfoOverlay();
            });
        }
        tutorial._trigger(triggerName, unknownB);
    };
});