/* global window */
'use strict';

angular.module('angularWidget', [])
  .run(function ($injector, $rootScope) {
    function decorate(service, method, count) {
      var original = service[method];
      service[method] = function () {
        if (arguments.length >= count && !$rootScope.$$phase) {
          $rootScope.$evalAsync();
        }
        return original.apply(service, arguments);
      };
    }

    if (!window.angularWidget) {
      var $location = $injector.get('$location');
      decorate($location, 'url', 1);
      decorate($location, 'path', 1);
      decorate($location, 'search', 2);
      decorate($location, 'hash', 1);

      var stuffToOverride = ['$location'];
      window.angularWidget = stuffToOverride.reduce(function (obj, injectable) {
        obj[injectable] = $injector.get(injectable);
        return obj;
      }, {});
    }
  })
  .config(function ($provide) {
    if (window.angularWidget) {
      angular.forEach(window.angularWidget, function (value, key) {
        $provide.constant(key, value);
      });
    }
  });
