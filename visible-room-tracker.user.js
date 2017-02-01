
// Entry point
$(document).ready(() => {
    let rootScope = angular.element(document.body).scope();
    let monitor;
    ScreepsAdapter.onRoomChange(function (roomName) {
        if (monitor) {
            monitor.remove();
        }

        function enableRoomMonitor() {
            monitor = ScreepsAdapter.Socket.bindEventToScope(rootScope, "room:" + roomName, (tickData) => {
                ScreepsAdapter.Connection.setMemoryByPath(
                    null,
                    "rooms." + roomName + ".lastViewed",
                    tickData.gameTime
                );
            });
        }

        if (roomName) {
            ScreepsAdapter.Connection.getMemoryByPath(null, "rooms." + roomName).then((baseRoomData) => {
                if (!baseRoomData) {
                    ScreepsAdapter.Connection.setMemoryByPath(
                        null,
                        "rooms." + roomName,
                        {}
                    ).then(enableRoomMonitor);
                } else {
                    enableRoomMonitor();
                }
            });
        }
    });
});