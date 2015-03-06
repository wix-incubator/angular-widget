'use strict';

angular.module('angularWidgetInternal')
  .directive('ngWidget', function ($http, $templateCache, $q, $timeout, tagAppender, widgets, $rootScope, $log) {
    return {
      restrict: 'E',
      priority: 999,
      terminal: true,
      scope: {
        src: '=',
        options: '=',
        delay: '@'
      },
      link: function (scope, element) {
        var changeCounter = 0, injector, unsubscribe;

        /* @ngInject */
        function widgetConfigSection($provide, widgetConfigProvider) {
          //force the widget to use the shared service instead of creating some instance
          //since this is using a constant (which is available during config) to steal the
          //show, we can theoretically use it to share providers, but that's for another day.
          angular.forEach(widgets.getServicesToShare(), function (value, key) {
            $provide.constant(key, value);
          });

          widgetConfigProvider.setParentInjectorScope(scope);
          widgetConfigProvider.setOptions(scope.options);
        }

        function whenTimeout(result, delay) {
          return delay ? $timeout(function () {
            return result;
          }, delay) : result;
        }

        function delayedPromise(promise, delay) {
          return $q.when(promise).then(function (result) {
            return whenTimeout(result, delay);
          }, function (result) {
            return whenTimeout($q.reject(result), delay);
          });
        }

        function downloadWidget(module, html, filetags) {
          try {
            //testing requires instead of only module just so we can control if this happens in tests
            if (angular.module(module).requires.length) {
              return $http.get(html, {cache: $templateCache}).then(function (response) {
                return response.data;
              });
            }
          } catch (e) {

          }

          var promises = filetags.map(function (filename) {
            return tagAppender(filename, filename.split('.').reverse()[0]);
          });
          promises.unshift($http.get(html, {cache: $templateCache}));
          return $q.all(promises).then(function (result) {
            return result[0].data;
          });
        }

        function forwardEvent(name, src, dst, emit) {
          var fn = emit ? dst.$emit : dst.$broadcast;
          return src.$on(name, function (event) {
            if ((!emit && !event.stopPropagation) || (emit && event.stopPropagation)) {
              var args = Array.prototype.slice.call(arguments);
              args[0] = name;
              dst.$apply(function () {
                if (fn.apply(dst, args).defaultPrevented) {
                  event.preventDefault();
                }
              });
            }
          });
        }

        function handleNewInjector() {
          var widgetConfig = injector.get('widgetConfig');
          var widgetScope = injector.get('$rootScope');
          unsubscribe = [];

          widgets.getEventsToForward().forEach(function (name) {
            unsubscribe.push(forwardEvent(name, $rootScope, widgetScope, false));
            unsubscribe.push(forwardEvent(name, widgetScope, scope, true));
          });

          unsubscribe.push(scope.$watch('options', function (options) {
            widgetScope.$apply(function () {
              widgetConfig.setOptions(options);
            });
          }, true));

          var properties = widgetConfig.exportProperties();
          if (!properties.loading) {
            scope.$emit('widgetLoaded', scope.src);
          } else {
            var deregister = scope.$on('exportPropertiesUpdated', function (event, properties) {
              if (!properties.loading) {
                deregister();
                scope.$emit('widgetLoaded', scope.src);
              }
            });
            unsubscribe.push(deregister);
          }

          widgets.registerWidget(injector);
        }

        function bootstrapWidget(src, delay) {
          var thisChangeId = ++changeCounter;
          $q.when(widgets.getWidgetManifest(src)).then(function (manifest) {
            delayedPromise(downloadWidget(manifest.module, manifest.html, manifest.files), delay)
              .then(function (response) {
                if (thisChangeId !== changeCounter) {
                  return;
                }
                try {
                  var widgetElement = angular.element(response);
                  var modules = [
                    'angularWidgetOnly',
                    'angularWidget',
                    widgetConfigSection,
                    manifest.module
                  ].concat(manifest.config || []);

                  scope.$emit('widgetLoading');
                  injector = angular.bootstrap(widgetElement, modules);
                  handleNewInjector();
                  element.append(widgetElement);
                } catch (e) {
                  $log.error(e);
                  scope.$emit('widgetError');
                }
              }, function () {
                if (thisChangeId === changeCounter) {
                  scope.$emit('widgetError');
                }
              });
          });
        }

        function unregisterInjector() {
          if (injector) {
            unsubscribe.forEach(function (fn) {
              fn();
            });
            widgets.unregisterWidget(injector);
            injector = null;
            unsubscribe = [];
          }
        }

        function updateWidgetSrc() {
          unregisterInjector();
          element.html('');
          if (scope.src) {
            bootstrapWidget(scope.src, scope.delay);
          }
        }

        scope.$watch('src', updateWidgetSrc);
        scope.$on('reloadWidget', updateWidgetSrc);
        scope.$on('$destroy', function () {
          changeCounter++;
          unregisterInjector();
          element.html('');
        });
      }
    };
  });
