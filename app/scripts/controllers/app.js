'use strict';

angular.module('commonShit', [])
  .filter('shit', function () {
    return function (value) {
      return '#' + value + '#';
    };
  });

angular.module('containedApp1', ['angularWidget', 'ngRoute', 'commonShit'])
  .config(function ($routeProvider) {
    $routeProvider.when('/app1', {
      templateUrl: 'views/view.html',
      controller: function ($scope) {
        $scope.name = 'view1';
        $scope.link = '#/app1/sub2';
      }
    }).when('/app1/sub1', {
      templateUrl: 'views/view.html',
      controller: function ($scope) {
        $scope.name = 'view1';
        $scope.link = '#/app1/sub2';
      }
    }).when('/app1/sub2', {
      templateUrl: 'views/view.html',
      controller: function ($scope) {
        $scope.name = 'view2';
        $scope.link = '#/app1/sub1';
      }
    });
  })
  .controller('MainCtrl', function ($scope) {
    $scope.name = 'app1';
    $scope.link = '#/app2';
  });

angular.module('containedApp2', ['angularWidget', 'ngRoute', 'commonShit'])
  .config(function ($routeProvider) {
    $routeProvider.when('/app2', {
      templateUrl: 'views/view.html',
      controller: function ($scope) {
        $scope.name = 'view1';
        $scope.link = '#/app2/sub2';
      }
    }).when('/app2/sub1', {
      templateUrl: 'views/view.html',
      controller: function ($scope) {
        $scope.name = 'view1';
        $scope.link = '#/app2/sub2';
      }
    }).when('/app2/sub2', {
      templateUrl: 'views/view.html',
      controller: function ($scope) {
        $scope.name = 'view2';
        $scope.link = '#/app2/sub1';
      }
    });
  })
  .controller('MainCtrl', function ($scope) {
    $scope.name = 'app2';
    $scope.link = '#/app1';
  });

