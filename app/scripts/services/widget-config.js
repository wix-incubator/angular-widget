'use strict';

angular.module('angularWidgetInternal')
  .factory('widgetConfig', function ($log) {
    var options = {};
    var props = {};

    return {
      exportProperties: function (obj) {
        return angular.extend(props, obj || {});
      },
      reportError: function () {
        $log.warn('widget reported an error');
      },
      getOptions: function () {
        return options;
      },
      setOptions: function (newOptions) {
        angular.copy(newOptions, options);
      }
    };
  });
