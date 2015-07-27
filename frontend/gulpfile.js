'use strict';
var gulp = require('gulp');
var autoprefixer = require('gulp-autoprefixer');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var minifycss = require('gulp-minify-css');
var rename = require('gulp-rename');
var notify = require("gulp-notify");
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var clean = require('gulp-rimraf');
var gulpsequence = require('gulp-sequence');
var processhtml = require('gulp-processhtml');
var uncss = require('gulp-uncss-sp');
var header = require('gulp-header');
var pkg = require('./package.json');
var browserSync = require('browser-sync');
var httpProxy = require('http-proxy');
var connect = require('gulp-connect-php');
var pngquant = require('imagemin-pngquant');
var sass = require('gulp-sass');
var spritesmith = require('gulp.spritesmith');
var glob = require('glob');

var reload = browserSync.reload;
var banner = [
    '/*!\n' +
    ' * <%= pkg.title %>\n' +
    ' * <%= pkg.description %>\n' +
    ' * <%= pkg.url %>\n' +
    ' * @author <%= pkg.author %>\n' +
    ' * @version <%= pkg.version %>\n' +
    ' * Copyright ' + new Date().getFullYear() + '. <%= pkg.license %> licensed.\n' +
    ' */',
    '\n'
].join('');

gulp.task('clean', function() {
    return gulp.src('build', {
            read: false
        })
        .pipe(clean())
        .on('error', notify.onError(function(error) {
            return "Gulp Error: " + error.message;
        }))
});

gulp.task('lint', function() {
    gulp.src('app/assets/js/**/*.js')
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'))
        .on('error', notify.onError(function(error) {
            return "Gulp Error: " + error.message;
        }))
});




gulp.task('images', function() {
    return gulp.src(['app/assets/img/**/*.*', '!app/assets/img/icons/**/*.*'])
        .pipe(imagemin({
            verbose: true,
            optimizationLevel: 5,
            progressive: true,
            interlaced: true,
            use: [pngquant()]
        }))
        .on('error', notify.onError(function(error) {
            return "Gulp Error: " + error.message;
        }))

    .pipe(gulp.dest('build/assets/img'))


});

gulp.task('sass', function() {
    return gulp.src('app/assets/sass/*.scss')
        .pipe(sass())
        .on('error', notify.onError(function(error) {
            return "Gulp Error: " + error.message;
        }))
        .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 7', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
        .pipe(header(banner, {
            pkg: pkg
        }))
        .pipe(gulp.dest('app/assets/css'));
});



gulp.task('html', function() {
    return gulp.src(['app/*.html', 'app/*.php'])
        .pipe(processhtml())
        .pipe(gulp.dest('build'));
});



gulp.task('scripts', function() {
    return gulp.src(['app/assets/js/*.js', 'app/assets/js/**/*.js'])
        .pipe(concat('main.js'))
        .pipe(rename({
            suffix: '.min'
        }))
        .on('error', notify.onError(function(error) {
            return "Gulp Error: " + error.message;
        }))
        .pipe(uglify())

    .pipe(header(banner, {
            pkg: pkg
        }))
        .pipe(gulp.dest('build/assets/js'));
});


gulp.task('copy', function() {
    return gulp.src([
            'app/**/',
            '!app/*.html',
            '!app/*.php',
            '!app/assets/css/**',
            '!app/assets/js/**',
            '!app/{assets/sass,assets/sass/**}',
            '!app/assets/img/**'
        ], {
            dot: true
        })
        .on('error', notify.onError(function(error) {
            return "Gulp Error: " + error.message;
        }))
        .pipe(gulp.dest('build'))

});

gulp.task('sprite', function() {
    var spriteData = gulp.src('app/assets/img/icons/*.png').pipe(spritesmith({
        imgName: 'sprites.png',
        cssName: '_sprites.css',
        imgPath: 'app/assets/img/sprites.png',
        cssOpts: {
            functions: false
        },
        cssVarMap: function(sprite) {
            sprite.name = 'sprite-' + sprite.name;
        }
    }));
    spriteData.img.pipe(gulp.dest('app/assets/img/'));
    spriteData.css.pipe(gulp.dest('app/assets/sass/'));
});


gulp.task('uncss', function() {
    return gulp.src('app/assets/css/main.css')
        .pipe(uncss({
            html: glob.sync('app/**/*.php', 'app/**/*.html'),

             ignore: [


                        /\.open/,
                         /(#|\.)fancybox(\-[a-zA-Z]+)?/,
                        /(#|\.)active(\-[a-zA-Z]+)?/,
                        /(#|\.)modal(\-[a-zA-Z]+)?/,
                        // Bootstrap selectors added via JS
                        /\w\.in/,
                        ".fade",
                        ".collapse",
                        ".collapsing",
                        /(#|\.)navbar(\-[a-zA-Z]+)?/,
                        /(#|\.)dropdown(\-[a-zA-Z]+)?/,
                        /(#|\.)(open)/,
                        /^\.scroll(\-)?/,
                        /^\.scrollbar(\-)?/,
                       // currently only in a IE conditional, so uncss doesn't see it
                        ".close",
                        ".alert-dismissible"

                    ]
        }))
        .on('error', notify.onError(function(error) {
            return "Gulp Error: " + error.message;
        }))
        .pipe(minifycss())
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(gulp.dest('build/assets/css'));
});


gulp.task('serve', ['sass'], function() {
    connect.server({
        port: 9001,
        base: 'app',
        open: false
    });

    var proxy = httpProxy.createProxyServer({});

    browserSync({
        notify: false,
        port: 9000,

        server: {
            baseDir: ['app'],

            middleware: function(req, res, next) {
                var url = req.url;

                if (!url.match(/^\/(css|fonts)\//)) {
                    proxy.web(req, res, {
                        target: 'http://127.0.0.1:9001'
                    });
                } else {
                    next();
                }
            }
        }
    })


    // watch for changes
    gulp.watch(['app/**/*.html'], reload);
    gulp.watch(['app/**/*.php'], reload);
    gulp.watch(['app/assets/sass/**/*.scss'], ['sass', reload]);
    gulp.watch(['app/assets/js/**/*.js'], ['lint', reload]);
    gulp.watch(['app/assets/img/**/*.*'], ['sass', reload]);


});

gulp.task('serve-dist', ['build'], function() {
    connect.server({
        port: 9001,
        base: 'build',
        open: false
    });

    var proxy = httpProxy.createProxyServer({});

    browserSync({
        notify: false,
        port: 9000,

        server: {
            baseDir: ['build'],

            middleware: function(req, res, next) {
                var url = req.url;

                if (!url.match(/^\/(css|fonts)\//)) {
                    proxy.web(req, res, {
                        target: 'http://127.0.0.1:9001'
                    });
                } else {
                    next();
                }
            }
        }
    })




});


gulp.task('default', ['clean', 'sprite', 'sass', 'lint', 'serve', 'sprite']);
gulp.task('build', function(cb) {
    gulpsequence(['clean', 'sprite', 'images', 'scripts', 'html', 'uncss', 'copy'])(cb);
});
