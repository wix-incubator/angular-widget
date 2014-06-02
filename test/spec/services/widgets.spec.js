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
    var applySpy = jasmine.createSpy('$apply').andCallFake(function (fn) { fn(); });
    var broadcastSpy = jasmine.createSpy('$broadcastSpy');
    widgets.registerWidget({get: function (name) {
      expect(name).toBe('$rootScope');
      return {$apply: applySpy, $broadcast: broadcastSpy};
    }});
    widgets.notifyWidgets(1, 2, 3);
    expect(applySpy).toHaveBeenCalled();
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
