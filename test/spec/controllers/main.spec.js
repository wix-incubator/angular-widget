'use strict';

describe('Unit testing widget controllers', function () {

  beforeEach(function () {
    angular.module('ngCookies', []).value('$cookies', {});
  });

  it('should have 5 awesome things', function () {
    module('mainWidget');
    inject(function ($controller, $rootScope) {
      $controller('MainCtrl', {$scope: $rootScope});
      expect($rootScope.awesomeThings.length).toBe(5);
    });
  });

  it('should have 5 awesome bad things', function () {
    module('badWidget');
    inject(function ($controller, $rootScope) {
      $controller('MainCtrl', {$scope: $rootScope});
      expect($rootScope.awesomeThings.length).toBe(5);
    });
  });

});
