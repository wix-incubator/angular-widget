// Generated on 2014-05-23 using generator-wix-angular 0.1.50
'use strict';

module.exports = function (grunt) {
  var unitTestFiles = [];
  require('./karma.conf.js')({set: function (karmaConf) {
    unitTestFiles = karmaConf.files.filter(function (value) {
      return value.indexOf('bower_component') !== -1;
    });
  }});
  require('wix-gruntfile')(grunt, {
    port: 9000,
    preloadModule: 'angularWidgetApp',
    unitTestFiles: unitTestFiles,
    protractor: true
  });

  var yeoman = grunt.config('yeoman');
  yeoman.local =  'http://localhost:<%= connect.options.port %>/';
  grunt.config('yeoman', yeoman);

  var karma = grunt.config('karma');
  karma.teamcity.coverageReporter = {dir : 'coverage/', type: 'lcov'};
  grunt.config('karma', karma);

  var uglify = grunt.config('uglify');
  uglify.options =  {mangle: false, compress: false, beautify: true};
  grunt.config('uglify', uglify);

  var copy = grunt.config('copy');
  copy.js =  {
    expand: true,
    cwd: 'dist/scripts',
    dest: '',
    src: 'angular-widget.js'
  };
  grunt.config('copy', copy);

  grunt.renameTask('build', 'build.old');
  grunt.registerTask('build', ['build.old', 'copy:js']);
};
