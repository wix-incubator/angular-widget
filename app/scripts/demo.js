'use strict';

angular.module('angularWidgetApp', ['ngRoute', 'angularWidget'])
  // .config(function setHtml5Mode($locationProvider) {
  //   $locationProvider.html5Mode(true);
  // })
  .config(function initializeRouteProvider($routeProvider) {
    ['app1', 'app2', 'app3'].forEach(function (applicationName) {
      $routeProvider.when('/' + applicationName + '/:eatall*?', {
        template: '<ng-widget src="src" delay="0"></ng-widget>',
        controller: function AppContainerController(appName, $scope) {
          $scope.src = appName;
        },
        resolve: {
          //we must have this locals param called appName in order for
          //nested routes to work correctly
          appName: function () { return applicationName; }
        },
        reloadOnSearch: false
      });
    });

    $routeProvider.otherwise({
      redirectTo: '/app1/'
    });
  })
  .config(function initializemanifestGenerator(widgetsProvider) {
    widgetsProvider.setManifestGenerator(function () {
      return function (name) {
        return {
          module: name,
          html: 'views/' + name + '.html',
          files: [
            'scripts/controllers/' + name + '.js',
            'styles/' + name + '.css'
          ]
        };
      };
    });
  });
