'use strict';

describe('Service: fileLoader', function () {

  // load the service's module
  beforeEach(function () {
    module('angularWidgetInternal');
    module({
      tagAppender: jasmine.createSpy('tagAppender').andCallFake(function (filename) {
        return filename + '.done';
      })
    });
  });

  // instantiate service
  var fileLoader, $rootScope, $q;
  beforeEach(inject(function (_fileLoader_, _$rootScope_, _$q_) {
    fileLoader = _fileLoader_;
    $rootScope = _$rootScope_;
    $q = _$q_;
  }));

  describe('when processing parralel file loading (non-array parameters)', function () {
      it('should handle files and arrays correctly', inject(function (tagAppender) {
        fileLoader.loadFiles(['baroom.aaa', 'garoom.bbb', ['ttt', 'ssss'], []]);
        expect(tagAppender).toHaveBeenCalledWith('baroom.aaa', 'aaa');
        expect(tagAppender).toHaveBeenCalledWith('garoom.bbb', 'bbb');
        expect(tagAppender.calls.length).toBe(2);

      }));

      it('should return a resolved promise on empty array', function () {
        var result = false;
        fileLoader.loadFiles([]).then(function () {
          result = true;
        });
        $rootScope.$digest();
        expect(result).toBe(true);
      });
    });

  describe('when processing sequential file loading', function () {

    function byFileName(filename) {
      return function (file) {
        return file.filename === filename;
      };
    }

    function toFilePromise(file) {
      return file.defer.promise;
    }

    function toFileObj(filename) {
      return {
        filename: filename,
        ext: filename.split('.').reverse()[0],
        defer: $q.defer()
      };
    }

    function toFileName(file) {
       return file.filename;
     }

    function setupTagAppender(files) {
      inject(function (tagAppender) {
        tagAppender.andCallFake(function (filename) {
          return files.filter(byFileName(filename)).map(toFilePromise)[0];
        });
      });
    }

    function expectCallOnlyFor(file) {
      inject(function (tagAppender) {
        expect(tagAppender).toHaveBeenCalledWith(file.filename, file.filename.split('.').reverse()[0]);
        expect(tagAppender.callCount).toBe(1);
        tagAppender.reset();
      });
    }

    function testForFile(file, isResolvedFn) {
      expectCallOnlyFor(file);
      expect(isResolvedFn()).toBe(false);
      file.defer.resolve();
      $rootScope.$digest();
    }

    function runSequentialTests(files, isResolvedFn) {
      inject(function (tagAppender) {
        $rootScope.$digest();

        files.forEach(function (file) {
          testForFile(file, isResolvedFn);
        });

        expect(tagAppender.callCount).toBe(0);
      });
    }

    it('should load files sequentially', function () {
      var files = ['baroom.aaa', 'garoom.bbb', 'chicky.xxx'].map(toFileObj);
      var resolved = false;

      setupTagAppender(files);
      fileLoader.loadFiles([files.map(toFileName)]).then(function () {
        resolved = true;
      });

      runSequentialTests(files, function () { return resolved; });

      expect(resolved).toBe(true);

    });

    function checkForRejection(filename, index, filenames) {
      it('should reject if' + filename + ' failed', function () {

        var files = filenames.map(toFileObj);
        var rejected = false;

        setupTagAppender(files);
        fileLoader.loadFiles([files.map(toFileName)]).catch(function () {
          rejected = true;
        });

        files.forEach(function (currFile, currIndex) {
          if (index === currIndex) {
            currFile.defer.reject();
          } else {
            currFile.defer.resolve();
          }
        });

        $rootScope.$digest();
        expect(rejected).toBe(true);
      });
    }

    ['baroom.aaa', 'garoom.bbb', 'chicky.xxx'].forEach(checkForRejection);

    it('should return an resolved promise on empty array', function () {
      var result = false;
      fileLoader.loadFiles([[]]).then(function () {
        result = true;
      });
      $rootScope.$digest();
      expect(result).toBe(true);
    });

  });

});
