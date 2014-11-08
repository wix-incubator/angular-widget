'use strict';

describe('Unit testing widget container', function () {

  beforeEach(function () {
    module('app1');
    module('app2');
    module('app3');
  });

  describe('widgetContainer', function () {
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

    it('should have a manifest generator', inject(function (widgets) {
      expect(widgets.getWidgetManifest('shahata')).toEqual({
        module: 'shahata',
        html: 'views/shahata.html',
        files: [
          'scripts/controllers/shahata.js',
          'styles/shahata.css'
        ]
      });
    }));
  });

  describe('widgetsList', function () {
    it('should have one widget by default', inject(function ($controller, $rootScope) {
      $controller('widgetsList', {$scope: $rootScope});
      expect($rootScope.widgets.length).toBe(1);
    }));

    it('should add one widget', inject(function ($controller, $rootScope) {
      $controller('widgetsList', {$scope: $rootScope});
      $rootScope.addWidget('aaa', 1);
      expect($rootScope.widgets.length).toBe(2);
    }));

    it('should add one hundred widget', inject(function ($controller, $rootScope) {
      $controller('widgetsList', {$scope: $rootScope});
      $rootScope.addWidget('aaa', 100);
      expect($rootScope.widgets.length).toBe(101);
    }));

    it('should restore one widget', inject(function ($controller, $rootScope) {
      $controller('widgetsList', {$scope: $rootScope});
      $rootScope.widgets = [];
      $rootScope.addWidget('aaa', 1);
      expect($rootScope.widgets.length).toBe(1);
    }));
  });

});
