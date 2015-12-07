"use strict";

angular.module("angularWidgetInternal", []);

angular.module("angularWidget", [ "angularWidgetInternal" ]).config([ "$provide", "$injector", function($provide, $injector) {
    if (!$injector.has("$routeProvider")) {
        return;
    }
    $provide.decorator("$rootScope", [ "$delegate", "$injector", function($delegate, $injector) {
        var next, last, originalBroadcast = $delegate.$broadcast;
        var suspendListener = false;
        function suspendedNotify(widgets, $location) {
            suspendListener = true;
            widgets.notifyWidgets("$locationChangeStart", $location.absUrl(), "");
            widgets.notifyWidgets("$locationChangeSuccess", $location.absUrl(), "");
            suspendListener = false;
        }
        $delegate.$broadcast = function(name) {
            var shouldMute = false;
            if (name === "$routeChangeSuccess") {
                $injector.invoke([ "$route", "widgets", "$location", function($route, widgets, $location) {
                    last = next;
                    next = $route.current;
                    if (next && last && next.$$route === last.$$route && !next.$$route.reloadOnSearch && next.locals && next.locals.$template && next.locals.$template.indexOf("<ng-widget") !== -1) {
                        suspendedNotify(widgets, $location);
                        shouldMute = true;
                    }
                } ]);
            }
            if (shouldMute) {
                arguments[0] = "$routeChangeMuted";
            }
            return originalBroadcast.apply(this, arguments);
        };
        $delegate.$on("$routeUpdate", function() {
            if (!suspendListener) {
                $injector.invoke([ "widgets", "$location", function(widgets, $location) {
                    suspendedNotify(widgets, $location);
                } ]);
            }
        });
        return $delegate;
    } ]);
} ]).config([ "$provide", function($provide) {
    $provide.decorator("$browser", [ "$delegate", function($delegate) {
        $delegate.$$applicationDestroyed = angular.noop;
        return $delegate;
    } ]);
} ]).config([ "widgetsProvider", function(widgetsProvider) {
    widgetsProvider.addServiceToShare("$browser");
    widgetsProvider.addServiceToShare("$location", {
        url: 1,
        path: 1,
        search: 1,
        hash: 1,
        $$parse: 1
    });
    widgetsProvider.addEventToForward("$locationChangeStart");
} ]);

angular.module("angularWidgetOnly", []).run([ "$rootScope", "$location", function($rootScope, $location) {
    $rootScope.$evalAsync(function() {
        var ev = $rootScope.$broadcast("$locationChangeStart", $location.absUrl(), "");
        if (!ev.defaultPrevented) {
            $rootScope.$broadcast("$locationChangeSuccess", $location.absUrl(), "");
        }
    });
} ]);

"use strict";

angular.module("angularWidgetInternal").directive("ngWidget", [ "$http", "$templateCache", "$q", "$timeout", "fileLoader", "widgets", "$rootScope", "$log", function($http, $templateCache, $q, $timeout, fileLoader, widgets, $rootScope, $log) {
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
            var changeCounter = 0, injector, unsubscribe;
            function widgetConfigSection($provide, widgetConfigProvider) {
                angular.forEach(widgets.getServicesToShare(), function(value, key) {
                    $provide.constant(key, value);
                });
                widgetConfigProvider.setParentInjectorScope(scope);
                widgetConfigProvider.setOptions(scope.options);
            }
            widgetConfigSection.$inject = [ "$provide", "widgetConfigProvider" ];
            function whenTimeout(result, delay) {
                return delay ? $timeout(function() {
                    return result;
                }, delay) : result;
            }
            function delayedPromise(promise, delay) {
                return $q.when(promise).then(function(result) {
                    return whenTimeout(result, delay);
                }, function(result) {
                    return whenTimeout($q.reject(result), delay);
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
                return $q.all([ $http.get(html, {
                    cache: $templateCache
                }), fileLoader.loadFiles(filetags) ]).then(function(result) {
                    return result[0].data;
                });
            }
            function forwardEvent(name, src, dst, emit) {
                var fn = emit ? dst.$emit : dst.$broadcast;
                return src.$on(name, function(event) {
                    if (!emit && !event.stopPropagation || emit && event.stopPropagation) {
                        var args = Array.prototype.slice.call(arguments);
                        args[0] = name;
                        if (dst.$root.$$phase) {
                            applyHandler(fn, dst, args, event);
                        } else {
                            dst.$apply(function() {
                                applyHandler(fn, dst, args, event);
                            });
                        }
                    }
                });
            }
            function applyHandler(fn, dst, args, event) {
                if (fn.apply(dst, args).defaultPrevented) {
                    event.preventDefault();
                }
            }
            function handleNewInjector() {
                var widgetConfig = injector.get("widgetConfig");
                var widgetScope = injector.get("$rootScope");
                unsubscribe = [];
                widgets.getEventsToForward().forEach(function(name) {
                    unsubscribe.push(forwardEvent(name, $rootScope, widgetScope, false));
                    unsubscribe.push(forwardEvent(name, widgetScope, scope, true));
                });
                unsubscribe.push(scope.$watch("options", function(options) {
                    widgetScope.$apply(function() {
                        widgetConfig.setOptions(options);
                    });
                }, true));
                var properties = widgetConfig.exportProperties();
                if (!properties.loading) {
                    scope.$emit("widgetLoaded", scope.src);
                } else {
                    var deregister = scope.$on("exportPropertiesUpdated", function(event, properties) {
                        if (!properties.loading) {
                            deregister();
                            scope.$emit("widgetLoaded", scope.src);
                        }
                    });
                    unsubscribe.push(deregister);
                }
                widgets.registerWidget(injector);
            }
            function bootstrapWidget(src, delay) {
                var thisChangeId = ++changeCounter;
                $q.when(widgets.getWidgetManifest(src)).then(function(manifest) {
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
                });
            }
            function unregisterInjector() {
                if (injector) {
                    unsubscribe.forEach(function(fn) {
                        fn();
                    });
                    widgets.unregisterWidget(injector);
                    injector = null;
                    unsubscribe = [];
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
                element.html("");
            });
        }
    };
} ]);

