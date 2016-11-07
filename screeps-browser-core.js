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

window.ScreepsAdapter = window.ScreepsAdapter || {};
(function(ScreepsAdapter) {
    // Listen for changes to the main screeps view
    // Examples: roomEntered, scriptClick, consoleClick, worldMapEntered, simulationMainMenu, gameLobby
    ScreepsAdapter.onViewChange = function (callback) {
        let rootScope = angular.element(document.body).scope();
        if (!rootScope.viewChangeCallbacks) {
            let tutorial = angular.element(document.body).injector().get("Tutorial");
            console.log("Overriding Tutorial.trigger");
            
            // intercept events as they are passed to the tutorial popup manager
            tutorial._trigger = tutorial.trigger;
            tutorial.trigger = function(triggerName, unknownB) {
                for (let i in rootScope.viewChangeCallbacks) {
                    rootScope.viewChangeCallbacks[i](triggerName);
                }
                tutorial._trigger(triggerName, unknownB);
            };

            rootScope.viewChangeCallbacks = [];
        }

        rootScope.viewChangeCallbacks.push(callback);
    };

    ScreepsAdapter.onHashChange = function (callback) {
        let rootScope = angular.element(document.body).scope();
        if (!rootScope.hashChangeCallbacks) {
            rootScope.$on("routeSegmentChange", function() {
                if (window.location.hash !== rootScope.lastHash) {
                    for (let i in rootScope.hashChangeCallbacks) {
                        rootScope.hashChangeCallbacks[i](window.location.hash);
                    }
                }
                rootScope.lastHash = window.location.hash;
            });

            rootScope.hashChangeCallbacks = [];
        }

        rootScope.hashChangeCallbacks.push(callback);
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