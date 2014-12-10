'use strict';

angular.module('angularWidgetInternal')
  .provider('widgets', function () {
    var manifestGenerators = [];
    var eventsToForward = [];
    var servicesToShare = {};

    this.setManifestGenerator = function (fn) {
      manifestGenerators.push(fn);
    };

    this.addEventToForward = function (name) {
      eventsToForward = eventsToForward.concat(name);
    };

    this.addServiceToShare = function (name, description) {
      servicesToShare[name] = description;
    };

    this.$get = function ($injector, $rootScope) {
      var widgets = [];
      var instancesToShare = {};

      //this will wrap setters so that we can run a digest loop in main app
      //after some shared service state is changed.
      function decorate(service, method, count) {
        var original = service[method];
        service[method] = function () {
          if (arguments.length >= count && !$rootScope.$$phase) {
            $rootScope.$evalAsync();
          }
          return original.apply(service, arguments);
        };
      }

      angular.forEach(servicesToShare, function (description, name) {
        var service = $injector.get(name);
        if (angular.isArray(description)) {
          description.forEach(function (method) {
            decorate(service, method, 0);
          });
        } else {
          angular.forEach(description, function (count, method) {
            decorate(service, method, count);
          });
        }
        instancesToShare[name] = service;
      });

      function notifyInjector(injector, args) {
        var scope = injector.get('$rootScope');
        var event;
        if (args.length) {
          event = scope.$broadcast.apply(scope, args);
        }
        if (!scope.$$phase && injector !== $injector) {
          scope.$digest();
        }
        return event;
      }

      manifestGenerators = manifestGenerators.map(function (generator) {
        return $injector.invoke(generator);
      });

      return {
        getWidgetManifest: function () {
          var args = arguments;
          return manifestGenerators.reduce(function (prev, generator) {
            var result = generator.apply(this, args);
            if (result && prev) {
              //take the manifest with higher priority.
              //if same priority, last generator wins.
              return prev.priority > result.priority ? prev : result;
            } else {
              return result || prev;
            }
          }, undefined);
        },
        unregisterWidget: function (injector) {
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
          del.forEach(function (injector) {
            var $rootScope = injector.get('$rootScope');
            $rootScope.$destroy();
            $rootScope.$$childHead = $rootScope.$$childTail = null;
            $rootScope.$$ChildScope = null;
          });
        },
        registerWidget: function (injector) {
          widgets.push(injector);
        },
        notifyWidgets: function () {
          var args = arguments;
          return widgets.map(function (injector) {
            return notifyInjector(injector, args);
          });
        },
        getEventsToForward: function () {
          return eventsToForward;
        },
        getServicesToShare: function () {
          return instancesToShare;
        }
      };
    };
  });
