var gulp = require('gulp')
var babel = require('gulp-babel')
var watch = require('gulp-watch')
var sourcemaps = require('gulp-sourcemaps')
var spawn = require('child_process').spawn
var _ = require('highland')
var tapSpec = require('tap-spec')

gulp.task('tape', ['compile'], function() {
  var emitter = spawn('./node_modules/tape/bin/tape', ['build/**/test.js'])
  emitter.stderr.pipe(process.stderr)
  emitter.stdout.pipe(tapSpec()).pipe(process.stdout)
});

gulp.task('compile', function() {
  return gulp
    .src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel({ stage: 0 }))
    .pipe(sourcemaps.write('.'))
    .on("error", function (err) { console.log("Error : " + err.message); this.emit('end') })
    .pipe(gulp.dest('build'))
})


gulp.task('mocha', ['compile'], function () {
    return gulp.src(['build/test.js'], {read: false})
        .pipe(mocha({reporter: 'spec'}))
});


gulp.task('watch', function () {
  watch(['src/**/*.js'], function () {
    gulp.start('mocha')
  });
  gulp.start('mocha')
});



gulp.task('watch-tape', function () {
  watch(['src/**/*.js'], function () {
    gulp.start('tape')
  });
  gulp.start('tape')
})
