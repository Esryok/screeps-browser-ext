// ==UserScript==
// @name         Migrate room to simulator
// @namespace    https://screeps.com/
// @version      1.4
// @author       Mark Bertels, Esryok
// @match        https://screeps.com/a/#!/sim/custom
// @run-at       context-menu
// @grant        none
// ==/UserScript==

function applyTerrain(terrain) {
    var roomElement = angular.element($('section.room'));
    var room = roomElement.scope().Room;
    var injector = roomElement.injector();
    
    var memory = injector.get("MemoryStorage");
    var terrainObj = memory.get("rooms.terrain");
    
    var roomTerrainData = _.find(terrainObj, { room: "sim" });
    roomTerrainData.terrain = terrain;
    
    var connection = injector.get("Connection");
    connection.getRoomTerrain().then((data) => {
        room.terrain = data;
    });
}

function adjustRoomDataForCustomMode(roomData) {
    var gameElement = angular.element($('body'));
    var memory = gameElement.injector().get("MemoryStorage");
    
    let currentTime = angular.element($('section.room')).scope().Room.gameTime;
    console.log("current time is", currentTime);
    
    let forceUser = gameElement.injector().get("Auth").Me;
    
    for (let index in roomData.objects) {
        let object = roomData.objects[index];
        if (object.nextRegenerationTime)
            object.nextRegenerationTime = Math.max(1, object.nextRegenerationTime - currentTime);
            
        if (object.nextDecayTime)
            object.nextDecayTime = Math.max(1, object.nextDecayTime - currentTime);
        
        if (object.ageTime)
            object.ageTime = Math.max(1, object.ageTime - currentTime);
            console.log(object.name, object.ageTime);
        
        if (object.user)
            object.user = forceUser._id;
    }
    
    return roomData;
}

function migrateRoomToSimulation() {
    var open = window.open;
    window.open = () => {
        return {
            document: {
                write: function (savedRoomText) {
                    window.open = open;
                    
                    console.log("Room data cached");
                    let roomData = adjustRoomDataForCustomMode(JSON.parse(savedRoomText));
                    
                    var gameElement = angular.element($('body'));
                    var memory = gameElement.injector().get("MemoryStorage");
                    var destroyWatcher = gameElement.scope().$watch(function () { return (memory.get("gametime")); }, function (newVal, oldVal) {
                        console.log("game time changed", oldVal, "=>", newVal);
                        if (newVal === 1) {
                            console.log("Sim room ready");
                            try {
                                var roomScope_1 = angular.element($('section.room')).scope();
                                var room_1 = roomScope_1.Room;
                                console.log("Applying terrain...");
                                applyTerrain(roomData.terrain[0].terrain);
                                console.log("Restoring...");
                                room_1.restoreData = JSON.stringify(roomData);
                                room_1.restore();
                            }
                            catch (e) {
                                console.log("Migration failed", e);
                            }
                            destroyWatcher();
                        }
                    });
                    
                    location.href = "https://screeps.com/a/#!/sim/custom";
                }
            }
        };
    };
    
    var roomScope = angular.element($('section.room')).scope();
    var room = roomScope.Room;
    room.save();
}

$(function () {
    // push the load to the end of the event queue
    setTimeout(migrateRoomToSimulation);
});