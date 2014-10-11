'use strict';

describe('Unit testing routing hacks', function () {

  beforeEach(function () {
    module('ngRoute');
    module('angularWidget');
  });

  it('should prevent route change if widget did not change', function () {
    var $route = {};
    var notifyWidgets = jasmine.createSpy('notifyWidgets');
    module({
      widgets: {notifyWidgets: notifyWidgets},
      $route: $route
    });
    inject(function ($rootScope) {
      var eventSpy = jasmine.createSpy('$routeChangeSuccess');
      var eventSpy2 = jasmine.createSpy('shahata');

      $rootScope.$on('$routeChangeSuccess', eventSpy);
      $rootScope.$on('shahata', eventSpy2);
      $rootScope.$broadcast('$routeChangeSuccess');
      $rootScope.$broadcast('shahata');
      expect(eventSpy).toHaveBeenCalled();
      expect(eventSpy2).toHaveBeenCalled();
      eventSpy.reset();

      $route.current = {};
      $rootScope.$on('$routeChangeSuccess', eventSpy);
      $rootScope.$broadcast('$routeChangeSuccess');
      expect(eventSpy).toHaveBeenCalled();
      eventSpy.reset();

      $route.current.locals = {};
      $rootScope.$on('$routeChangeSuccess', eventSpy);
      $rootScope.$broadcast('$routeChangeSuccess');
      expect(eventSpy).toHaveBeenCalled();
      eventSpy.reset();

      $route.current.locals.appName = 'shahata';
      $rootScope.$on('$routeChangeSuccess', eventSpy);
      $rootScope.$broadcast('$routeChangeSuccess');
      expect(eventSpy).toHaveBeenCalled();
      eventSpy.reset();

      $rootScope.$on('$routeChangeSuccess', eventSpy);
      $rootScope.$broadcast('$routeChangeSuccess');
      expect(eventSpy).not.toHaveBeenCalled();
      expect(notifyWidgets).toHaveBeenCalledWith('$locationChangeSuccess', 'http://server/', '');
    });
  });

});
