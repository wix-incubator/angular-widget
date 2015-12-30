'use strict';

angular.module('app2', ['ngRoute']).config(function ($routeProvider) {
  var colors = {
    sub1: 'pink',
    sub2: 'purple',
    sub3: 'yellow'
  };
  ['sub1', 'sub2', 'sub3'].forEach(function (applicationName) {
    $routeProvider.when('/app2/' + applicationName, {
      template: '<div style="background-color: ' + colors[applicationName] + '">ng-view / ' + applicationName + '</div>'
    });
  });

  $routeProvider.otherwise({
    redirectTo: '/app2/sub1'
  });
});