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
    protractor: true,
    bowerComponent: true,
    proxies: {
      html5mode: function (req, res) {
        res.end(grunt.file.read('app/index.html'));
      }
    }
  });

  grunt.modifyTask('yeoman', {
    local: 'http://localhost:<%= connect.options.port %>/'
  });

  grunt.modifyTask('karma', {
    teamcity: {
      coverageReporter: {dir : 'coverage/', type: 'lcov'}
    }
  });

  grunt.modifyTask('copy', {
    js: {
      expand: true,
      cwd: 'dist/scripts',
      dest: '',
      src: 'angular-widget.js'
    }
  });

  grunt.hookTask('build').push('copy:js');

};
