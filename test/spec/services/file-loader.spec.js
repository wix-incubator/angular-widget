'use strict';

describe('Service: fileLoader', function () {
  var pendingFiles, $rootScope;

  beforeEach(function () {
    pendingFiles = [];

    module('angularWidgetInternal');
    module({
      tagAppender: jasmine.createSpy('tagAppender').and.callFake(function () {
        var defer;
        inject(function ($q) {
          defer = $q.defer();
        });
        pendingFiles.push(defer);
        return defer.promise;
      })
    });
  });

  beforeEach(inject(function (_$rootScope_) {
    $rootScope = _$rootScope_;
  }));

  function flushPromises(count) {
    for (var i = 0; i < count; i++) {
      pendingFiles.shift().resolve();
    }
    $rootScope.$digest();
  }

  function flushCalls(filenames) {
    inject(function (tagAppender) {
      filenames.forEach(function (filename) {
        expect(tagAppender).toHaveBeenCalledWith(filename, jasmine.any(String));
      });
      expect(tagAppender.calls.count()).toBe(filenames.length);
      tagAppender.calls.reset();
      flushPromises(filenames.length);
    });
  }

  function rejectPromise() {
    pendingFiles.shift().reject();
    $rootScope.$digest();
  }

  function loadFiles(filenames) {
    var promise;
    inject(function (fileLoader) {
      promise = fileLoader.loadFiles(filenames);
      $rootScope.$digest();
    });
    return promise;
  }

  it('should extract extension from loaded file', inject(function (tagAppender) {
    loadFiles(['a.js']);
    expect(tagAppender).toHaveBeenCalledWith('a.js', 'js');
  }));

  it('should load files in parallel', function () {
    var spy = jasmine.createSpy('filesLoaded');
    loadFiles(['a.js', 'b.js']).then(spy);
    flushCalls(['a.js', 'b.js']);
    expect(spy).toHaveBeenCalled();
  });

  it('should fail if one of the files failed to load', function () {
    var spy = jasmine.createSpy('filesFailed');
    loadFiles(['a.js', 'b.js']).catch(spy);
    rejectPromise();
    expect(spy).toHaveBeenCalled();
  });

  it('should load nested array serially', function () {
    var spy = jasmine.createSpy('filesLoaded');
    loadFiles([['a.js', 'b.js']]).then(spy);
    flushCalls(['a.js']);
    flushCalls(['b.js']);
    expect(spy).toHaveBeenCalled();
  });

  it('should fail if one of the sequential files failed to load', function () {
    var spy = jasmine.createSpy('filesFailed');
    loadFiles([['a.js', 'b.js']]).catch(spy);
    rejectPromise();
    expect(spy).toHaveBeenCalled();
  });

  it('should handle files and arrays correctly', function () {
    var spy = jasmine.createSpy('filesFailed');
    loadFiles(['a.js', 'b.js', ['c.js', 'd.js'], ['c.css', 'd.css']]).then(spy);
    flushCalls(['a.js', 'b.js', 'c.js', 'c.css']);
    flushCalls(['d.js', 'd.css']);
    expect(spy).toHaveBeenCalled();
  });

});
