'use strict';

try {
  angular.module('angularWidgetApp');
} catch (e) {
  angular.module('angularWidgetApp', []);
}

angular.module('angularWidgetApp').run(['$templateCache', function ($templateCache) {
  'use strict';

  $templateCache.put('views/app3.html',
    "<div ng-init=\"navigationCount = 0\" style=\"background-color: red; padding: 15px\">\n" +
    "  <a ng-repeat=\"app in ['sub1', 'sub2', 'sub3']\" ng-href=\"#/app3/{{app}}\"\n" +
    "    ng-click=\"$parent.navigationCount = navigationCount + 1\"\n" +
    "    style=\"padding: 5px\">{{app}}</a>\n" +
    "  <span>{{navigationCount}}</span><br/><br/>\n" +
    "  <ui-view></ui-view>\n" +
    "  <br/>\n" +
    "</div>"
  );
}]);