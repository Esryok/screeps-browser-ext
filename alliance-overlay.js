/*jshint multistr: true */

// ==UserScript==
// @name         Screeps alliance overlay
// @namespace    https://screeps.com/
// @version      0.1
// @author       James Cook
// @match        https://screeps.com/a/
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @connect      www.leagueofautomatednations.com
// ==/UserScript==

const loanBaseUrl = "http://www.leagueofautomatednations.com";

let allianceData;
function getAllianceLogo(allianceName) {
    let data = allianceData[allianceName];
    if (data) {
        return loanBaseUrl + "/obj/" + data.logo;
    }
}

function exposeAllianceDataForAngular() {
    let worldMapElem = angular.element($('.world-map'));
    let worldMap = worldMapElem.scope().WorldMap;
    
    let userAlliance = {};
    for (let allianceName in allianceData) {
        let alliance = allianceData[allianceName];
        for (let userIndex in alliance.members) {
            let userName = alliance.members[userIndex];
            userAlliance[userName] = allianceName;
        }
    }
    
    worldMap.allianceData = allianceData;
    worldMap.userAlliance = userAlliance;
}

function addAllianceToggle() {
    var html = "\
<md:button \
app-stop-click-propagation app-stop-propagation='mouseout mouseover mousemove' \
class='md-raised btn-units' ng:class=\"{'md-primary': WorldMap.displayOptions.units}\" \
ng:click='alert(\"hi\")' \
tooltip-placement='bottom' tooltip='Toggle alliances'>\
    <i class='fa fa-eye'></i>\
</md:button>";
    
    appendContent(angular.element($('.map-container')), html);
}


(function() {
    'use strict';
    console.log("Loaded");
    GM_xmlhttpRequest({
        method: "GET",
        url: (loanBaseUrl + "/alliances.js"),
        onload: function(response) {
            allianceData = JSON.parse(response.responseText);
            console.log(allianceData);
        }
    });
})();