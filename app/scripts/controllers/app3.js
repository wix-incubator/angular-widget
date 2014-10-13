'use strict';

angular.module('app3', ['ui.router']).config(function ($stateProvider, $urlRouterProvider) {
  ['sub1', 'sub2', 'sub3'].forEach(function (applicationName) {
    $stateProvider.state(applicationName, {
      url: '/app3/' + applicationName,
      template: '<div>ui-view / ' + applicationName + '</div>'
    });
  });

  $urlRouterProvider.otherwise('/app3/sub1');
});