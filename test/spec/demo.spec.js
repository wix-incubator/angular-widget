'use strict';

describe('Unit testing demo app', function () {

  beforeEach(function () {
    module('angularWidgetApp');
  });

  it('should generate manifest', inject(function (widgets) {
    expect(widgets.getWidgetManifest('widget1')).toEqual({
      module: 'widget1',
      html: 'views/widget1.html',
      files: ['scripts/controllers/widget1.js', 'styles/widget1.css']
    });

    expect(widgets.getWidgetManifest('widget2')).toEqual({
      module: 'widget2',
      html: 'views/widget2.html',
      files: ['scripts/controllers/widget2.js', 'styles/widget2.css']
    });
  }));

});
