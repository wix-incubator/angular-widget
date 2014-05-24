'use strict';

describe('Unit testing demo app', function () {

  beforeEach(function () {
    module('angularWidgetApp');
  });

  it('should generate manifest', inject(function (widgets) {
    expect(widgets.getWidgetManifest('main')).toEqual({
      module: 'mainWidget',
      html: 'views/main.html',
      files: ['scripts/controllers/main.js', 'bower_components/angular-cookies/angular-cookies.js', 'styles/main.css']
    });

    expect(widgets.getWidgetManifest('bad')).toEqual({
      module: 'badWidget',
      html: 'views/main.html',
      files: ['scripts/controllers/main.js', 'bower_components/angular-cookies/angular-cookies.js', 'styles/main.css']
    });
  }));

});
