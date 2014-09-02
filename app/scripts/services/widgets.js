'use strict';

angular.module('angularWidget')
  .provider('widgets', function () {
    var manifestGenerator;

    this.setManifestGenerator = function (fn) {
      manifestGenerator = fn;
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
            return notifyInjector(injector, args);
          });
        }
      };
    };
  });
