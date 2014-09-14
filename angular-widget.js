"use strict";

angular.module("angularWidget", []).run([ "$injector", function($injector) {
    if (!window.angularWidget) {
        var stuffToOverride = [ "$location" ];
        window.angularWidget = stuffToOverride.reduce(function(obj, injectable) {
            obj[injectable] = $injector.get(injectable);
            return obj;
        }, {});
    }
} ]).config([ "$provide", function($provide) {
    if (window.angularWidget) {
        angular.forEach(window.angularWidget, function(value, key) {
            $provide.constant(key, value);
        });
    }
} ]);

"use strict";

angular.module("angularWidget").directive("ngWidget", [ "$http", "$templateCache", "$compile", "$q", "$timeout", "$log", "tagAppender", "widgets", "appContainer", "$rootScope", "$location", function($http, $templateCache, $compile, $q, $timeout, $log, tagAppender, widgets, appContainer, $rootScope, $location) {
    return {
        restrict: "E",
        priority: 999,
        terminal: true,
        scope: {
            src: "=",
            options: "=",
            delay: "@"
        },
        link: function(scope, element) {
            var changeCounter = 0, injector;
            function delayedPromise(promise, delay) {
                return $q.when(promise).then(function(result) {
                    return $timeout(function() {
                        return result;
                    }, delay === undefined ? 1e3 : delay);
                }, function(result) {
                    return $timeout(function() {
                        return $q.reject(result);
                    }, delay === undefined ? 1e3 : delay);
                });
            }
            function downloadWidget(module, html, filetags) {
                try {
                    if (angular.module(module).requires.length) {
                        return $http.get(html, {
                            cache: $templateCache
                        }).then(function(response) {
                            return response.data;
                        });
                    }
                } catch (e) {}
                var promises = filetags.map(function(filename) {
                    return tagAppender(filename, filename.split(".").reverse()[0]);
                });
                promises.unshift($http.get(html, {
                    cache: $templateCache
                }));
                return $q.all(promises).then(function(result) {
                    return result[0].data;
                });
            }
            function handleNewInjector() {
                var widgetConfig = injector.get("widgetConfig");
                var widgetScope = injector.get("$rootScope");
                var eventsToForward = [ "$locationChangeSuccess" ];
                eventsToForward.forEach(function(name) {
                    $rootScope.$on(name, function() {
                        var args = Array.prototype.slice.call(arguments);
                        args[0] = name;
                    });
                });
                try {
                    injector.get("$route").reload();
                } catch (e) {
                    if ($location.absUrl().indexOf("app1") === -1) {}
                }
                var properties = widgetConfig.exportProperties();
                scope.$emit("exportPropertiesUpdated", properties);
                widgetConfig.exportProperties = function(props) {
                    return scope.$apply(function() {
                        angular.extend(properties, props);
                        scope.$emit("exportPropertiesUpdated", properties);
                        return properties;
                    });
                };
                widgetConfig.reportError = function() {
                    scope.$apply(function() {
                        scope.$emit("widgetError");
                    });
                };
                scope.$watch("options", function(options) {
                    widgetScope.$apply(function() {
                        widgetConfig.setOptions(options);
                    });
                }, true);
                if (!properties.loading) {
                    scope.$emit("widgetLoaded");
                } else {
                    var deregister = scope.$on("exportPropertiesUpdated", function(event, properties) {
                        if (!properties.loading) {
                            deregister();
                            scope.$emit("widgetLoaded");
                        }
                    });
                }
                widgets.registerWidget(injector);
            }
            function bootstrapWidget(src, delay) {
                var thisChangeId = ++changeCounter;
                var manifest = src.match(/^\$app\$/) ? appContainer.getCurrentRoute() : widgets.getWidgetManifest(src);
                delayedPromise(downloadWidget(manifest.module, manifest.html, manifest.files), delay).then(function(response) {
                    if (thisChangeId !== changeCounter) {
                        return;
                    }
                    try {
                        var widgetElement = angular.element(response);
                        var modules = [ "angularWidget", manifest.module ].concat(manifest.config || []);
                        injector = angular.bootstrap(widgetElement, modules);
                        handleNewInjector();
                        element.append(widgetElement);
                    } catch (e) {
                        $log.error(e);
                        scope.$emit("widgetError");
                    }
                }, function() {
                    if (thisChangeId === changeCounter) {
                        scope.$emit("widgetError");
                    }
                });
            }
            function unregisterInjector() {
                if (injector) {
                    widgets.unregisterWidget(injector);
                    injector = null;
                }
            }
            function updateWidgetSrc() {
                unregisterInjector();
                element.html("");
                if (scope.src) {
                    bootstrapWidget(scope.src, scope.delay);
                }
            }
            scope.$watch("src", updateWidgetSrc);
            scope.$on("reloadWidget", updateWidgetSrc);
            scope.$on("$destroy", function() {
                changeCounter++;
                unregisterInjector();
            });
        }
    };
} ]);

"use strict";

