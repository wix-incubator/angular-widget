'use strict';

try {
  angular.module('angularWidgetApp');
} catch (e) {
  angular.module('angularWidgetApp', []);
}

angular.module('angularWidgetApp').run(['$templateCache', function ($templateCache) {
  'use strict';

  $templateCache.put('views/widget1.html',
    "<div class=\"widget1\" ng-controller=\"Widget1Ctrl\">\n" +
    "  <ul>\n" +
    "    <li ng-repeat=\"thing in awesomeThings | limitTo:widgetOptions.collapse ? 2 : awesomeThings.length\">{{thing}}</li>\n" +
    "    <button ng-click=\"widgetOptions.collapse = !widgetOptions.collapse\">{{widgetOptions.collapse ? 'expand' : 'collpase'}}</button>\n" +
    "  </ul>\n" +
    "</div>\n"
  );
}]);