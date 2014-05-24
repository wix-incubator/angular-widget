'use strict';

describe('Unit testing widgetConfig service', function () {

  beforeEach(function () {
    module('angularWidget');
  });

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

  it('should get/set options', inject(function (widgetConfig) {
    var options = {a: 1};
    expect(widgetConfig.getOptions()).toEqual({});
    widgetConfig.setOptions(options);
    expect(widgetConfig.getOptions()).toEqual(options);
    expect(widgetConfig.getOptions()).not.toBe(options);
  }));

});
