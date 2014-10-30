"use strict";

angular.module("angularWidgetInternal", []);

angular.module("angularWidget", [ "angularWidgetInternal" ]).config([ "$provide", "$injector", function($provide, $injector) {
    if (!$injector.has("$routeProvider")) {
        return;
    }
    $provide.decorator("$rootScope", [ "$delegate", "$injector", function($delegate, $injector) {
        var next, last, originalBroadcast = $delegate.$broadcast;
        $delegate.$broadcast = function(name) {
            var shouldMute = false;
            if (name === "$routeChangeSuccess") {
                $injector.invoke([ "$route", "widgets", "$location", function($route, widgets, $location) {
                    last = next;
                    next = $route.current;
                    if (next && last && next.$$route === last.$$route && next.locals && next.locals.$template && next.locals.$template.indexOf("<ng-widget") !== -1) {
                        widgets.notifyWidgets("$locationChangeSuccess", $location.absUrl(), "");
                        shouldMute = true;
                    }
                } ]);
            }
            if (shouldMute) {
                arguments[0] = "$routeChangeMuted";
            }
            return originalBroadcast.apply(this, arguments);
        };
        var suspendListener = false;
        $delegate.$on("$routeUpdate", function() {
            if (!suspendListener) {
                $injector.invoke([ "widgets", "$location", function(widgets, $location) {
                    suspendListener = true;
                    widgets.notifyWidgets("$locationChangeSuccess", $location.absUrl(), "");
                    suspendListener = false;
                } ]);
            }
        });
        return $delegate;
    } ]);
} ]).config([ "widgetsProvider", function(widgetsProvider) {
    widgetsProvider.addServiceToShare("$location", {
        url: 1,
        path: 1,
        search: 2,
        hash: 1,
        $$parse: 1
    });
    widgetsProvider.addEventToForward("$locationChangeStart");
} ]);

angular.module("angularWidgetOnly", []).run([ "$rootScope", "$location", function($rootScope, $location) {
    $rootScope.$evalAsync(function() {
        $rootScope.$broadcast("$locationChangeSuccess", $location.absUrl(), "");
    });
} ]);

"use strict";

angular.module("angularWidgetInternal").directive("ngWidget", [ "$http", "$templateCache", "$q", "$timeout", "tagAppender", "widgets", "$rootScope", "$log", function($http, $templateCache, $q, $timeout, tagAppender, widgets, $rootScope, $log) {
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
            function widgetConfigSection($provide, widgetConfigProvider) {
                angular.forEach(widgets.getServicesToShare(), function(value, key) {
                    $provide.constant(key, value);
                });
                widgetConfigProvider.setParentInjectorScope(scope);
                widgetConfigProvider.setOptions(scope.options);
            }
            widgetConfigSection.$inject = [ "$provide", "widgetConfigProvider" ];
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
            function forwardEvent(name, src, dst, emit) {
                var fn = emit ? dst.$emit : dst.$broadcast;
                src.$on(name, function(event) {
                    if (!emit || event.stopPropagation) {
                        var args = Array.prototype.slice.call(arguments);
                        args[0] = name;
                        if (fn.apply(dst, args).defaultPrevented) {
                            event.preventDefault();
                        }
                    }
                });
            }
            function handleNewInjector() {
                var widgetConfig = injector.get("widgetConfig");
                var widgetScope = injector.get("$rootScope");
                widgets.getEventsToForward().forEach(function(name) {
                    forwardEvent(name, $rootScope, widgetScope, false);
                    forwardEvent(name, widgetScope, scope, true);
                });
                scope.$watch("options", function(options) {
                    widgetScope.$apply(function() {
                        widgetConfig.setOptions(options);
                    });
                }, true);
                var properties = widgetConfig.exportProperties();
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
                var manifest = widgets.getWidgetManifest(src);
                delayedPromise(downloadWidget(manifest.module, manifest.html, manifest.files), delay).then(function(response) {
                    if (thisChangeId !== changeCounter) {
                        return;
                    }
                    try {
                        var widgetElement = angular.element(response);
                        var modules = [ "angularWidgetOnly", "angularWidget", widgetConfigSection, manifest.module ].concat(manifest.config || []);
                        scope.$emit("widgetLoading");
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

angular.module("angularWidgetInternal").value("headElement", document.getElementsByTagName("head")[0]).value("navigator", navigator).factory("tagAppender", [ "$q", "$rootScope", "headElement", "$interval", "navigator", "$document", function($q, $rootScope, headElement, $interval, navigator, $document) {
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

angular.module("angularWidgetInternal").provider("widgetConfig", function() {
    var parentInjectorScope = {
        $root: {},
        $apply: function(fn) {
            fn();
        },
        $emit: angular.noop
    };
    var options = {};
    this.setParentInjectorScope = function(scope) {
        parentInjectorScope = scope;
    };
    this.setOptions = function(newOptions) {
        angular.copy(newOptions, options);
    };
    function safeApply(fn) {
        if (parentInjectorScope.$root.$$phase) {
            fn();
        } else {
            parentInjectorScope.$apply(fn);
        }
    }
    this.$get = [ "$log", function($log) {
        var properties = {};
        return {
            exportProperties: function(props) {
                if (props) {
                    safeApply(function() {
                        angular.extend(properties, props);
                        parentInjectorScope.$emit("exportPropertiesUpdated", properties);
                    });
                }
                return properties;
            },
            reportError: function() {
                safeApply(function() {
                    if (!parentInjectorScope.$emit("widgetError")) {
                        $log.warn("widget reported an error");
                    }
                });
            },
            getOptions: function() {
                return options;
            },
            setOptions: function(newOptions) {
                angular.copy(newOptions, options);
            }
        };
    } ];
});

"use strict";

angular.module("angularWidgetInternal").provider("widgets", function() {
    var manifestGenerators = [];
    var eventsToForward = [];
    var servicesToShare = {};
    this.setManifestGenerator = function(fn) {
        manifestGenerators.push(fn);
    };
    this.addEventToForward = function(name) {
        eventsToForward = eventsToForward.concat(name);
    };
    this.addServiceToShare = function(name, description) {
        servicesToShare[name] = description;
    };
    this.$get = [ "$injector", "$rootScope", function($injector, $rootScope) {
        var widgets = [];
        var instancesToShare = {};
        function decorate(service, method, count) {
            var original = service[method];
            service[method] = function() {
                if (arguments.length >= count && !$rootScope.$$phase) {
                    $rootScope.$evalAsync();
                }
                return original.apply(service, arguments);
            };
        }
        angular.forEach(servicesToShare, function(description, name) {
            var service = $injector.get(name);
            if (angular.isArray(description)) {
                description.forEach(function(method) {
                    decorate(service, method, 0);
                });
            } else {
                angular.forEach(description, function(count, method) {
                    decorate(service, method, count);
                });
            }
            instancesToShare[name] = service;
        });
        function notifyInjector(injector, args) {
            var scope = injector.get("$rootScope");
            var event;
            if (args.length) {
                event = scope.$broadcast.apply(scope, args);
            }
            if (!scope.$$phase && injector !== $injector) {
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
            },
            getEventsToForward: function() {
                return eventsToForward;
            },
            getServicesToShare: function() {
                return instancesToShare;
            }
        };
    } ];
});