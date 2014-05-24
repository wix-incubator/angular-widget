'use strict';

angular.module('angularWidgetApp').controller('widgetContainer', function ($scope) {
  $scope.isLoading = true;

  // $scope.$watch('options', function (options) {
  //   $scope.containerOptions = angular.extend({hasContainer: true}, options);
  // });
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
});
