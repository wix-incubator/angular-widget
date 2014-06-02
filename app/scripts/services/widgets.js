'use strict';

angular.module('angularWidget')
  .provider('widgets', function () {
    var manifestGenerator;

    this.setManifestGenerator = function (fn) {
      manifestGenerator = fn;
    };

    this.$get = function ($injector) {
      var widgets = [];

      return {
        getWidgetManifest: manifestGenerator ? $injector.invoke(manifestGenerator) : angular.noop,
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
            var scope = injector.get('$rootScope');
            if (args.length) {
              var event;
              scope.$apply(function () {
                event = scope.$broadcast.apply(scope, args);
              });
              return event;
            } else {
              return scope.$digest();
            }
          });
        }
      };
    };
  });
