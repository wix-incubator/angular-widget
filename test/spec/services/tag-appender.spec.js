'use strict';

describe('Unit testing tagAppender service', function () {
  var headElement;

  beforeEach(function () {
    module('angularWidgetInternal');
    module({
      headElement: headElement = jasmine.createSpyObj('headElement', ['appendChild'])
    });
  });

  it('should append script tag when js file is added', inject(function (tagAppender) {
    tagAppender('dummy.js', 'js');
    expect(headElement.appendChild.calls.length).toBe(1);
    expect(headElement.appendChild.calls[0].args[0].outerHTML)
      .toBe('<script type="text/javascript" src="dummy.js"></script>');
  }));

  it('should append link tag when css file is added', inject(function (tagAppender) {
    tagAppender('dummy.css', 'css');
    expect(headElement.appendChild.calls.length).toBe(1);
    expect(headElement.appendChild.calls[0].args[0].outerHTML)
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
    headElement.appendChild.calls[0].args[0].onload();
    expect(success).toHaveBeenCalled();
  }));

  it('should reject the promise when onerror is invoked', inject(function (tagAppender) {
    var error = jasmine.createSpy('error');
    tagAppender('dummy.js', 'js').catch(error);
    headElement.appendChild.calls[0].args[0].onerror();
    expect(error).toHaveBeenCalled();
  }));

  it('should download each file only once', inject(function (tagAppender, $rootScope) {
    tagAppender('dummy.js', 'js');
    headElement.appendChild.calls[0].args[0].onload();

    var success = jasmine.createSpy('success');
    tagAppender('dummy.js', 'js').then(success);
    $rootScope.$digest();
    expect(success).toHaveBeenCalled();
  }));

  it('should be compatible with IE readyState', inject(function (tagAppender) {
    var success = jasmine.createSpy('success');
    tagAppender('dummy.js', 'js').then(success);
    var callLater = headElement.appendChild.calls[0].args[0].onload;

    headElement.appendChild.calls[0].args[0].readyState = 'loading';
    headElement.appendChild.calls[0].args[0].onreadystatechange();
    expect(success).not.toHaveBeenCalled();

    headElement.appendChild.calls[0].args[0].readyState = 'loaded';
    headElement.appendChild.calls[0].args[0].onreadystatechange();
    expect(headElement.appendChild.calls[0].args[0].onreadystatechange).toBe(null);
    expect(success).toHaveBeenCalled();

    callLater();
    expect(success.calls.length).toBe(1);
  }));

});
