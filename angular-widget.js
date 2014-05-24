"use strict";

angular.module("angularWidget", []).config(function() {
    return;
});

"use strict";

angular.module("angularWidget").directive("ngWidget", [ "$http", "$templateCache", "$compile", "$q", "$timeout", "tagAppender", "widgets", function($http, $templateCache, $compile, $q, $timeout, tagAppender, widgets) {
    return {
        restrict: "E",
        priority: 999,
        terminal: true,
        scope: {
            src: "=",
            options: "="
        },
        link: function(scope, element) {
            var changeCounter = 0, injector;
            function delayedPromise(promise, delay) {
                return $q.when(promise).then(function(result) {
                    return $timeout(function() {
                        return result;
                    }, delay || 1e3);
                }, function(result) {
                    return $timeout(function() {
                        return $q.reject(result);
                    }, delay || 1e3);
                });
            }
            function downloadWidget(module, html, filetags) {
                try {
                    if (angular.module(module).requires.length) {
                        return delayedPromise($http.get(html, {
                            cache: $templateCache
                        }).then(function(response) {
                            return response.data;
                        }));
                    }
                } catch (e) {}
                var promises = filetags.map(function(filename) {
                    return tagAppender(filename, filename.split(".").reverse()[0]);
                });
                promises.unshift($http.get(html, {
                    cache: $templateCache
                }));
                return delayedPromise($q.all(promises).then(function(result) {
                    return result[0].data;
                }));
            }
            function handleNewInjector() {
                var widgetConfig = injector.get("widgetConfig");
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
                    injector.get("$rootScope").$apply(function() {
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
            function bootstrapWidget(src) {
                var thisChangeId = ++changeCounter;
                var manifest = widgets.getWidgetManifest(src);
                downloadWidget(manifest.module, manifest.html, manifest.files).then(function(response) {
                    if (thisChangeId !== changeCounter) {
                        return;
                    }
                    try {
                        var widgetElement = angular.element(response);
                        var requires = angular.module(manifest.module).requires;
                        if (requires.indexOf("angularWidget") === -1) {
                            requires.push("angularWidget");
                        }
                        injector = angular.bootstrap(widgetElement, [ manifest.module ]);
                        handleNewInjector();
                        element.append(widgetElement);
                    } catch (e) {
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
                    bootstrapWidget(scope.src);
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
    var manifestGenerator;
    this.setManifestGenerator = function(fn) {
        manifestGenerator = fn;
    };
    this.$get = function() {
        var widgets = [];
        return {
            getWidgetManifest: manifestGenerator,
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
            notifyWidgets: function(result) {
                widgets.forEach(function(injector) {
                    injector.get("$rootScope").$digest();
                });
                return result;
            }
        };
    };
});