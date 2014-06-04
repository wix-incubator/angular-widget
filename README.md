Angular Widget [![Build Status](https://travis-ci.org/wix/angular-widget.svg?branch=master)](https://travis-ci.org/wix/angular-widget) [![Coverage Status](https://coveralls.io/repos/wix/angular-widget/badge.png?branch=master)](https://coveralls.io/r/wix/angular-widget?branch=master)
================

[AngularJS](http://www.angularjs.org) widget framework

Demo: http://shahata.github.io/angular-widget/

## What it does

One of the main problems people discover in angular when they try to write  a very big application with all sorts of components, is that you can't load code during run-time easily. When angular bootstraps your DOM, it creates an injector with the configuration that was defined at that moment and you cannot add services, directives, controllers, etc. easily after the injector was created. This library allows you to download js/css/html code into a running angular app and will create a new injector for that "widget". Since each widget has its own injector, each widget has a different instance for services that they use. They can configure them how ever they like without any effect on any other widget or on the main application that hosts the widgets. Regardless, all widgets share the same DOM, so a widget create modal dialogs or whatever it likes. Widgets are simply added to the DOM using the `ng-widget` directive. The directive download all required files and creates the widget. Widgets can get information from the hosting application using the `options` attribute of the directive and they can report to the hosting application using `widgetConfig.exportProperties` and `widgetConfig.reportError`.

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

### Events

The directive emits the following events:

|Param|Details|
|---|---|
|widgetLoaded|Sent when the widget is done loading. This happens when all the files were downloaded and the new DOM node was bootstrapped. In case the widget it self wants to postpone sending this event until it is done initialing, it can optionally call `widgetConfig.exportProperties({loading: true}` in a run block and then call `widgetConfig.exportProperties({loading: false }` when done |
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

### Note

In some cases it might be needed to share some global state between widgets. When this global state changes you'll probably need to run a digest cycle in all widgets. `$rootScope.$digest()` will run the digest only in the injector which owns that `$rootScope` instance. To run `$rootScope.$digest()` on all `$rootScope` instances in all widgets, use `widgtes.notifyWidgtes()`.

Also, if you want to broadcast an event on the `$rootScope` of all widgets, just call `widgets.notifyWidgets(eventName, args, ...)`. It returns an array of the scope event that were dispatched.

## Service Usage (widget)

In order to communicate with the hosting application, the widget uses the `widgteConfig` service. (the widget module always has a module dependency on `angularWidget`, if no such dependency exists, it will be added automatically during bootstrap)

### Methods

|Name|Param|Details|
|---|---|---|
|exportProperties|properties (obj)|Send information to the hosting application. The object sent in the param will extend previous calls, so you can send only the properties that has changed. The directive will emit a `exportPorprtiesUpdated` event. |
|reportError|N/A|Report that there was some kind of error to the hosting application. The directive will emit a `widgetError` event. |
|getOptions|N/A|Get the options object supplied by the object. The options will always have the same reference, so you can save it on the scope. A scope digest will be triggered automatically if the options change. |

## How to use in the real world

This framework is best used by having a separate project for each widget. During development, the developer sees only his own widget. All widgets should be built in a consistent manner, usually with one concatenated minified .js and .css files. 

## License

The MIT License.

See [LICENSE](https://github.com/shahata/angular-widget/blob/master/LICENSE)
