'use strict';

angular.module('mainWidget', ['angularWidget'])
  .controller('MainCtrl', function ($scope, widgetConfig) {
    widgetConfig.exportProperties({title: 'main widget title'});
    $scope.widgetOptions = widgetConfig.getOptions();
    $scope.awesomeThings = [
      'Item 1',
      'Item 2',
      'Item 3',
      'Item 4',
      'Item 5'
    ];
  });
