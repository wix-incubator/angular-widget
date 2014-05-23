"use strict";

angular.module("angularWidgetAppInternal", []);

angular.module("angularWidgetApp", [ "angularWidgetAppInternal" ]).config(function() {
    return;
});

"use strict";

angular.module("angularWidgetAppInternal").controller("MainCtrl", [ "$scope", function($scope) {
    $scope.awesomeThings = [ "Bower", "Grunt", "Haml", "Compass", "AngularJS", "Karma" ];
} ]);