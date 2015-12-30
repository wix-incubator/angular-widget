/* global navigator, document, window */
'use strict';

angular.module('angularWidgetInternal')
  .value('headElement', document.getElementsByTagName('head')[0])
  .factory('requirejs', function () {
    return window.requirejs || null;
  })
  .value('navigator', navigator)
  .factory('tagAppender', function ($q, $rootScope, headElement, $interval, navigator, $document, requirejs, $browser) {
    var requireCache = {};
    var styleSheets = $document[0].styleSheets;

    function noprotocol(url) {
      return url.replace(/^.*:\/\//, '//');
    }

    return function (url, filetype) {
      var deferred = $q.defer();
      deferred.promise.finally(function () {
        $browser.$$completeOutstandingRequest(angular.noop);
      });
      $browser.$$incOutstandingRequestCount();
      if (requirejs && filetype === 'js') {
        requirejs([url], function (module) {
          $rootScope.$apply(function () {
            deferred.resolve(module);
          });
        }, function (err) {
          $rootScope.$apply(function () {
            deferred.reject(err);
          });
        });
        return deferred.promise;
      }
      if (url in requireCache) {
        requireCache[url].then(function (res) {
          deferred.resolve(res);
        }, function (res) {
          deferred.reject(res);
        });
        return deferred.promise;
      }
      requireCache[url] = deferred.promise;

      var fileref;
      if (filetype === 'css') {
        fileref = angular.element('<link></link>')[0];
        fileref.setAttribute('rel', 'stylesheet');
        fileref.setAttribute('type', 'text/css');
        fileref.setAttribute('href', url);
      } else {
        fileref = angular.element('<script></script>')[0];
        fileref.setAttribute('type', 'text/javascript');
        fileref.setAttribute('src', url);
      }

      var done = false;
      headElement.appendChild(fileref);
      fileref.onerror = function () {
        fileref.onerror = fileref.onload = fileref.onreadystatechange = null;
        delete requireCache[url];
        //the $$phase test is required due to $interval mock, should be removed when $interval is fixed
        if ($rootScope.$$phase) {
          deferred.reject();
        } else {
          $rootScope.$apply(function () {
            deferred.reject();
          });
        }
      };
      fileref.onload = fileref.onreadystatechange = function () {
        if (!done && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete')) {
          done = true;
          fileref.onerror = fileref.onload = fileref.onreadystatechange = null;

          //the $$phase test is required due to $interval mock, should be removed when $interval is fixed
          if ($rootScope.$$phase) {
            deferred.resolve();
          } else {
            $rootScope.$apply(function () {
              deferred.resolve();
            });
          }
        }
      };
      if (filetype === 'css' && navigator.userAgent.match(' Safari/') && !navigator.userAgent.match(' Chrom') && navigator.userAgent.match(' Version/5.')) {
        var attempts = 20;
        var promise = $interval(function checkStylesheetAttempt() {
          for (var i = 0; i < styleSheets.length; i++) {
            if (noprotocol(styleSheets[i].href + '') === noprotocol(url)) {
              $interval.cancel(promise);
              fileref.onload();
              return;
            }
          }
          if (--attempts === 0) {
            $interval.cancel(promise);
            fileref.onerror();
          }
        }, 50, 0); //need to be false in order to not invoke apply... ($interval bug)
      }

      return deferred.promise;
    };
  });
