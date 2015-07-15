Angular Widget [![Build Status](https://travis-ci.org/wix/angular-widget.svg?branch=master)](https://travis-ci.org/wix/angular-widget) [![Coverage Status](https://coveralls.io/repos/wix/angular-widget/badge.png?branch=master)](https://coveralls.io/r/wix/angular-widget?branch=master)
================

Lazy load isolated micro-apps in [Angular](http://www.angularjs.org)

Demo: http://shahata.github.io/angular-widget/

Slides: https://slides.com/shahartalmi/angular-widget/

Talk (English - Bad quality): https://youtu.be/D8fOHIwz8mY

Talk (Hebrew): http://youtu.be/Wgn2Vid8zCA

## What it does

One of the main problems people discover in angular when they try to write a very big application with all sorts of components, is that you can't load code during run-time easily. When angular bootstraps your DOM, it creates an injector with the configuration that was defined at that moment and you cannot add services, directives, controllers, etc. easily after the injector was created. This library allows you to download js/css/html code into a running angular app and will create a new injector for that "widget". Since each widget has its own injector, each widget has a different instance for services that they use. They can configure them how ever they like without any effect on any other widget or on the main application that hosts the widgets. Regardless, all widgets share the same DOM, so a widget create modal dialogs or whatever it likes. Widgets are simply added to the DOM using the `ng-widget` directive. The directive download all required files and creates the widget. Widgets can get information from the hosting application using the `options` attribute of the directive and they can report to the hosting application using `widgetConfig.exportProperties` and `widgetConfig.reportError`.

But that's just the start! Widgets can actually be full blown applications with their own router. (both angular-route and ui-router are supported) See the demo page for an example that uses angular-route to host three lazy loaded applications - one uses ui-router internally, one uses angular-route and the third displays some widget (widgets within widgets, whoa...)

See https://github.com/wix/angular-widget/blob/master/app/scripts/demo.js for an example of how you would typically configure a hosting application to run multiple lazy loaded applications on different routes.

## Installation

Install using bower

`bower install --save angular-widget`

Include script tag in your html document.

```html
<script type="text/javascript" src="bower_components/angular-widget/angular-widget.js"></script>
```

Add a dependency to your application module.

```javascript
angular.module('myApp', ['angularWidget']);
```

## Directive Usage

```html
<ng-widget src="'demo'" options="{name: 'value'}"></ng-widget>
```

### Arguments

|Param|Type|Details|
|---|---|---|
|src|string|Name of widget to download. This is resolved to a module name, html file url and js/css file url list when the directive invokes `widgets.getWidgetManifest(src)` (more on this soon)|
|options (optional)|object|An object of options which might effect the behavior of the widget. The widget gets those options by calling `widgetConfig.getOptions()` (more on this soon)|
|delay (optional)|number|Well, that's pretty silly, but with widgets you sometimes want to let the user feel that the widget is actually loading. So you can add a delay with this param|

### Events

The directive emits the following events:

|Param|Details|
|---|---|
|widgetLoading|Sent when the widget loading starts |
|widgetLoaded|Sent when the widget is done loading. This happens when all the files were downloaded and the new DOM node was bootstrapped. In case the widget itself wants to postpone sending this event until it is done initializing, it can optionally call `widgetConfig.exportProperties({loading: true}` in a run block and then call `widgetConfig.exportProperties({loading: false }` when done |
|widgetError|Sent when some download or bootstrap fails. Called also when the widget calls `widgetConfig.reportErrror()`|
|exportPropertiesUpdated|Sent along with the updated properties when the widget calls `widgetConfig.exportProperties()`|

The directive will reload the widget if it receives a `reloadWidget` event from a parent scope.

## Service Usage (hosting application)

```js
angular.module('myApp').config(function (widgetsProvider) {
  widgetsProvider.setManifestGenerator(['dep1', 'dep1', function (dep1, dep2) {
    return function (name) {
      return {
        module: name + 'Widget',
        config: [], //optional array of extra modules to load into the new injector
        priority: 1, //optional priority for conflicting generators
        html: 'views/' + name + '.html',
        files: [
          'scripts/controllers/' + name + '.js',
          'styles/' + name + '.css'
        ]
      };
    };
  }]);
})
```

### Arguments

You must set the manifest generator function in order for the directive to work. This is how we can know for a specific plugin, what files should be loaded and with which module name to create the injector. Above you can see an example for a manifest generator, but you can do whatever you like. You can put both relative and absolute URL's, of course.

*Note:* In case [requirejs](http://requirejs.org/) is available in the global scope, it will be used to load the javascript files. So if your widget needs more than one js file, you can include [requirejs](http://requirejs.org/) and use AMD to load them.

You can actually set multiple manifest generators and they will be evaluated in the order that they were defined. So a generator is allowed to return `undefined` in case it simply wants a different generator to handle it. The way the generators responses are handled is that the last generator that didn't return `undefined` will be used, unless a different generator returned a result with higher `priority`.

## Service Usage (widget)

In order to communicate with the hosting application, the widget uses the `widgetConfig` service. (the widget module always has a module dependency on `angularWidget`, if no such dependency exists, it will be added automatically during bootstrap)

### Methods

|Name|Param|Details|
|---|---|---|
|exportProperties|properties (obj)|Send information to the hosting application. The object sent in the param will extend previous calls, so you can send only the properties that have changed. The directive will emit a `exportPropertiesUpdated` event. |
|reportError|N/A|Report some kind of error to the hosting application. The directive will emit a `widgetError` event. |
|getOptions|N/A|Get the options object supplied by the object. The options will always have the same reference, so you can save it on the scope. A scope digest will be triggered automatically if the options change. |

## Sharing information between widgets

In some cases it might be needed to share some global state between widgets. When this global state changes you'll probably need to run a digest cycle in all widgets. `$rootScope.$digest()` will run the digest only in the injector which owns that `$rootScope` instance. To run `$rootScope.$digest()` on all `$rootScope` instances in all widgets, use `widgtes.notifyWidgtes()`.

Also, if you want to broadcast an event on the `$rootScope` of all widgets, just call `widgets.notifyWidgets(eventName, args, ...)`. It returns an array of the scope event that were dispatched.

### Sharing services

As mentioned before, each widget has its very own injector, which means that each widget has its own service instances which are isolated from the services of other widgets and of the hosting application. A nice way to share information between widgets and the the hosting application is to have a shared service instance. So you can ask angular-widget to have the service shared pretty easily by running `widgetsProvider.addServiceToShare(name, description)` in a config section of the hosting application - `name` is the name of the service you want to share, that's pretty obvious, but `description` (optional) is a bit more difficult to explain.

It is important to remember that the widgets and hosting application do not share the same digest cycle, so if you are going to make a call to a shared service from a widget, you want to trigger a digest in all root scopes that share this service instance. You could just call `widgets.notifyWidgets()`, but an easier way would be to declare which methods of the shared service might change the state (no need to mention getters, for example) and have angular-widget do the rest for you. So `description` can be an array of such method names, or it can be an object where the method name is the key and the minimum amount of arguments is the value. The object option should be used when you have something like methods that behave as getters when they have no arguments and as setters when they have one arguments. (in this case you would pass `{methodName: 1}` as `description`)

BTW, one service that is shared by default in order for angular-widget to work is `$location`.

### Sharing events

One more important option to share information between widgets and the main application are scope events. Since the widgets have a different injector, their root scope is isolated from scope events in different injectors, but this can easily be changed by adding `widgetsProvider.addEventToForward(name)` in a config section of the hosting application. This will make the `ngWidget` directive propagate events with this name to the widget's root scope. The widget may call `preventDefault()` on the event in order to prevent the default behavior of the original event.

BTW, one event that is shared by default is `$locationChangeStart`. This is in order to allow widgets to `preventDefault()` and display some "you have unsaved changes" dialog if they want to. If the user decides to continue, the widget can do something like `$location.$$parse(absUrl)`. (`absUrl` is the first parameter passed along with the `$locationChangeStart` event) Calling `$$parse` will trigger a digest in the hosting application automatically as described in the previous section, since this service is shared by default.

## How to use in the real world

This framework is best used by having a separate project for each widget. During development, the developer sees only his own widget. All widgets should be built in a consistent manner, usually with one concatenated minified .js and .css files.

## License

The MIT License.

See [LICENSE](https://github.com/shahata/angular-widget/blob/master/LICENSE)
