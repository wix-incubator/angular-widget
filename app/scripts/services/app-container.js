'use strict';

angular.module('angularWidgetInternal')
  .provider('appContainer', function () {
    var defaultRoute = {}, routes = {};

    this.when = function (route, definition) {
      routes[route] = definition;
      return this;
    };

    this.otherwise = function (definition) {
      defaultRoute = definition;
      return this;
    };

    this.$get = function ($location) {
      return {
        getCurrentRoute: function () {
          var prefix = ($location.path().match(/\/[^\/]*/) || [])[0];
          var route = angular.extend({route: prefix}, routes[prefix] || defaultRoute);
          if (route.redirectTo) {
            $location.path(route.redirectTo);
          }
          return route;
        }
      };
    };
  });
