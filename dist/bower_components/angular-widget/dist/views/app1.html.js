'use strict';

try {
  angular.module('angularWidgetApp');
} catch (e) {
  angular.module('angularWidgetApp', []);
}

angular.module('angularWidgetApp').run(['$templateCache', function ($templateCache) {
  'use strict';

  $templateCache.put('views/app1.html',
    "<div ng-controller=\"widgetsList\" style=\"background-color: blue; overflow: hidden; padding: 15px\">\n" +
    "  <button ng-click=\"addWidget('widget1', 1)\">add widget1...</button>\n" +
    "  <button ng-click=\"addWidget('widget2', 1)\">add widget2...</button>\n" +
    "  <button ng-click=\"addWidget('widget1', 100)\">add 100 widgets...</button>\n" +
    "  <button ng-click=\"widgets = []\">clear widgets...</button>\n" +
    "  <button ng-click=\"shouldShow = !shouldShow\">show widgets...</button>\n" +
    "  <button ng-click=\"options.collapse = !options.collapse\">{{options.collapse ? 'expand' : 'collapse'}} all...</button>\n" +
    "  <br/><br/><br/>\n" +
    "\n" +
    "  <div ng-if=\"shouldShow\" ng-repeat=\"widget in widgets track by widget.id\" style=\"float: left; position: relative; padding-right: 10px\">\n" +
    "    <div ng-controller=\"widgetContainer\">\n" +
    "      <span ng-show=\"title\" ng-bind=\"title\"></span>\n" +
    "      <button ng-click=\"widgets.splice($index, 1)\">del</button>\n" +
    "      <div ng-show=\"isLoading\">LOADING...</div>\n" +
    "      <div ng-show=\"isError\">ERROR... <button ng-click=\"reload()\">reload</button></div>\n" +
    "      <ng-widget class=\"container\" src=\"widget.src\" options=\"options\" ng-show=\"!isLoading && !isError\"></ng-widget>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "</div>\n"
  );
}]);