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
        notifyWidgets: function (result) {
          widgets.forEach(function (injector) {
            injector.get('$rootScope').$digest();
          });
          return result;
        }
      };
    };
  });
