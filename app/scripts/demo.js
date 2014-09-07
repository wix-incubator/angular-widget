'use strict';

angular.module('angularWidgetApp', ['angularWidget']).config(function (widgetsProvider, appContainerProvider) {
  appContainerProvider.when('/app1', {
    module: 'containedApp1',
    html: 'views/app.html',
    files: [
      'scripts/controllers/app.js'
    ]
  });
  appContainerProvider.when('/app2', {
    module: 'containedApp2',
    html: 'views/app.html',
    files: [
      'scripts/controllers/app.js'
    ]
  });
  appContainerProvider.otherwise({
    redirectTo: '/app1',
  });


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
