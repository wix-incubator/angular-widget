'use strict';

describe('Unit testing ngWidget directive', function () {
  var widgetInjector, widgetConfig, widgetIsLoading, widgets, spies, element;

  beforeEach(function () {
    widgetIsLoading = false;
    angular.module('dummyWidget', []).run(function (widgetConfig) {
      if (widgetIsLoading) {
        widgetConfig.exportProperties({loading: true});
      } else {
        widgetConfig.exportProperties({prop: 123});
      }
    });

    module('angularWidgetInternal');

    module({
      fileLoader: {
        loadFiles: jasmine.createSpy()
      }
    }, function (widgetsProvider) {
      widgetsProvider.setManifestGenerator(function ($q) {
        return function manifestGenerator(name) {
          if (name === 'promise') {
            return $q.when(manifestGenerator('dummy'));
          }
          return {
            module: name + 'Widget',
            html: 'views/' + name + '-widget.html',
            files: [
              'scripts/' + name + '-widget.js',
              'styles/' + name + '-widget.css'
            ]
          };
        };
      });

      widgetsProvider.addServiceToShare('$location');
      widgetsProvider.addEventToForward('$locationChangeStart');
      widgetsProvider.addEventToForward('someEventToForward');
    });
  });

  function downloadWidgetSuccess(name) {
    inject(function ($q, $httpBackend, fileLoader) {
      $httpBackend.expectGET('views/' + (name || 'dummy') + '-widget.html')
        .respond('<div ng-bind="\'123\'"></div>');
      fileLoader.loadFiles.andReturn($q.when());
    });
  }

  function compileWidget(scope, delay) {
    inject(function ($compile, $rootScope, _widgets_) {
      widgets = _widgets_;
      spyOn(widgets, 'registerWidget').andCallThrough();
      spyOn(widgets, 'unregisterWidget').andCallThrough();

      scope = scope || $rootScope;
      scope.widget = scope.widget || 'dummy';
      element = $compile('<ng-widget src="widget" options="options"' +
        (delay === undefined ? '' : ' delay="' + delay + '"') +
        '></ng-widget>')(scope);

      spies = jasmine.createSpyObj('spies', ['exportPropertiesUpdated', 'widgetLoaded', 'widgetError']);
      $rootScope.$on('exportPropertiesUpdated', spies.exportPropertiesUpdated);
      $rootScope.$on('widgetLoaded', spies.widgetLoaded);
      $rootScope.$on('widgetError', spies.widgetError);
    });
  }

  function flushDownload() {
    inject(function ($httpBackend) {
      $httpBackend.flush();
      widgetInjector = element.find('div').injector();
      widgetConfig = widgetInjector && widgetInjector.get('widgetConfig');
    });
  }

  it('should load the widget into the element with different injector', function () {
    downloadWidgetSuccess();
    compileWidget();

    flushDownload();

    expect(element.find('div').html()).toBe('123');
    expect(element.injector()).not.toBe(widgetInjector);
    expect(widgets.registerWidget).toHaveBeenCalledWith(widgetInjector);

    expect(widgetConfig.getOptions()).toEqual({});
  });

  it('should allow manifest generator to return a promise', inject(function ($rootScope) {
    $rootScope.widget = 'promise';
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();
    expect(element.find('div').html()).toBe('123');
  }));

  it('should respect delay attribute', inject(function ($timeout) {
    downloadWidgetSuccess();
    compileWidget(undefined, 1000);

    flushDownload();
    expect(widgetInjector).toBeUndefined();

    $timeout.flush(1000);
    widgetInjector = element.find('div').injector();
    expect(widgetInjector).toBeDefined();
  }));

  it('should respect delay attribute for errors too', inject(function ($httpBackend, $timeout) {
    $httpBackend.expectGET('views/dummy-widget.html').respond(500, 'wtf');
    compileWidget(undefined, 1000);

    flushDownload();
    expect(spies.widgetError).not.toHaveBeenCalled();

    $timeout.flush(1000);
    expect(spies.widgetError).toHaveBeenCalled();
  }));

  it('should share services that were declared as shared', inject(function ($rootScope, $location) {
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();

    expect(widgetInjector.get('$rootScope')).not.toBe($rootScope);
    expect(widgetInjector.get('$location')).toBe($location);
  }));

  it('should forward events that were declared as forwarded', inject(function ($rootScope) {
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();

    var widgetScope = widgetInjector.get('$rootScope');
    var eventSpy = jasmine.createSpy('$locationChangeStart');
    var eventSpy2 = jasmine.createSpy('$locationChangeSuccess');
    var watchSpy = jasmine.createSpy('watchSpy');

    widgetScope.$on('$locationChangeStart', eventSpy);
    widgetScope.$on('$locationChangeSuccess', eventSpy2);
    widgetScope.$watch(watchSpy, angular.noop);

    $rootScope.$broadcast('$locationChangeStart', 1, 2, 3);
    $rootScope.$broadcast('$locationChangeSuccess', 1, 2, 3);

    expect(eventSpy).toHaveBeenCalledWith(jasmine.any(Object), 1, 2, 3);
    expect(eventSpy2).not.toHaveBeenCalled();
    expect(watchSpy).toHaveBeenCalled();
  }));

  it('should call forward events handler while running main scope\'s $digest cycle', inject(function ($rootScope) {
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();

    var widgetScope = widgetInjector.get('$rootScope');
    var event1Handler = jasmine.createSpy('$locationChangeStart');
    var event2Handler = jasmine.createSpy('someEventToForward');

    $rootScope.$on('someEventToForward', event2Handler);
    $rootScope.$on('$locationChangeStart', event1Handler.andCallFake(function () {
      widgetScope.$emit('someEventToForward');
    }));

    widgetScope.$emit('$locationChangeStart');

    expect(event1Handler).toHaveBeenCalledWith(jasmine.any(Object));
    expect(event2Handler).toHaveBeenCalled();
  }));

  it('should emit events that were declared as forwarded', inject(function ($rootScope) {
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();

    var widgetScope = widgetInjector.get('$rootScope');
    var eventSpy = jasmine.createSpy('$locationChangeStart');
    var eventSpy2 = jasmine.createSpy('$locationChangeSuccess');
    var watchSpy = jasmine.createSpy('watchSpy');

    $rootScope.$on('$locationChangeStart', eventSpy);
    $rootScope.$on('$locationChangeSuccess', eventSpy2);
    $rootScope.$watch(watchSpy, angular.noop);

    widgetScope.$emit('$locationChangeStart', 1, 2, 3);
    widgetScope.$emit('$locationChangeSuccess', 1, 2, 3);

    expect(eventSpy).toHaveBeenCalledWith(jasmine.any(Object), 1, 2, 3);
    expect(eventSpy2).not.toHaveBeenCalled();
    expect(watchSpy).toHaveBeenCalled();
  }));

  it('should not forward events that were broadcasted on widget scope', inject(function ($rootScope) {
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();

    var widgetScope = widgetInjector.get('$rootScope');
    var eventSpy = jasmine.createSpy('$locationChangeStart');

    $rootScope.$on('$locationChangeStart', eventSpy);
    widgetScope.$broadcast('$locationChangeStart', 1, 2, 3);

    expect(eventSpy).not.toHaveBeenCalled();
  }));

  it('should not forward events that were emitted on root scope', inject(function ($rootScope) {
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();

    var widgetScope = widgetInjector.get('$rootScope');
    var eventSpy = jasmine.createSpy('$locationChangeStart');

    widgetScope.$on('$locationChangeStart', eventSpy);
    $rootScope.$emit('$locationChangeStart', 1, 2, 3);

    expect(eventSpy).not.toHaveBeenCalled();
  }));

  it('should allow widget to prevent default', inject(function ($rootScope) {
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();

    var widgetScope = widgetInjector.get('$rootScope');
    var eventSpy = jasmine.createSpy('$locationChangeStart');

    widgetScope.$on('$locationChangeStart', eventSpy);
    expect($rootScope.$broadcast('$locationChangeStart', 1, 2, 3).defaultPrevented).toBe(false);

    eventSpy.andCallFake(function (e) {
      e.preventDefault();
    });
    expect($rootScope.$broadcast('$locationChangeStart', 1, 2, 3).defaultPrevented).toBe(true);
  }));

  it('should allow hosting app to prevent default', inject(function ($rootScope) {
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();

    var widgetScope = widgetInjector.get('$rootScope');
    var eventSpy = jasmine.createSpy('$locationChangeStart');

    $rootScope.$on('$locationChangeStart', eventSpy);
    expect(widgetScope.$emit('$locationChangeStart', 1, 2, 3).defaultPrevented).toBe(false);

    eventSpy.andCallFake(function (e) {
      e.preventDefault();
    });
    expect(widgetScope.$emit('$locationChangeStart', 1, 2, 3).defaultPrevented).toBe(true);
  }));

  it('should emit events', function () {
    downloadWidgetSuccess();
    compileWidget();

    flushDownload();

    expect(spies.exportPropertiesUpdated).toHaveBeenCalledWith(jasmine.any(Object), {prop: 123});
    expect(spies.widgetLoaded).toHaveBeenCalled();
    expect(spies.widgetError).not.toHaveBeenCalled();

    widgetConfig.reportError();
    expect(spies.widgetError).toHaveBeenCalled();

    widgetConfig.exportProperties({xxx: 456});
    expect(spies.exportPropertiesUpdated).toHaveBeenCalledWith(jasmine.any(Object), {prop: 123, xxx: 456});

    widgetConfig.exportProperties({prop: 456});
    expect(spies.exportPropertiesUpdated).toHaveBeenCalledWith(jasmine.any(Object), {prop: 456, xxx: 456});
  });

  it('should emit loading event after loading complete', function () {
    downloadWidgetSuccess();
    compileWidget();

    widgetIsLoading = true;
    flushDownload();

    expect(spies.widgetLoaded).not.toHaveBeenCalled();
    widgetConfig.exportProperties({xxx: 123});
    expect(spies.widgetLoaded).not.toHaveBeenCalled();
    widgetConfig.exportProperties({loading: false});
    expect(spies.widgetLoaded).toHaveBeenCalled();
  });

  it('should update options', inject(function ($rootScope) {
    downloadWidgetSuccess();
    compileWidget();

    $rootScope.options = {opt: 123};
    flushDownload();

    expect(widgetConfig.getOptions()).toEqual({opt: 123});
    $rootScope.$apply(function () {
      $rootScope.options.xxx = 456;
    });
    expect(widgetConfig.getOptions()).toEqual({opt: 123, xxx: 456});
  }));

  it('should have correct options in run block', inject(function ($rootScope) {
    angular.module('dummyWidget').run(function (widgetConfig) {
      expect(widgetConfig.getOptions()).toEqual({opt: 123});
    });

    downloadWidgetSuccess();
    compileWidget();

    $rootScope.options = {opt: 123};
    flushDownload();
  }));

  it('should load the correct files', inject(function ($rootScope, fileLoader) {
    downloadWidgetSuccess();
    compileWidget();

    $rootScope.$digest();

    expect(fileLoader.loadFiles).toHaveBeenCalledWith(['scripts/dummy-widget.js', 'styles/dummy-widget.css']);
    expect(fileLoader.loadFiles.calls.length).toBe(1);
  }));

  it('should not load the files if module exists', inject(function (fileLoader) {
    angular.module('dummyWidget').requires.push('angularWidget');
    downloadWidgetSuccess();
    compileWidget();

    flushDownload();

    expect(fileLoader.loadFiles).not.toHaveBeenCalled();
    expect(element.find('div').html()).toBe('123');
  }));

  it('should report error if html fails to load', inject(function ($httpBackend) {
    $httpBackend.expectGET('views/dummy-widget.html').respond(500, 'wtf');
    compileWidget();

    flushDownload();

    expect(spies.widgetError).toHaveBeenCalled();
  }));

  it('should report error if html fails to parse', inject(function ($httpBackend) {
    $httpBackend.expectGET('views/dummy-widget.html').respond('<><<');
    compileWidget();

    flushDownload();

    expect(spies.widgetError).toHaveBeenCalled();
  }));

  it('should report error if tag fileLoader fails to load', inject(function ($q, fileLoader) {
    downloadWidgetSuccess();
    compileWidget();

    fileLoader.loadFiles.andReturn($q.reject());
    flushDownload();

    expect(spies.widgetError).toHaveBeenCalled();
  }));

  it('should not handle error if src was already changed', inject(function ($rootScope, $timeout, $q, fileLoader) {
    downloadWidgetSuccess('stam');
    compileWidget();

    $rootScope.widget = 'stam';
    $rootScope.$digest();
    fileLoader.loadFiles.andReturn($q.reject());

    $rootScope.widget = 'dummy';
    downloadWidgetSuccess();
    flushDownload();

    expect(spies.widgetError).not.toHaveBeenCalled();
    expect(spies.widgetLoaded).toHaveBeenCalledWith(jasmine.any(Object), 'dummy');
  }));

  it('should not handle success if src was already changed', inject(function ($rootScope, $timeout, $q, $httpBackend, fileLoader) {
    downloadWidgetSuccess('stam');
    compileWidget();

    $rootScope.widget = 'stam';
    $httpBackend.flush();
    $timeout.flush(500);

    $rootScope.widget = 'dummy';
    downloadWidgetSuccess();
    fileLoader.loadFiles.andReturn($q.reject());
    flushDownload();

    expect(spies.widgetError).toHaveBeenCalled();
    expect(spies.widgetLoaded).not.toHaveBeenCalled();
  }));

  it('should empty html when src is empty', inject(function ($rootScope) {
    compileWidget();
    $rootScope.widget = '';

    element.html('123');
    $rootScope.$digest();
    expect(element.html()).toBe('');
  }));

  it('should empty html & unregister when src is changed', inject(function ($rootScope, widgets) {
    downloadWidgetSuccess();
    compileWidget();

    flushDownload();

    $rootScope.widget = 'stam';
    downloadWidgetSuccess('stam');

    expect(element.html()).not.toBe('');
    $rootScope.$digest();
    expect(widgets.unregisterWidget).toHaveBeenCalledWith(widgetInjector);
    expect(element.html()).toBe('');
  }));

  it('should unregister when scope is destroyed', inject(function ($rootScope, widgets) {
    downloadWidgetSuccess();
    compileWidget();

    flushDownload();

    element.scope().$destroy();
    expect(widgets.unregisterWidget).toHaveBeenCalledWith(widgetInjector);
  }));

  it('should not load the files if in module exists', inject(function ($httpBackend, $rootScope, $compile, fileLoader) {
    angular.module('dummyWidget').requires.push('angularWidget');
    $httpBackend.expectGET('views/dummy-widget.html').respond('<div ng-bind="\'123\'"></div>');
    element = $compile('<ng-widget src="\'dummy\'" options="options"></ng-widget>')($rootScope);
    flushDownload();

    expect(fileLoader.loadFiles).not.toHaveBeenCalled();
    expect(element.find('div').html()).toBe('123');
  }));

  it('should add angularWidget to the module requirements', function () {
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();
    expect(widgetInjector.get('ngWidgetDirective')).toBeTruthy();
  });

  it('should run custom config block when bootstraping', inject(function (widgets) {
    var hook = widgets.getWidgetManifest;
    widgets.getWidgetManifest = function () {
      return angular.extend(hook.apply(widgets, arguments), {
        config: [function ($provide) {
          $provide.value('shahata', 123);
        }]
      });
    };
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();
    expect(widgetInjector.get('shahata')).toBe(123);
  }));

  it('should block protractor while widget is still downloading', function () {
    var element;
    var widgetContent = 'some text';
    var protractor = jasmine.createSpy('protractor').andCallFake(function () {
      expect(element.text()).toBe(widgetContent);
    });

    runs(function () {
      var $injector = createNewInjectorAndConfigureWidget(['widget1.html.js', 'widget2.html.js'], widgetContent);

      $injector.invoke(function ($compile, $browser, $rootScope) {
        element = $compile('<ng-widget src="\'dummy\'"></ng-widget>')($rootScope);
        $browser.notifyWhenNoOutstandingRequests(protractor);
      });
    });

    waitsFor(function () {
      return !!protractor.calls.length;
    }, 'protractor was not called', 2000);
  });

  it('should release protractor in case the widget had errors while loading', function () {
    var element;
    var protractor = jasmine.createSpy('protractor');

    runs(function () {
      var $injector = createNewInjectorAndConfigureWidget(['some-non-existing.html.js', 'widget1.html.js']);

      $injector.invoke(function ($compile, $browser, $rootScope) {
        element = $compile('<ng-widget src="\'dummy\'"></ng-widget>')($rootScope);
        $browser.notifyWhenNoOutstandingRequests(protractor);
      });
    });

    waitsFor(function () {
      return !!protractor.calls.length;
    }, 'protractor was not called', 2000);
  });

  function createNewInjectorAndConfigureWidget(files, widgetContent) {
    //must create different injector since injector created by inject() includes
    //ngMock, which replaces $browser.notifyWhenNoOutstandingRequests() with
    //implementation which immediately invokes callback no matter what
    files = files.map(function (fileName) {
      return '/base/app/views/' + fileName;
    });
    return angular.injector(['ng', 'angularWidget', function ($provide) {
      $provide.value('$rootElement', angular.element('<div></div>'));
    }, function (widgetsProvider) {
      widgetsProvider.setManifestGenerator(function ($templateCache) {
        $templateCache.put('views/dummy-widget.html', '<div>' + widgetContent + '</div>');
        return function manifestGenerator() {
          return {
            module: 'dummyWidget',
            html: 'views/dummy-widget.html',
            files: [files]
          };
        };
      });
    }]);
  }

});
