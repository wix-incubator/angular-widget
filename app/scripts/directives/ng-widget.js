'use strict';

angular.module('angularWidget')
  .directive('ngWidget', function ($http, $templateCache, $compile, $q, $timeout, $log, tagAppender, widgets) {
    return {
      restrict: 'E',
      priority: 999,
      terminal: true,
      scope: {
        src: '=',
        options: '='
      },
      link: function (scope, element) {
        var changeCounter = 0, injector;

        function delayedPromise(promise, delay) {
          return $q.when(promise).then(function (result) {
            return $timeout(function () {
              return result;
            }, delay || 1000);
          }, function (result) {
            return $timeout(function () {
              return $q.reject(result);
            }, delay || 1000);
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

        function handleNewInjector() {
          var widgetConfig = injector.get('widgetConfig');

          var properties = widgetConfig.exportProperties();
          scope.$emit('exportPropertiesUpdated', properties);

          widgetConfig.exportProperties = function (props) {
            return scope.$apply(function () {
              angular.extend(properties, props);
              scope.$emit('exportPropertiesUpdated', properties);
              return properties;
            });
          };

          widgetConfig.reportError = function () {
            scope.$apply(function () {
              scope.$emit('widgetError');
            });
          };

          scope.$watch('options', function (options) {
            injector.get('$rootScope').$apply(function () {
              widgetConfig.setOptions(options);
            });
          }, true);

          if (!properties.loading) {
            scope.$emit('widgetLoaded');
          } else {
            var deregister = scope.$on('exportPropertiesUpdated', function (event, properties) {
              if (!properties.loading) {
                deregister();
                scope.$emit('widgetLoaded');
              }
            });
          }

          widgets.registerWidget(injector);
        }

        function bootstrapWidget(src) {
          var thisChangeId = ++changeCounter;
          var manifest = widgets.getWidgetManifest(src);

          delayedPromise(downloadWidget(manifest.module, manifest.html, manifest.files))
            .then(function (response) {
              if (thisChangeId !== changeCounter) {
                return;
              }
              try {
                var widgetElement = angular.element(response);
                var modules = ['angularWidget', manifest.module].concat(manifest.config || []);
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
        }

        function unregisterInjector() {
          if (injector) {
            widgets.unregisterWidget(injector);
            injector = null;
          }
        }

        function updateWidgetSrc() {
          unregisterInjector();
          element.html('');
          if (scope.src) {
            bootstrapWidget(scope.src);
          }
        }

        scope.$watch('src', updateWidgetSrc);
        scope.$on('reloadWidget', updateWidgetSrc);
        scope.$on('$destroy', function () {
          changeCounter++;
          unregisterInjector();
        });
      }
    };
  });
