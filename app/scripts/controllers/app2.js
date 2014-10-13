'use strict';

angular.module('app2', ['ngRoute']).config(function ($routeProvider) {
  ['sub1', 'sub2', 'sub3'].forEach(function (applicationName) {
    $routeProvider.when('/app2/' + applicationName, {
      template: '<div>ng-view / ' + applicationName + '</div>'
    });
  });

  $routeProvider.otherwise({
    redirectTo: '/app2/sub1'
  });
});