window.DomHelper = {};
(function(DomHelper){
    DomHelper.addStyle = function (css) {
        let head = document.head;
        if (!head) return;

        let style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;

        head.appendChild(style);
    }

    DomHelper.generateCompiledElement = function(parent, content) {
        let $scope = parent.scope();
        let $compile = parent.injector().get("$compile");
        return $compile(content)($scope);
    }
})(DomHelper);

window.ScreepsAdapter = {};
(function(ScreepsAdapter){

    // Listen for changes to the main screeps view
    // Examples: roomEntered, scriptClick, consoleClick, worldMapEntered, simulationMainMenu, gameLobby
    let listeningToViewState = false;
    ScreepsAdapter.onViewChange = function (callback) {
        if (!listeningToViewState) {
            let tutorial = angular.element(document.body).injector().get("Tutorial");
            
            // intercept events as they are passed to the tutorial popup manager
            tutorial._trigger = tutorial.trigger;
            tutorial.trigger = function(triggerName, unknownB) {
                $(document).trigger("screeps:viewChange", triggerName);
                tutorial._trigger(triggerName, unknownB);
            };

            listeningToViewState = true;
        }

        $(document).on("screeps:viewChange", callback)
    };

    let lastHash;
    let listeningToHashState = false;
    ScreepsAdapter.onHashChange = function (callback) {
        if (!listeningToHashState) {
            let app = angular.element(document.body);
            app.scope().$on("routeSegmentChange", function() {
                if (window.location.hash !== lastHash) {
                    $(document).trigger("screeps:hashChange", window.location.hash);
                }
                lastHash = window.location.hash;
            });
            listeningToHashState = true;
        }

        $(document).on("screeps:hashChange", callback)
    }

    // aliases to angular services
    Object.defineProperty(ScreepsAdapter, "User", {
        get: function() {
            delete this.User;
            Object.defineProperty(this, "User", {
                value: angular.element(document.body).scope().Me()
            });
            return this.User;
        },
        configurable: true
    });
    
    Object.defineProperty(ScreepsAdapter, "$timeout", {
        get: function() {
            delete this.$timeout;
            Object.defineProperty(this, "$timeout", {
                value: angular.element(document.body).injector().get('$timeout')
            });
            return this.$timeout;
        },
        configurable: true
    });
    
    Object.defineProperty(ScreepsAdapter, "Connection", {
        get: function() {
            delete this.Connection;
            Object.defineProperty(this, "Connection", {
                value: angular.element(document.body).injector().get('Connection')
            });
            return this.Connection;
        },
        configurable: true
    });
    
    Object.defineProperty(ScreepsAdapter, "Socket", {
        get: function() {
            delete this.Socket;
            Object.defineProperty(this, "Socket", {
                value: angular.element(document.body).injector().get('Socket')
            });
            return this.Socket;
        },
        configurable: true
    });
    
    Object.defineProperty(ScreepsAdapter, "Api", {
        get: function() {
            delete this.Api;
            Object.defineProperty(this, "Api", {
                value: angular.element(document.body).injector().get('Api')
            });
            return this.Api;
        },
        configurable: true
    });

})(ScreepsAdapter);