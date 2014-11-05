'use strict';

angular.module('angularWidgetInternal', []);

angular.module('angularWidget', ['angularWidgetInternal'])
  .config(function ($provide, $injector) {
    if (!$injector.has('$routeProvider')) {
      return;
    }
    //this is a really ugly trick to prevent reloading of the ng-view in case
    //an internal route changes, effecting only the router inside that view.
    $provide.decorator('$rootScope', function ($delegate, $injector) {
      var next, last, originalBroadcast = $delegate.$broadcast;

      $delegate.$broadcast = function (name) {
        var shouldMute = false;
        if (name === '$routeChangeSuccess') {
          $injector.invoke(/* @ngInject */function ($route, widgets, $location) {
            last = next;
            next = $route.current;
            if (next && last && next.$$route === last.$$route &&
                next.locals && next.locals.$template &&
                next.locals.$template.indexOf('<ng-widget') !== -1) {
              widgets.notifyWidgets('$locationChangeSuccess', $location.absUrl(), '');
              shouldMute = true;
            }
          });
        }
        if (shouldMute) {
          arguments[0] = '$routeChangeMuted';
        }
        return originalBroadcast.apply(this, arguments);
      };

      //sending $locationChangeSuccess will cause another $routeUpdate
      //so we need this ugly flag to prevent call stack overflow
      var suspendListener = false;
      $delegate.$on('$routeUpdate', function () {
        if (!suspendListener) {
          $injector.invoke(/* @ngInject */function (widgets, $location) {
            suspendListener = true;
            widgets.notifyWidgets('$locationChangeSuccess', $location.absUrl(), '');
            suspendListener = false;
          });
        }
      });

      return $delegate;
    });
  })
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
      search: 1,
      hash: 1,
      $$parse: 1
    });

    //we want to pass the $locationChangeStart down to all widgets in order
    //to let them a change to cancel the location change using preventDefault
    widgetsProvider.addEventToForward('$locationChangeStart');
  });

angular.module('angularWidgetOnly', [])
  .run(function ($rootScope, $location) {
    //widget - since $location is shared and is not going to be instantiated
    //by the new injector of this widget, we send the $locationChangeSuccess
    //ourselves to kickoff ng-rounte and ui-router ($location usually does that
    //itself during instantiation)
    $rootScope.$evalAsync(function () {
      var ev = $rootScope.$broadcast('$locationChangeStart', $location.absUrl(), '');
      if (!ev.defaultPrevented) {
        $rootScope.$broadcast('$locationChangeSuccess', $location.absUrl(), '');
      }
    });
  });

