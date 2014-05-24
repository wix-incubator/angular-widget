'use strict';

describe('Unit testing ngWidget directive', function () {
  var tagAppender, widgetConfig, widgets, spies, element;

  beforeEach(function () {
    angular.module('dummyWidget', [])
      .value('widgetConfig', widgetConfig = {
        exportProperties: jasmine.createSpy('exportProperties').andReturn({prop: 123}),
        setOptions: jasmine.createSpy('setOptions')
      });

    module('angularWidget');

    module({
      tagAppender: tagAppender = jasmine.createSpy('tagAppender'),
      widgets: widgets = {
        registerWidget: jasmine.createSpy('registerWidget'),
        unregisterWidget: jasmine.createSpy('unregisterWidget'),
        getWidgetManifest: function (name) {
          return {
            module: name + 'Widget',
            html: 'views/' + name + '-widget.html',
            files: [
              'scripts/' + name + '-widget.js',
              'styles/' +  name + '-widget.css'
            ]
          };
        }
      }
    });
  });

  function downloadWidgetSuccess(name) {
    inject(function ($q, $httpBackend) {
      $httpBackend.expectGET('views/' + (name || 'dummy') + '-widget.html')
        .respond('<div ng-bind="\'123\'"></div>');
      tagAppender.andReturn($q.when());
    });
  }

  function compileWidget(scope) {
    inject(function ($compile, $rootScope) {
      scope = scope || $rootScope;
      scope.widget = scope.widget || 'dummy';
      element = $compile('<ng-widget src="widget" options="options"></ng-widget>')(scope || $rootScope);

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
    });
  }

  it('should load the widget into the element with different injector', function () {
    downloadWidgetSuccess();
    compileWidget();

    flushDownload();

    expect(element.find('div').html()).toBe('123');
    expect(element.injector()).not.toBe(element.find('div').injector());
    expect(widgets.registerWidget).toHaveBeenCalledWith(element.find('div').injector());

    expect(widgetConfig.setOptions).toHaveBeenCalledWith(undefined);
  });

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

    widgetConfig.exportProperties.andReturn({loading: true});
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

    expect(widgetConfig.setOptions).toHaveBeenCalledWith({opt: 123});
    $rootScope.$apply(function () {
      $rootScope.options.xxx = 456;
    });
    expect(widgetConfig.setOptions).toHaveBeenCalledWith({opt: 123, xxx: 456});
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
    var injector = element.find('div').injector();
    $rootScope.$digest();
    expect(widgets.unregisterWidget).toHaveBeenCalledWith(injector);
    expect(element.html()).toBe('');
  }));

  it('should unregister when scope is destroyed', inject(function ($rootScope, widgets) {
    downloadWidgetSuccess();
    compileWidget();

    flushDownload();

    element.scope().$destroy();
    expect(widgets.unregisterWidget).toHaveBeenCalledWith(element.find('div').injector());
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
    expect(angular.module('dummyWidget').requires).toEqual(['angularWidget']);
  });

  it('should not add angularWidget twice to the module requirements', inject(function ($httpBackend, $rootScope, $compile) {
    angular.module('dummyWidget').requires.push('angularWidget');
    $httpBackend.expectGET('views/dummy-widget.html').respond('<div ng-bind="\'123\'"></div>');
    element = $compile('<ng-widget src="\'dummy\'" options="options"></ng-widget>')($rootScope);
    flushDownload();
    expect(angular.module('dummyWidget').requires).toEqual(['angularWidget']);
  }));

});
