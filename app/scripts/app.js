/* global window */
'use strict';

angular.module('angularWidget', [])
  .run(function ($injector) {
    if (!window.angularWidget) {
      var stuffToOverride = ['$location'];
      window.angularWidget = stuffToOverride.reduce(function (obj, injectable) {
        obj[injectable] = $injector.get(injectable);
        return obj;
      }, {});
    }
  })
  .config(function ($provide) {
    if (window.angularWidget) {
      angular.forEach(window.angularWidget, function (value, key) {
        $provide.constant(key, value);
      });
    }
  });
