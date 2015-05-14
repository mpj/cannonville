var gulp = require('gulp')
var babelify = require('babelify');
var watch = require('gulp-watch')
var sourcemaps = require('gulp-sourcemaps')
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var livereload = require('gulp-livereload');
var gutil = require('gulp-util');

gulp.task('tape', ['compile'], function() {
  var emitter = spawn('./node_modules/tape/bin/tape', ['build/**/test.js'])
  emitter.stderr.pipe(process.stderr)
  emitter.stdout.pipe(process.stdout)
});

gulp.task('browser-test', function() {
  return browserify({
    entries: 'src/test-runner.js',
    debug: true // make sourcemaps work
  })
  .transform(babelify)
  .bundle()
  .on('error', gutil.log.bind(gutil, 'Browserify Error'))
  .pipe(source('bundle.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('./build/'))
  .pipe(livereload())
})


gulp.task('watch', function () {
  livereload.listen();
  watch(['src/**/*.js'], function () {
    gulp.start('browser-test')
  });
  gulp.start('browser-test')

})
