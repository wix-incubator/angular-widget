'use strict';

try {
  angular.module('angularWidgetApp');
} catch (e) {
  angular.module('angularWidgetApp', []);
}

angular.module('angularWidgetApp').run(['$templateCache', function ($templateCache) {
  'use strict';

  $templateCache.put('views/app2.html',
    "<div ng-init=\"navigationCount = 0\" style=\"background-color: green; padding: 15px\">\n" +
    "  <a ng-repeat=\"app in ['sub1', 'sub2', 'sub3']\" ng-href=\"#/app2/{{app}}\"\n" +
    "    ng-click=\"$parent.navigationCount = navigationCount + 1\"\n" +
    "    style=\"padding: 5px\">{{app}}</a>\n" +
    "  <span>{{navigationCount}}</span><br/><br/>\n" +
    "  <ng-view></ng-view>\n" +
    "  <br/>\n" +
    "</div>"
  );
}]);