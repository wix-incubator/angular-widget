'use strict';

angular.module('angularWidgetInternal')
  .provider('widgetConfig', function () {
    var parentInjectorScope = {
      $root: {},
      $apply: function (fn) { fn(); },
      $emit: angular.noop
    };

    this.setParentInjectorScope = function (scope) {
      parentInjectorScope = scope;
    };

    function safeApply(fn) {
      if (parentInjectorScope.$root.$$phase) {
        fn();
      } else {
        parentInjectorScope.$apply(fn);
      }
    }

    this.$get = function ($log) {
      var options = {};
      var properties = {};

      return {
        exportProperties: function (props) {
          if (props) {
            safeApply(function () {
              angular.extend(properties, props);
              parentInjectorScope.$emit('exportPropertiesUpdated', properties);
            });
          }
          return properties;
        },
        reportError: function () {
          safeApply(function () {
            if (!parentInjectorScope.$emit('widgetError')) {
              $log.warn('widget reported an error');
            }
          });
        },
        getOptions: function () {
          return options;
        },
        setOptions: function (newOptions) {
          angular.copy(newOptions, options);
        }
      };
    };
  });
