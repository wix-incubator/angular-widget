/* global requirejs */
'use strict';

describe('Unit testing tagAppender service', function () {
  var headElement;

  beforeEach(function () {
    module('angularWidgetInternal');
    module({
      headElement: headElement = jasmine.createSpyObj('headElement', ['appendChild']),
      requirejs: undefined
    });
  });

  describe('Loading with requirejs when available and headElement is head', function () {

    var moduleName = 'base/test/mock/mock-lazyloaded-file.js';

    beforeEach(function () {
      //Restoring the head element makes requirejs come into action
      module({
        headElement: window.document.getElementsByTagName('head')[0],
        requirejs: requirejs
      });
    });

    beforeEach(function () {
      inject(function ($window) {
        delete $window.lazyLoadingWorking;
      });
    });

    afterEach(inject(function ($window) {
      $window.requirejs.undef(moduleName);
    }));

    it('should load the javascript files', function (done) {
      inject(function (tagAppender, $window) {
        expect($window.lazyLoadingWorking).toBeFalsy();
        tagAppender(moduleName, 'js').then(function () {
          expect($window.lazyLoadingWorking).toBe(true);
          done();
        });
      });
    });

    it('should fail when file doesn\'t exist', function (done) {
      inject(function (tagAppender) {
        tagAppender('base/test/mock/non-existing-file.js', 'js').catch(done);
      });
    });

    it('should not fail when same file loads two times', function (done) {
      inject (function (tagAppender, $window) {
        expect($window.lazyLoadingWorking).toBeFalsy();
        tagAppender(moduleName, 'js').then(function () {
          tagAppender(moduleName, 'js').then(function () {
            expect($window.lazyLoadingWorking).toBe(true);
            done();
          });
        });
      });
    });
  });

  it('should append script tag when js file is added', inject(function (tagAppender) {
    tagAppender('dummy.js', 'js');
    expect(headElement.appendChild.calls.count()).toBe(1);
    expect(headElement.appendChild.calls.first().args[0].outerHTML)
      .toBe('<script type="text/javascript" src="dummy.js"></script>');
  }));

  it('should load the file only once in case the same file is loaded multiple times simultaneously ', inject (function (tagAppender) {
    tagAppender('dummy.js', 'js');
    tagAppender('dummy.js', 'js');
    expect(headElement.appendChild.calls.count()).toBe(1);
  }));

  it('should re try to download the file in case first attempt failed', inject (function (tagAppender) {
    var secondAttemptSuccess = jasmine.createSpy('secondAttemptSuccess');

    tagAppender('dummy.js', 'js').catch(function () {
      tagAppender('dummy.js', 'js').then(secondAttemptSuccess);
      simulateLoadSuccessOnCall(1);
    });

    simulateLoadErrorOnCall(0);
    expect(secondAttemptSuccess).toHaveBeenCalled();
  }));

  it('should append link tag when css file is added', inject(function (tagAppender) {
    tagAppender('dummy.css', 'css');
    expect(headElement.appendChild.calls.count()).toBe(1);
    expect(headElement.appendChild.calls.first().args[0].outerHTML)
      .toBe('<link rel="stylesheet" type="text/css" href="dummy.css">');
  }));

  it('should poll stylesheets in safari 5', function () {
    module(function ($provide) {
      $provide.value('navigator', {userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/534.57.2 (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2'});
      $provide.value('$document', [{styleSheets: []}]);
    });
    inject(function (tagAppender, $document, $interval, $rootScope) {
      var success = jasmine.createSpy('success');
      tagAppender('dummy.css', 'css').then(success);

      $document[0].styleSheets.push({href: 'not-dummy.css'});
      $interval.flush(50);
      $rootScope.$digest();
      expect(success).not.toHaveBeenCalled();

      $document[0].styleSheets.push({href: 'dummy.css'});
      $interval.flush(50);
      $rootScope.$digest();
      expect(success).toHaveBeenCalled();
    });
  });

  it('should poll stylesheets in safari 5 ignoring protocol', function () {
    module(function ($provide) {
      $provide.value('navigator', {userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/534.57.2 (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2'});
      $provide.value('$document', [{styleSheets: []}]);
    });
    inject(function (tagAppender, $document, $interval, $rootScope) {
      var success = jasmine.createSpy('success');
      tagAppender('//static.wix.com/dummy.css', 'css').then(success);

      $document[0].styleSheets.push({href: 'http://static.wix.com/not-dummy.css'});
      $document[0].styleSheets.push({href: null});
      $interval.flush(50);
      $rootScope.$digest();
      expect(success).not.toHaveBeenCalled();

      $document[0].styleSheets.push({href: 'http://static.wix.com/dummy.css'});
      $interval.flush(50);
      $rootScope.$digest();
      expect(success).toHaveBeenCalled();
    });
  });

  it('should fail stylesheets polling after timeout', function () {
    module(function ($provide) {
      $provide.value('navigator', {userAgent: 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/534.57.2 (KHTML, like Gecko) Version/5.1.7 Safari/534.57.2'});
      $provide.value('$document', [{styleSheets: []}]);
    });
    inject(function (tagAppender, $document, $interval, $rootScope) {
      var error = jasmine.createSpy('error');
      tagAppender('dummy.css', 'css').catch(error);
      $interval.flush(1000);
      $rootScope.$digest();
      expect(error).toHaveBeenCalled();
    });
  });

  it('should resolve the promise when onload is invoked', inject(function (tagAppender) {
    var success = jasmine.createSpy('success');
    tagAppender('dummy.js', 'js').then(success);
    headElement.appendChild.calls.first().args[0].onload();
    expect(success).toHaveBeenCalled();
  }));

  it('should block protractor while script is still downloading', function () {
    //must create different injector since injector created by inject() includes
    //ngMock, which replaces $browser.notifyWhenNoOutstandingRequests() with
    //implementation which immediately invokes callback no matter what
    var $injector = angular.injector(['ng', 'angularWidgetInternal', function ($provide) {
      $provide.value('headElement', headElement);
      $provide.value('requirejs', undefined);
    }]);

    $injector.invoke(function (tagAppender, $browser) {
      var protractor = jasmine.createSpy('protractor');
      tagAppender('dummy.js', 'js');
      $browser.notifyWhenNoOutstandingRequests(protractor);
      expect(protractor).not.toHaveBeenCalled();
      headElement.appendChild.calls.first().args[0].onload();
      expect(protractor).toHaveBeenCalled();
    });
  });

  it('should reject the promise when onerror is invoked', inject(function (tagAppender) {
    var error = jasmine.createSpy('error');
    tagAppender('dummy.js', 'js').catch(error);
    headElement.appendChild.calls.first().args[0].onerror();
    expect(error).toHaveBeenCalled();
  }));

  it('should download each file only once', inject(function (tagAppender, $rootScope) {
    tagAppender('dummy.js', 'js');
    headElement.appendChild.calls.first().args[0].onload();

    var success = jasmine.createSpy('success');
    tagAppender('dummy.js', 'js').then(success);
    $rootScope.$digest();
    expect(success).toHaveBeenCalled();
  }));

  it('should be compatible with IE readyState', inject(function (tagAppender) {
    var success = jasmine.createSpy('success');
    tagAppender('dummy.js', 'js').then(success);
    var callLater = headElement.appendChild.calls.first().args[0].onload;

    headElement.appendChild.calls.first().args[0].readyState = 'loading';
    headElement.appendChild.calls.first().args[0].onreadystatechange();
    expect(success).not.toHaveBeenCalled();

    headElement.appendChild.calls.first().args[0].readyState = 'loaded';
    headElement.appendChild.calls.first().args[0].onreadystatechange();
    expect(headElement.appendChild.calls.first().args[0].onreadystatechange).toBe(null);
    expect(success).toHaveBeenCalled();

    callLater();
    expect(success.calls.count()).toBe(1);
  }));

  function simulateLoadSuccessOnCall(callIndex) {
    headElement.appendChild.calls.argsFor(callIndex)[0].onload();
  }

  function simulateLoadErrorOnCall(callIndex) {
    headElement.appendChild.calls.argsFor(callIndex)[0].onerror();
  }

});
