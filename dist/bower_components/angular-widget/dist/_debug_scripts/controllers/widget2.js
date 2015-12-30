'use strict';

angular.module('widget2', ['angularWidget'])
  .controller('Widget2Ctrl', function ($scope, widgetConfig) {
    widgetConfig.exportProperties({title: 'widget2 title'});
    $scope.widgetOptions = widgetConfig.getOptions();
    $scope.awesomeThings = [
      'Item 21',
      'Item 22',
      'Item 23',
      'Item 24',
      'Item 25'
    ];
  });
