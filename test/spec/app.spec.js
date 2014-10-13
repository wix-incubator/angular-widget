'use strict';

describe('Unit testing routing hacks', function () {
  var $route, notifyWidgets;

  beforeEach(function () {
    module('ngRoute');
    module('angularWidget');

    $route = {current: {$$route: {}}};
    notifyWidgets = jasmine.createSpy('notifyWidgets');
    module({
      widgets: {notifyWidgets: notifyWidgets},
      $route: $route
    });
  });

  it('should notify widgets on location change when route updates', inject(function ($rootScope) {
    notifyWidgets.andCallFake(function () {
      $rootScope.$broadcast('$routeUpdate');
    });
    $rootScope.$broadcast('$routeUpdate');
    expect(notifyWidgets).toHaveBeenCalledWith('$locationChangeSuccess', 'http://server/', '');
  }));

  it('should prevent route change if widget did not change', inject(function ($rootScope) {
    var eventSpy = jasmine.createSpy('$routeChangeSuccess');
    $route.current.locals = {$template: '<ng-widget>'};

    $rootScope.$on('$routeChangeSuccess', eventSpy);
    $rootScope.$broadcast('$routeChangeSuccess');
    expect(eventSpy).toHaveBeenCalled();
    eventSpy.reset();

    $rootScope.$broadcast('$routeChangeSuccess');
    expect(eventSpy).not.toHaveBeenCalled();
    expect(notifyWidgets).toHaveBeenCalledWith('$locationChangeSuccess', 'http://server/', '');
  }));

  it('should not prevent route change if widget changed', inject(function ($rootScope) {
    var eventSpy = jasmine.createSpy('$routeChangeSuccess');
    $route.current.locals = {$template: '<ng-widget>'};

    $rootScope.$on('$routeChangeSuccess', eventSpy);
    $rootScope.$broadcast('$routeChangeSuccess');
    expect(eventSpy).toHaveBeenCalled();
    eventSpy.reset();

    $route.current = {$$route: {}};
    $route.current.locals = {$template: '<ng-widget>'};
    $rootScope.$broadcast('$routeChangeSuccess');
    expect(eventSpy).toHaveBeenCalled();
  }));

  it('should not prevent route change if no widget in template', inject(function ($rootScope) {
    var eventSpy = jasmine.createSpy('$routeChangeSuccess');
    $route.current.locals = {$template: '<shahata>'};

    $rootScope.$on('$routeChangeSuccess', eventSpy);
    $rootScope.$broadcast('$routeChangeSuccess');
    expect(eventSpy).toHaveBeenCalled();
    eventSpy.reset();

    $rootScope.$broadcast('$routeChangeSuccess');
    expect(eventSpy).toHaveBeenCalled();
  }));

  it('should pass all other events', inject(function ($rootScope) {
    var eventSpy = jasmine.createSpy('shahata');
    $rootScope.$on('shahata', eventSpy);
    $rootScope.$broadcast('shahata');
    expect(eventSpy).toHaveBeenCalled();
  }));
});
