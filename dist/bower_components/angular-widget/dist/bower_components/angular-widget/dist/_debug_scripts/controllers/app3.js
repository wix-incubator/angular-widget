'use strict';

angular.module('app3', ['ui.router']).config(function ($stateProvider, $urlRouterProvider) {
  var colors = {
    sub1: 'pink',
    sub2: 'purple',
    sub3: 'yellow'
  };
  ['sub1', 'sub2', 'sub3'].forEach(function (applicationName) {
    $stateProvider.state(applicationName, {
      url: '/app3/' + applicationName,
      template: '<div style="background-color: ' + colors[applicationName] + '">ui-view / ' + applicationName + '</div>'
    });
  });

  $urlRouterProvider.otherwise('/app3/sub1');
});