var gulp = require('gulp');
var babel = require('gulp-babel');
var watch = require('gulp-watch');
var mocha = require('gulp-mocha');
var sourcemaps = require('gulp-sourcemaps');

gulp.task('compile', function() {
  return gulp
    .src('src/**/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel({ stage: 0 }))
    .pipe(sourcemaps.write('.'))
    .on("error", function (err) { console.log("Error : " + err.message); this.emit('end') })
    .pipe(gulp.dest('build'));
})


gulp.task('mocha', ['compile'], function () {
    return gulp.src(['build/test.js'], {read: false})
        .pipe(mocha({reporter: 'spec'}));
});


gulp.task('watch', function () {
  watch(['src/**/*.js'], function () {
    gulp.start('mocha');
  });
  gulp.start('mocha');
});
