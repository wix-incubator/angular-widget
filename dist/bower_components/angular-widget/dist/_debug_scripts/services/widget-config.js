'use strict';

angular.module('angularWidgetInternal')
  .provider('widgetConfig', function () {
    var defaultParentInjectorScope = {
      $root: {},
      $apply: function (fn) { fn(); },
      $emit: angular.noop
    };

    var parentInjectorScope = defaultParentInjectorScope;

    var options = {};

    this.setParentInjectorScope = function (scope) {
      parentInjectorScope = scope;
      var unsubscribe = parentInjectorScope.$on('$destroy', function () {
        parentInjectorScope = defaultParentInjectorScope;
        unsubscribe();
      });
    };

    this.setOptions = function (newOptions) {
      angular.copy(newOptions, options);
    };

    this.getOptions = function () {
      return options;
    };

    function safeApply(fn) {
      if (parentInjectorScope.$root.$$phase) {
        fn();
      } else {
        parentInjectorScope.$apply(fn);
      }
    }

    this.$get = function ($log) {
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
