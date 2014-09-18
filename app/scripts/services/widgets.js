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

    this.$get = function ($injector) {
      var widgets = [];

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
            injector.get('$rootScope').$destroy();
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
          return servicesToShare;
        }
      };
    };
  });
