/* global window */
'use strict';
angular.module('angularWidgetInternal', []);
angular.module('angularWidget', ['angularWidgetInternal'])
  .config(function (widgetsProvider) {
    //sharing the $location between everyone is the only way to have
    //a single source of truth about the current location.
    widgetsProvider.addServiceToShare('$location', {
      //list of setters. since those methods are both getters and setters
      //we also pass the number of arguments passed to the function which
      //makes it act like a setter. this is needed since we want to run
      //a digest loop in the main app when some widget sets the location.
      url: 1,
      path: 1,
      search: 2,
      hash: 1,
      $$parse: 1
    });

    //we want to pass the $locationChangeStart down to all widgets in order
    //to let them a change to cancel the location change using preventDefault
    widgetsProvider.addEventToForward('$locationChangeStart');
  })
  .run(function ($injector, $rootScope, widgets, $location) {
    //this will wrap setters so that we can run a digest loop in main app
    //after some shared service state is changed.
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
      //main app - store shared services on a global variable
      //used later by config block to override the widget services.
      window.angularWidget = {};
      angular.forEach(widgets.getServicesToShare(), function (description, name) {
        var service = $injector.get(name);
        angular.forEach(description, function (count, method) {
          decorate(service, method, count);
        });
        window.angularWidget[name] = service;
      });
    } else {
      //widget - since $location is shared and is not going to be instantiated
      //by the new injector of this widget, we send the $locationChangeSuccess
      //ourselves to kickoff ng-rounte and ui-router ($location usually does that
      //itself during instantiation)
      $rootScope.$evalAsync(function () {
        $rootScope.$broadcast('$locationChangeSuccess', $location.absUrl(), '');
      });
    }
  })
  .config(function ($provide) {
    //force the widget to use the shared service instead of creating some instance
    //since this is using a constant (which is available during config) to steal the
    //show, we can theoretically use it to share providers, but that's for another day.
    if (window.angularWidget) {
      angular.forEach(window.angularWidget, function (value, key) {
        $provide.constant(key, value);
      });
    }
  });
