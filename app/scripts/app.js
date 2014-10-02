/* global window */
'use strict';
angular.module('angularWidgetInternal', []);
angular.module('angularWidget', ['angularWidgetInternal'])
  .config(function (widgetsProvider) {
    widgetsProvider.addServiceToShare('$location', {
      url: 1,
      path: 1,
      search: 2,
      hash: 1
    });
  })
  .run(function ($injector, $rootScope, widgets, $location) {
    function decorate(service, method, count) {
      var original = service[method];
      service[method] = function () {
        if (arguments.length >= count && !$rootScope.$$phase) {
          $rootScope.$evalAsync();
        }
        return original.apply(service, arguments);
      };
    }

    //TBD: this means that only the main app can decide on serviced to share
    //this can be refactored so a widget can also configure the services for
    //its own and its nested widgets.
    if (!window.angularWidget) {
      //main app
      window.angularWidget = {};
      angular.forEach(widgets.getServicesToShare(), function (description, name) {
        var service = $injector.get(name);
        angular.forEach(description, function (count, method) {
          decorate(service, method, count);
        });
        window.angularWidget[name] = service;
      });
    } else {
      //widget
      $rootScope.$evalAsync(function () {
        if ($injector.has('$route')) {
          $injector.get('$route').reload();
        } else {
          $rootScope.$broadcast('$locationChangeSuccess', $location.absUrl(), '');
        }
      });
    }
  })
  .config(function ($provide) {
    if (window.angularWidget) {
      angular.forEach(window.angularWidget, function (value, key) {
        $provide.constant(key, value);
      });
    }
  });
