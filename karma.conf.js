// Karma configuration
// http://karma-runner.github.io/0.10/config/configuration-file.html
'use strict';

module.exports = function (config) {
  config.set({
    plugins: ['karma-jasmine', 'karma-coverage', 'karma-phantomjs-launcher', 'karma-ng-html2js-preprocessor'],

    preprocessors: {
      '{.tmp,app}/scripts/{,!(lib)/**/}*.js': 'coverage',
      '{app,.tmp}/views/**/*.html': 'ng-html2js'
    },

    ngHtml2JsPreprocessor: {
      stripPrefix: '(app|.tmp)/',
      moduleName: 'angularWidgetApp'
    },

    // base path, that will be used to resolve files and exclude
    basePath: '',

    // testing framework to use (jasmine/mocha/qunit/...)
    frameworks: ['jasmine'],

    // list of files / patterns to load in the browser
    files: [
      'app/bower_components/jquery/jquery.js',
      'app/bower_components/angular/angular.js',
      'app/bower_components/angular-route/angular-route.js',
      'app/bower_components/angular-ui-router/release/angular-ui-router.js',
      'app/bower_components/angular-mocks/angular-mocks.js',
      'app/bower_components/es5-shim/es5-shim.js',
      '{app,.tmp}/*.js',
      '{app,.tmp}/scripts/*.js',
      '{app,.tmp}/scripts/*/**/*.js',
      {pattern:'{,.tmp}/test/mock/mock-lazyloaded-file.js',included:false},
      '{,.tmp/}test/**/*.js',
      '{app,.tmp}/views/**/*.html',
      'app/bower_components/requirejs/require.js'
    ],

    // list of files / patterns to exclude
    exclude: [
      '{,.tmp/}test/spec/e2e/*.js',
      '{app,.tmp}/scripts/locale/*_!(en).js'
    ],

    // test results reporter to use
    // possible values: dots || progress || growl
    reporters: ['progress', 'coverage'],

    // web server port
    port: 8880,

    // level of logging
    // possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
    logLevel: config.LOG_INFO,

    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // Start these browsers, currently available:
    // - Chrome
    // - ChromeCanary
    // - Firefox
    // - Opera
    // - Safari (only Mac)
    // - PhantomJS
    // - IE (only Windows)
    browsers: ['PhantomJS'],

    // Continuous Integration mode
    // if true, it capture browsers, run tests and exit
    singleRun: true
  });
};
