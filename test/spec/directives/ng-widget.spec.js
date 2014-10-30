'use strict';

describe('Unit testing ngWidget directive', function () {
  var tagAppender, widgetInjector, widgetConfig, widgetIsLoading, widgets, spies, element;

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
      tagAppender: tagAppender = jasmine.createSpy('tagAppender'),
    }, function (widgetsProvider) {
      widgetsProvider.setManifestGenerator(function () {
        return function (name) {
          return {
            module: name + 'Widget',
            html: 'views/' + name + '-widget.html',
            files: [
              'scripts/' + name + '-widget.js',
              'styles/' +  name + '-widget.css'
            ]
          };
        };
      });

      widgetsProvider.addServiceToShare('$location');
      widgetsProvider.addEventToForward('$locationChangeStart');
    });
  });

  function downloadWidgetSuccess(name) {
    inject(function ($q, $httpBackend) {
      $httpBackend.expectGET('views/' + (name || 'dummy') + '-widget.html')
        .respond('<div ng-bind="\'123\'"></div>');
      tagAppender.andReturn($q.when());
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
                         '></ng-widget>')(scope || $rootScope);

      spies = jasmine.createSpyObj('spies', ['exportPropertiesUpdated', 'widgetLoaded', 'widgetError']);
      $rootScope.$on('exportPropertiesUpdated', spies.exportPropertiesUpdated);
      $rootScope.$on('widgetLoaded', spies.widgetLoaded);
      $rootScope.$on('widgetError', spies.widgetError);
    });
  }

  function flushDownload() {
    inject(function ($httpBackend, $timeout) {
      $httpBackend.flush();
      $timeout.flush(1000);

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

  it('should respect delay attribute', inject(function ($timeout) {
    downloadWidgetSuccess();
    compileWidget(undefined, 2000);

    flushDownload();
    expect(widgetInjector).toBeUndefined();

    $timeout.flush(1000);
    widgetInjector = element.find('div').injector();
    expect(widgetInjector).toBeDefined();
  }));

  it('should respect delay attribute for errors too', inject(function ($httpBackend, $timeout) {
    $httpBackend.expectGET('views/dummy-widget.html').respond(500, 'wtf');
    compileWidget(undefined, 2000);

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

    widgetScope.$on('$locationChangeStart', eventSpy);
    widgetScope.$on('$locationChangeSuccess', eventSpy2);

    $rootScope.$broadcast('$locationChangeStart', 1, 2, 3);
    $rootScope.$broadcast('$locationChangeSuccess', 1, 2, 3);

    expect(eventSpy).toHaveBeenCalledWith(jasmine.any(Object), 1, 2, 3);
    expect(eventSpy2).not.toHaveBeenCalled();
  }));

  it('should emit events that were declared as forwarded', inject(function ($rootScope) {
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();

    var widgetScope = widgetInjector.get('$rootScope');
    var eventSpy = jasmine.createSpy('$locationChangeStart');
    var eventSpy2 = jasmine.createSpy('$locationChangeSuccess');

    $rootScope.$on('$locationChangeStart', eventSpy);
    $rootScope.$on('$locationChangeSuccess', eventSpy2);

    widgetScope.$emit('$locationChangeStart', 1, 2, 3);
    widgetScope.$emit('$locationChangeSuccess', 1, 2, 3);

    expect(eventSpy).toHaveBeenCalledWith(jasmine.any(Object), 1, 2, 3);
    expect(eventSpy2).not.toHaveBeenCalled();
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

  it('should allow widget to prevent default', inject(function ($rootScope) {
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();

    var widgetScope = widgetInjector.get('$rootScope');
    var eventSpy = jasmine.createSpy('$locationChangeStart');

    widgetScope.$on('$locationChangeStart', eventSpy);
    expect($rootScope.$broadcast('$locationChangeStart', 1, 2, 3).defaultPrevented).toBe(false);

    eventSpy.andCallFake(function (e) { e.preventDefault(); });
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

    eventSpy.andCallFake(function (e) { e.preventDefault(); });
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

  it('should append the correct tags', inject(function ($rootScope) {
    downloadWidgetSuccess();
    compileWidget();

    $rootScope.$digest();

    expect(tagAppender).toHaveBeenCalledWith('scripts/dummy-widget.js', 'js');
    expect(tagAppender).toHaveBeenCalledWith('styles/dummy-widget.css', 'css');
    expect(tagAppender.calls.length).toBe(2);
  }));

  it('should not append the tags if module exists', function () {
    angular.module('dummyWidget').requires.push('angularWidget');
    downloadWidgetSuccess();
    compileWidget();

    flushDownload();

    expect(tagAppender).not.toHaveBeenCalled();
    expect(element.find('div').html()).toBe('123');
  });

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

  it('should report error if tag appender fails to load', inject(function ($q) {
    downloadWidgetSuccess();
    compileWidget();

    tagAppender.andReturn($q.reject());
    flushDownload();

    expect(spies.widgetError).toHaveBeenCalled();
  }));

  it('should not handle error if src was already changed', inject(function ($rootScope, $timeout, $q, $httpBackend) {
    downloadWidgetSuccess('stam');
    compileWidget();

    $rootScope.widget = 'stam';
    tagAppender.andReturn($q.reject());
    $httpBackend.flush();
    $timeout.flush(500);

    $rootScope.widget = 'dummy';
    downloadWidgetSuccess();
    flushDownload();

    expect(spies.widgetError).not.toHaveBeenCalled();
    expect(spies.widgetLoaded).toHaveBeenCalled();
  }));

  it('should not handle success if src was already changed', inject(function ($rootScope, $timeout, $q, $httpBackend) {
    downloadWidgetSuccess('stam');
    compileWidget();

    $rootScope.widget = 'stam';
    $httpBackend.flush();
    $timeout.flush(500);

    $rootScope.widget = 'dummy';
    downloadWidgetSuccess();
    tagAppender.andReturn($q.reject());
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

  it('should not append the tags if in module exists', inject(function ($httpBackend, $rootScope, $compile) {
    angular.module('dummyWidget').requires.push('angularWidget');
    $httpBackend.expectGET('views/dummy-widget.html').respond('<div ng-bind="\'123\'"></div>');
    element = $compile('<ng-widget src="\'dummy\'" options="options"></ng-widget>')($rootScope);
    flushDownload();

    expect(tagAppender).not.toHaveBeenCalled();
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
      return angular.extend(hook.apply(widgets, arguments), {config: [function ($provide) {
        $provide.value('shahata', 123);
      }]});
    };
    downloadWidgetSuccess();
    compileWidget();
    flushDownload();
    expect(widgetInjector.get('shahata')).toBe(123);
  }));

});
