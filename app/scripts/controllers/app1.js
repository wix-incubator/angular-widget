'use strict';

angular.module('app1', ['angularWidget'])
  .controller('widgetContainer', function ($scope) {
    $scope.isLoading = true;

    $scope.$on('exportPropertiesUpdated', function (event, props) {
      $scope.title = props.title;
    });
    $scope.$on('widgetLoaded', function () {
      $scope.isLoading = false;
      $scope.isError = false;
    });
    $scope.$on('widgetError', function () {
      $scope.isLoading = false;
      $scope.isError = true;
    });

    $scope.reload = function () {
      $scope.isLoading = true;
      $scope.isError = false;
      $scope.$broadcast('reloadWidget');
    };
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
