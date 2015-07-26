'use strict';

(function () {
  /* @ngInject */
  function FileLoader(tagAppender, $q) {

    function loadSequentially(filenames) {
      return filenames.reduce(function (previousPromise, filename) {
        return previousPromise.then(function () {
          return tagAppender(filename, filename.split('.').reverse()[0]);
        });
      }, $q.when());
    }

    this.loadFiles = function (fileNames) {
      return $q.all(fileNames.map(function (filename) {
        return Array.isArray(filename) ?
          loadSequentially(filename) :
          tagAppender(filename, filename.split('.').reverse()[0]);
      }));
    };
  }

  angular
    .module('angularWidgetInternal')
    .service('fileLoader', FileLoader);

})();
