'use strict';

describe('Unit testing widget container', function () {

  beforeEach(function () {
    module('angularWidgetApp');
  });

  it('should start as loading', inject(function ($controller, $rootScope) {
    $controller('widgetContainer', {$scope: $rootScope});
    expect($rootScope.isLoading).toBeTruthy();
  }));

  it('should set title', inject(function ($controller, $rootScope) {
    $controller('widgetContainer', {$scope: $rootScope});
    $rootScope.$broadcast('exportPropertiesUpdated', {title: 'shahata'});
    expect($rootScope.title).toBe('shahata');
  }));

  it('should set loaded', inject(function ($controller, $rootScope) {
    $controller('widgetContainer', {$scope: $rootScope});
    $rootScope.$broadcast('widgetLoaded');
    expect($rootScope.isLoading).toBeFalsy();
    expect($rootScope.isError).toBeFalsy();
  }));

  it('should set error', inject(function ($controller, $rootScope) {
    $controller('widgetContainer', {$scope: $rootScope});
    $rootScope.$broadcast('widgetError');
    expect($rootScope.isLoading).toBeFalsy();
    expect($rootScope.isError).toBeTruthy();
  }));

  it('should reload', inject(function ($controller, $rootScope) {
    var spy = jasmine.createSpy('reload');
    $controller('widgetContainer', {$scope: $rootScope});
    $rootScope.$on('reloadWidget', spy);
    $rootScope.reload();
    expect($rootScope.isLoading).toBeTruthy();
    expect($rootScope.isError).toBeFalsy();
    expect(spy).toHaveBeenCalled();
  }));

});
