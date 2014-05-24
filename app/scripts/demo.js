'use strict';

angular.module('angularWidgetApp', ['angularWidget']).config(function (widgetsProvider) {
  widgetsProvider.setManifestGenerator(function () {
    return function (name) {
      var fileName = (name === 'bad' ? 'main' : name);
      return {
        module: name + 'Widget',
        html: 'views/' + fileName + '.html',
        files: [
          'scripts/controllers/' + fileName + '.js',
          'bower_components/angular-cookies/angular-cookies.js',
          'styles/' + fileName + '.css'
        ]
      };
    };
  });
});
