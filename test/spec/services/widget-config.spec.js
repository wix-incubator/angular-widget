'use strict';

describe('Unit testing widgetConfig service', function () {

  beforeEach(function () {
    module('angularWidgetInternal');
  });

  describe('with parent injector scope', function () {
    var log;

    beforeEach(function () {
      log = '';
      module(function (widgetConfigProvider) {
        widgetConfigProvider.setParentInjectorScope({
          $root: {},
          $apply: function (fn) {
            log += '$apply[';
            fn();
            log += ']';
          },
          $emit: function (name, arg) {
            log += '$emit(' + name + ':' + JSON.stringify(arg) + ')';
            return {};
          }
        });
      });
    });

    it('should export properties', inject(function (widgetConfig) {
      var props = widgetConfig.exportProperties();
      expect(widgetConfig.exportProperties()).toEqual({});
      expect(log).toBe('');
      expect(widgetConfig.exportProperties({abc: 123})).toEqual({abc: 123});
      expect(log).toBe('$apply[$emit(exportPropertiesUpdated:{"abc":123})]');
      log = '';
      expect(widgetConfig.exportProperties({abc: 456})).toEqual({abc: 456});
      expect(log).toBe('$apply[$emit(exportPropertiesUpdated:{"abc":456})]');
      log = '';
      expect(widgetConfig.exportProperties()).toBe(props);
      expect(log).toBe('');
    }));

    it('should report error', inject(function (widgetConfig, $log) {
      widgetConfig.reportError();
      expect(log).toBe('$apply[$emit(widgetError:undefined)]');
      expect($log.warn.logs).toEqual([]);
    }));
  });

  describe('without parent injector scope', function () {
    it('should export properties', inject(function (widgetConfig) {
      var props = widgetConfig.exportProperties();
      expect(widgetConfig.exportProperties()).toEqual({});
      expect(widgetConfig.exportProperties({abc: 123})).toEqual({abc: 123});
      expect(widgetConfig.exportProperties({abc: 456})).toEqual({abc: 456});
      expect(widgetConfig.exportProperties()).toBe(props);
    }));

    it('should report error', inject(function (widgetConfig, $log) {
      widgetConfig.reportError();
      expect($log.warn.logs).toEqual([['widget reported an error']]);
    }));
  });

  it('should get/set options', inject(function (widgetConfig) {
    var options = {a: 1};
    expect(widgetConfig.getOptions()).toEqual({});
    widgetConfig.setOptions(options);
    expect(widgetConfig.getOptions()).toEqual(options);
    expect(widgetConfig.getOptions()).not.toBe(options);
  }));

});
