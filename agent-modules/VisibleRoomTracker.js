global.getClientVisibleRooms = function (age) {
    let since = Game.time - ((age !== undefined)
        ? age
        : 5);
    let visibleRooms = [];

    for (let roomName in Memory.rooms) {
        let roomData = Memory.rooms[roomName];
        if (roomData && roomData.lastViewed > since) {
            visibleRooms.push(roomName);
        }
    }

    return visibleRooms;
}