'use strict';

describe('Unit testing widget controllers', function () {

  it('should have 5 awesome things', function () {
    module('widget1');
    inject(function ($controller, $rootScope) {
      $controller('Widget1Ctrl', {$scope: $rootScope});
      expect($rootScope.awesomeThings.length).toBe(5);
    });
  });

  it('should have 5 awesome bad things', function () {
    module('widget2');
    inject(function ($controller, $rootScope) {
      $controller('Widget2Ctrl', {$scope: $rootScope});
      expect($rootScope.awesomeThings.length).toBe(5);
    });
  });

});
