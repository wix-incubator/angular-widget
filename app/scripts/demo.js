'use strict';

angular.module('angularWidgetApp', ['angularWidget']).config(function (widgetsProvider) {
  widgetsProvider.setManifestGenerator(function (name) {
    return {
      module: name + 'Widget',
      html: 'views/' + name + '.html',
      files: [
        'scripts/controllers/' + name + '.js',
        'styles/' + name + '.css'
      ]
    };
  });
});
