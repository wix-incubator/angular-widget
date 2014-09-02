'use strict';

describe('Unit testing widgets service', function () {

  beforeEach(function () {
    module('angularWidget');
  });

  it('should set manifest generator', function () {
    var spy = jasmine.createSpy('manifestGenerator');
    module(function (widgetsProvider) {
      widgetsProvider.setManifestGenerator(function () { return spy; });
    });
    inject(function (widgets) {
      widgets.getWidgetManifest('shahata');
      expect(spy).toHaveBeenCalledWith('shahata');
    });
  });

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