angular.module("angularWidget").directive("ngAppContainer", [ "appContainer", "$rootScope", function(appContainer, $rootScope) {
    return {
        restrict: "E",
        priority: 999,
        scope: {},
        template: '<ng-widget src="src" delay="0"></ng-widget>',
        link: function(scope) {
            $rootScope.$on("$locationChangeSuccess", function() {
                scope.src = "$app$" + appContainer.getCurrentRoute().route;
            });
        }
    };
} ]);

"use strict";

angular.module("angularWidget").value("headElement", document.getElementsByTagName("head")[0]).value("navigator", navigator).factory("tagAppender", [ "$q", "$rootScope", "headElement", "$interval", "navigator", "$document", function($q, $rootScope, headElement, $interval, navigator, $document) {
    var requireCache = [];
    var styleSheets = $document[0].styleSheets;
    return function(url, filetype) {
        var deferred = $q.defer();
        if (requireCache.indexOf(url) !== -1) {
            deferred.resolve();
            return deferred.promise;
        }
        var fileref;
        if (filetype === "css") {
            fileref = angular.element("<link></link>")[0];
            fileref.setAttribute("rel", "stylesheet");
            fileref.setAttribute("type", "text/css");
            fileref.setAttribute("href", url);
        } else {
            fileref = angular.element("<script></script>")[0];
            fileref.setAttribute("type", "text/javascript");
            fileref.setAttribute("src", url);
        }
        var done = false;
        headElement.appendChild(fileref);
        fileref.onerror = function() {
            if ($rootScope.$$phase) {
                deferred.reject();
            } else {
                $rootScope.$apply(function() {
                    deferred.reject();
                });
            }
        };
        fileref.onload = fileref.onreadystatechange = function() {
            if (!done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete")) {
                done = true;
                fileref.onload = fileref.onreadystatechange = null;
                requireCache.push(url);
                if ($rootScope.$$phase) {
                    deferred.resolve();
                } else {
                    $rootScope.$apply(function() {
                        deferred.resolve();
                    });
                }
            }
        };
        if (filetype === "css" && navigator.userAgent.match(" Safari/") && !navigator.userAgent.match(" Chrom") && navigator.userAgent.match(" Version/5.")) {
            var attempts = 20;
            var promise = $interval(function checkStylesheetAttempt() {
                for (var i = 0; i < styleSheets.length; i++) {
                    if (styleSheets[i].href === url) {
                        $interval.cancel(promise);
                        fileref.onload();
                        return;
                    }
                }
                if (--attempts === 0) {
                    $interval.cancel(promise);
                    fileref.onerror();
                }
            }, 50, 0);
        }
        return deferred.promise;
    };
} ]);

"use strict";

angular.module("angularWidget").factory("widgetConfig", [ "$log", function($log) {
    var options = {};
    var props = {};
    return {
        exportProperties: function(obj) {
            return angular.extend(props, obj || {});
        },
        reportError: function() {
            $log.warn("widget reported an error");
        },
        getOptions: function() {
            return options;
        },
        setOptions: function(newOptions) {
            angular.copy(newOptions, options);
        }
    };
} ]);

"use strict";

angular.module("angularWidget").provider("widgets", function() {
    var manifestGenerators = [];
    this.setManifestGenerator = function(fn) {
        manifestGenerators.push(fn);
    };
    this.$get = [ "$injector", function($injector) {
        var widgets = [];
        function notifyInjector(injector, args) {
            var scope = injector.get("$rootScope");
            var isMe = $injector === injector;
            var event;
            if (args.length) {
                event = scope.$broadcast.apply(scope, args);
            }
            if (!isMe) {
                scope.$digest();
            }
            return event;
        }
        manifestGenerators = manifestGenerators.map(function(generator) {
            return $injector.invoke(generator);
        });
        return {
            getWidgetManifest: function() {
                var args = arguments;
                return manifestGenerators.reduce(function(prev, generator) {
                    var result = generator.apply(this, args);
                    if (result && prev) {
                        return prev.priority > result.priority ? prev : result;
                    } else {
                        return result || prev;
                    }
                }, undefined);
            },
            unregisterWidget: function(injector) {
                var del = [];
                if (injector) {
                    var i = widgets.indexOf(injector);
                    if (i !== -1) {
                        del = widgets.splice(i, 1);
                    }
                } else {
                    del = widgets;
                    widgets = [];
                }
                del.forEach(function(injector) {
                    injector.get("$rootScope").$destroy();
                });
            },
            registerWidget: function(injector) {
                widgets.push(injector);
            },
            notifyWidgets: function() {
                var args = arguments;
                return widgets.map(function(injector) {
                    return notifyInjector(injector, args);
                });
            }
        };
    } ];
});

"use strict";

angular.module("angularWidget").provider("appContainer", function() {
    var defaultRoute = {}, routes = {};
    this.when = function(route, definition) {
        routes[route] = definition;
        return this;
    };
    this.otherwise = function(definition) {
        defaultRoute = definition;
        return this;
    };
    this.$get = [ "$location", function($location) {
        return {
            getCurrentRoute: function() {
                var prefix = ($location.path().match(/\/[^\/]*/) || [])[0];
                var route = angular.extend({
                    route: prefix
                }, routes[prefix] || defaultRoute);
                if (route.redirectTo) {
                    $location.path(route.redirectTo);
                }
                return route;
            }
        };
    } ];
});