"use strict";

(function() {
    function FileLoader(tagAppender, $q) {
        function loadSequentially(filenames) {
            return filenames.reduce(function(previousPromise, filename) {
                return previousPromise.then(function() {
                    return tagAppender(filename, filename.split(".").reverse()[0]);
                });
            }, $q.when());
        }
        this.loadFiles = function(fileNames) {
            return $q.all(fileNames.map(function(filename) {
                return Array.isArray(filename) ? loadSequentially(filename) : tagAppender(filename, filename.split(".").reverse()[0]);
            }));
        };
    }
    FileLoader.$inject = [ "tagAppender", "$q" ];
    angular.module("angularWidgetInternal").service("fileLoader", FileLoader);
})();

"use strict";

angular.module("angularWidgetInternal").value("headElement", document.getElementsByTagName("head")[0]).factory("requirejs", function() {
    return window.requirejs || null;
}).value("navigator", navigator).factory("tagAppender", [ "$q", "$rootScope", "headElement", "$interval", "navigator", "$document", "requirejs", "$browser", function($q, $rootScope, headElement, $interval, navigator, $document, requirejs, $browser) {
    var requireCache = {};
    var styleSheets = $document[0].styleSheets;
    function noprotocol(url) {
        return url.replace(/^.*:\/\//, "//");
    }
    return function(url, filetype) {
        var deferred = $q.defer();
        deferred.promise.finally(function() {
            $browser.$$completeOutstandingRequest(angular.noop);
        });
        $browser.$$incOutstandingRequestCount();
        if (requirejs && filetype === "js") {
            requirejs([ url ], function(module) {
                $rootScope.$apply(function() {
                    deferred.resolve(module);
                });
            }, function(err) {
                $rootScope.$apply(function() {
                    deferred.reject(err);
                });
            });
            return deferred.promise;
        }
        if (url in requireCache) {
            requireCache[url].then(function(res) {
                deferred.resolve(res);
            }, function(res) {
                deferred.reject(res);
            });
            return deferred.promise;
        }
        requireCache[url] = deferred.promise;
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
            fileref.onerror = fileref.onload = fileref.onreadystatechange = null;
            delete requireCache[url];
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
                fileref.onerror = fileref.onload = fileref.onreadystatechange = null;
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
                    if (noprotocol(styleSheets[i].href + "") === noprotocol(url)) {
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
    var defaultParentInjectorScope = {
        $root: {},
        $apply: function(fn) {
            fn();
        },
        $emit: angular.noop
    };
    var parentInjectorScope = defaultParentInjectorScope;
    var options = {};
    this.setParentInjectorScope = function(scope) {
        parentInjectorScope = scope;
        var unsubscribe = parentInjectorScope.$on("$destroy", function() {
            parentInjectorScope = defaultParentInjectorScope;
            unsubscribe();
        });
    };
    this.setOptions = function(newOptions) {
        angular.copy(newOptions, options);
    };
    this.getOptions = function() {
        return options;
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
                    var $rootScope = injector.get("$rootScope");
                    $rootScope.$destroy();
                    $rootScope.$$childHead = $rootScope.$$childTail = null;
                    $rootScope.$$ChildScope = null;
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