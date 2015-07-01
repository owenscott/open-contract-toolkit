var gulp = require('gulp');
var browserify = require('gulp-browserify');
var rename = require('gulp-rename');
var brfs = require('brfs');

var paths = {
  clientScripts: ['src/**/*.js', 'src/**/**/*.js', 'src/*.js'],
  templates: ['src/**/templates/*.ejs']
}


gulp.task('admin-scripts', function() {
    // Single entry point to browserify 
    gulp.src('src/admin/app.js')
        .pipe(browserify({
          debug : true,
          transform: [brfs]
        }))
        .pipe(rename('admin-bundle.js'))
        .pipe(gulp.dest('./static/'))
});

gulp.task('coder-landing-scripts', function() {
    // Single entry point to browserify 
    gulp.src('src/coder-landing/app.js')
      .pipe(browserify({	
        debug : true,
        transform: [brfs]
      }))
      .pipe(rename('coder-landing-bundle.js'))	
      .pipe(gulp.dest('./static/'))	
});

gulp.task('coding-scripts', function() {
    // Single entry point to browserify 
    gulp.src('src/coding/app.js')
      .pipe(browserify({  
        debug : true,
        transform: [brfs]
      }))
      .pipe(rename('coding-bundle.js'))  
      .pipe(gulp.dest('./static/')) 
});

gulp.task('listen', function() {
  gulp.watch(paths.clientScripts, ['default']);
  gulp.watch(paths.templates, ['default']);
  gulp.watch('conf.json', ['default']);
  gulp.watch('gulpfile.js', ['default']);
})


gulp.task('default', ['admin-scripts', 'coder-landing-scripts', 'coding-scripts', 'listen'])