'use strict';

angular.module('angularWidget')
  .provider('widgets', function () {
    var manifestGenerators = [];

    this.setManifestGenerator = function (fn) {
      manifestGenerators.push(fn);
    };

    this.$get = function ($injector) {
      var widgets = [];

      function notifyInjector(injector, args) {
        var scope = injector.get('$rootScope');
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
        }
      };
    };
  });
