'use strict';

angular.module('angularWidgetInternal')
  .directive('ngAppContainer', function (appContainer, $rootScope) {
    return {
      restrict: 'E',
      priority: 999,
      scope: {},
      template: '<ng-widget src="src" delay="0"></ng-widget>',
      link: function (scope) {
        $rootScope.$on('$locationChangeSuccess', function () {
          scope.src = '$app$' + appContainer.getCurrentRoute().route;
        });
      }
    };
  });
