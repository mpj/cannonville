var gulp = require('gulp')
var babel = require('gulp-babel')
var babelify = require('babelify');
var watch = require('gulp-watch')
var sourcemaps = require('gulp-sourcemaps')
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var livereload = require('gulp-livereload');
var gutil = require('gulp-util');
var open = require('gulp-open');
var clean = require('gulp-clean');
var run = require('gulp-run');
var watchify = require('watchify');
var merge = require('mout/object/merge');

// add custom browserify options here
var customOpts = {
  entries: 'src/test-runner.js',
  debug: true // make sourcemaps work
};
var opts = merge({}, watchify.args, customOpts);
var b = watchify(browserify(opts).transform(babelify));

gulp.task('compile', ['clean'], function() {
  return gulp
    .src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel({ stage: 0 }))
    .pipe(sourcemaps.write('.'))
    .on("error", function (err) { console.log("Error : " + err.message); this.emit('end') })
    .pipe(gulp.dest('build'))
})

gulp.task('clean', function() {
  return gulp.src('./build', {read: false})
    .pipe(clean());
})

gulp.task('browser-test', ['clean'], function() {
  return b
  .bundle()
  .on('error', gutil.log.bind(gutil, 'Browserify Error'))
  .pipe(source('bundle.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init({loadMaps: true}))
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('./build/'))
  .pipe(livereload())
})


gulp.task('server', ['compile'], function() {
  return run('node build/server/run.js')
    .exec()
    .pipe(gulp.dest('output/server-log'))
})

gulp.task('client', ['compile'], function() {
  return run('node build/client/run.js')
    .exec()
    .pipe(gulp.dest('output/client-log'))
})

gulp.task('watch', function () {
  livereload.listen();
  watch(['src/**/*.js'], function () {
    gulp.start('browser-test')
  });
  gulp.start('browser-test')
  gulp.src('./test-runner.html').pipe(open());
})
