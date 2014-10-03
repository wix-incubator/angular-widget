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
  });

angular.module('angularWidgetOnly', [])
  .run(function ($rootScope, $location) {
    //widget - since $location is shared and is not going to be instantiated
    //by the new injector of this widget, we send the $locationChangeSuccess
    //ourselves to kickoff ng-rounte and ui-router ($location usually does that
    //itself during instantiation)
    $rootScope.$evalAsync(function () {
      $rootScope.$broadcast('$locationChangeSuccess', $location.absUrl(), '');
    });
  });

