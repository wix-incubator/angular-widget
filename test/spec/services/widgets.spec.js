'use strict';

describe('Unit testing widgets service', function () {

  beforeEach(function () {
    module('angularWidgetInternal');
  });

  describe('manifest generators', function () {
    it('should set manifest generator', function () {
      module(function (widgetsProvider) {
        widgetsProvider.setManifestGenerator(function () { return angular.identity; });
      });
      inject(function (widgets) {
        expect(widgets.getWidgetManifest('shahata')).toBe('shahata');
      });
    });

    it('should invoke generators with injector', function () {
      module(function (widgetsProvider) {
        widgetsProvider.setManifestGenerator(function ($q) {
          return function () { return $q; };
        });
      });
      inject(function (widgets, $q) {
        expect(widgets.getWidgetManifest('shahata')).toBe($q);
      });
    });

    it('should only take last generator into account', function () {
      module(function (widgetsProvider) {
        widgetsProvider.setManifestGenerator(function () { return angular.identity; });
        widgetsProvider.setManifestGenerator(function () {
          return function () { return 'shahar'; };
        });
      });
      inject(function (widgets) {
        expect(widgets.getWidgetManifest('shahata')).toBe('shahar');
      });
    });

    it('should take last generator into account only if it is not undefined', function () {
      module(function (widgetsProvider) {
        widgetsProvider.setManifestGenerator(function () { return angular.identity; });
        widgetsProvider.setManifestGenerator(function () {
          return function () { return undefined; };
        });
      });
      inject(function (widgets) {
        expect(widgets.getWidgetManifest('shahata')).toBe('shahata');
      });
    });

    it('should take generator with higher priority', function () {
      module(function (widgetsProvider) {
        widgetsProvider.setManifestGenerator(function () {
          return function () { return {priority: 2, name: 'shahata'}; };
        });
        widgetsProvider.setManifestGenerator(function () {
          return function () { return {priority: 1, name: 'shahar'}; };
        });
      });
      inject(function (widgets) {
        expect(widgets.getWidgetManifest('shahata')).toEqual({priority: 2, name: 'shahata'});
      });
    });
  });

  describe('notify widgets', function () {
    it('should notify widgets when notifyWidgets is invoked', inject(function (widgets) {
      var digestSpy = jasmine.createSpy('$digest');
      widgets.registerWidget({get: function (name) {
        expect(name).toBe('$rootScope');
        return {$digest: digestSpy};
      }});
      widgets.notifyWidgets();
      expect(digestSpy).toHaveBeenCalled();
    }));

    it('should broadcast event when notifyWidgets is invoked with args', inject(function (widgets) {
      var digestSpy = jasmine.createSpy('$digest');
      var broadcastSpy = jasmine.createSpy('$broadcastSpy').andReturn('shahata');
      widgets.registerWidget({get: function (name) {
        expect(name).toBe('$rootScope');
        return {$digest: digestSpy, $broadcast: broadcastSpy};
      }});
      expect(widgets.notifyWidgets(1, 2, 3)).toEqual(['shahata']);
      expect(digestSpy).toHaveBeenCalled();
      expect(broadcastSpy).toHaveBeenCalledWith(1, 2, 3);
    }));

    it('should not call digest in case the caller injector is himself', inject(function (widgets, $injector) {
      var digestSpy = jasmine.createSpy('$digest');
      widgets.registerWidget($injector);
      widgets.notifyWidgets();
      expect(digestSpy).not.toHaveBeenCalled();
    }));

    it('should call broadcast in case the caller injector is himself', inject(function (widgets, $injector) {
      var scope = $injector.get('$rootScope');
      var broadcastSpy = spyOn(scope, '$broadcast');
      widgets.registerWidget($injector);
      widgets.notifyWidgets(1, 2, 3);
      expect(broadcastSpy).toHaveBeenCalledWith(1, 2, 3);
    }));
  });

  describe('service sharing', function () {
    it('should not trigger digest if arguments count is less than minimum', function () {
      var spy = jasmine.createSpy('hooked');
      module(function (widgetsProvider) {
        widgetsProvider.addServiceToShare('shahata', {method: 4});
      }, {shahata: {method: spy}});
      inject(function (widgets, shahata, $rootScope) {
        shahata.method(1, 2, 3);
        expect(spy).toHaveBeenCalledWith(1, 2, 3);
        expect($rootScope.$$asyncQueue.length).toBe(0);
      });
    });

    it('should trigger digest if setter is called', function () {
      var spy = jasmine.createSpy('hooked');
      module(function (widgetsProvider) {
        widgetsProvider.addServiceToShare('shahata', {method: 3});
      }, {shahata: {method: spy}});
      inject(function (widgets, shahata, $rootScope) {
        shahata.method(1, 2, 3);
        expect(spy).toHaveBeenCalledWith(1, 2, 3);
        expect($rootScope.$$asyncQueue.length).toBe(1);
      });
    });

    it('should not trigger digest if we are during digest', function () {
      var spy = jasmine.createSpy('hooked');
      module(function (widgetsProvider) {
        widgetsProvider.addServiceToShare('shahata', {method: 3});
      }, {shahata: {method: spy}});
      inject(function (widgets, shahata, $rootScope) {
        $rootScope.$apply(function () {
          shahata.method(1, 2, 3);
        });
        expect(spy).toHaveBeenCalledWith(1, 2, 3);
        expect($rootScope.$$asyncQueue.length).toBe(0);
      });
    });

    it('should trigger digest no matter the arguments count', function () {
      var spy = jasmine.createSpy('hooked');
      module(function (widgetsProvider) {
        widgetsProvider.addServiceToShare('shahata', ['method']);
      }, {shahata: {method: spy}});
      inject(function (widgets, shahata, $rootScope) {
        shahata.method();
        expect($rootScope.$$asyncQueue.length).toBe(1);
      });
    });

  });

  describe('widget registration', function () {
    it('should handle bad unregister of widget gracefully', inject(function (widgets) {
      try {
        widgets.unregisterWidget({a: 1});
      } catch (e) {
        expect(false).toBeTruthy();
      }
    }));

    it('should unregister single widget correctly', inject(function (widgets) {
      var digestSpy1 = jasmine.createSpy('$digest1');
      var digestSpy2 = jasmine.createSpy('$digest2');
      var destroySpy1 = jasmine.createSpy('$destroy1');
      var destroySpy2 = jasmine.createSpy('$destroy2');
      var injector1 = {get: function () { return {$digest: digestSpy1, $destroy: destroySpy1}; }};
      var injector2 = {get: function () { return {$digest: digestSpy2, $destroy: destroySpy2}; }};

      widgets.registerWidget(injector1);
      widgets.registerWidget(injector2);

      widgets.unregisterWidget(injector1);
      expect(destroySpy1).toHaveBeenCalled();
      expect(destroySpy2).not.toHaveBeenCalled();

      widgets.notifyWidgets();
      expect(digestSpy1).not.toHaveBeenCalled();
      expect(digestSpy2).toHaveBeenCalled();
    }));

    it('should unregister all widgets correctly', inject(function (widgets) {
      var digestSpy1 = jasmine.createSpy('$digest1');
      var digestSpy2 = jasmine.createSpy('$digest2');
      var destroySpy1 = jasmine.createSpy('$destroy1');
      var destroySpy2 = jasmine.createSpy('$destroy2');
      var injector1 = {get: function () { return {$digest: digestSpy1, $destroy: destroySpy1}; }};
      var injector2 = {get: function () { return {$digest: digestSpy2, $destroy: destroySpy2}; }};

      widgets.registerWidget(injector1);
      widgets.registerWidget(injector2);

      widgets.unregisterWidget();
      expect(destroySpy1).toHaveBeenCalled();
      expect(destroySpy2).toHaveBeenCalled();

      widgets.notifyWidgets();
      expect(digestSpy1).not.toHaveBeenCalled();
      expect(digestSpy2).not.toHaveBeenCalled();
    }));
  });

});
