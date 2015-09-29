/*jslint node:true*/
'use strict';

var WebcheckPlugin = require('webcheck/plugin');
var cheerio = require('cheerio');

var pkg = require('./package.json');
/**
 * A helper function for empty regular expressions
 * @private
 * @type {{test: Function}}
 */
var emptyFilter = {
    test: function () {
        return true;
    }
};

/**
 * Sitemap parser plugin for webcheck.
 * @author Arne Schubert <atd.schubert@gmail.com>
 * @param {{}} [opts] - Options for this plugin
 * @param {RegExp|{test:Function}} [opts.filterContentType] - Follow only in matching content-type
 * @param {RegExp|{test:Function}} [opts.filterStatusCode] - Follow only in matching HTTP status code
 * @param {RegExp|{test:Function}} [opts.filterUrl] - Follow only in matching url
 * @param {boolean} [opts.follow=true] - Follow sitemap indexes
 * @param {boolean} [opts.onlyMarked=false] - Process only resources marked as sitemap
 * @param {Function} [opts.onError] - Function to call on errors
 * @param {Function} [opts.onData] - Function to call after fetching data
 * @augments Webcheck.Plugin
 * @constructor
 */
var SitemapPlugin = function (opts) {
    var self;

    self = this;
    WebcheckPlugin.apply(this, arguments);

    opts = opts || {};

    opts.filterContentType = opts.filterContentType || /^(text|application)\/([a-zA-Z0-9\-_]*\+)?xml/;
    opts.filterStatusCode = opts.filterStatusCode || /^2/;
    opts.filterUrl = opts.filterUrl || emptyFilter;

    if (!opts.hasOwnProperty('follow')) {
        opts.follow = true;
    }
    if (!opts.hasOwnProperty('onData')) {
        this.onData = opts.onData;
    }
    if (!opts.hasOwnProperty('onError')) {
        this.onError = opts.onError;
    }

    this.sitemap = {};

    this.middleware = function (result, next) {
        var rest = '',
            type,
            sitemap = {};

        if (!opts.filterUrl.test(result.url) ||
                !opts.filterContentType.test(result.response.headers['content-type']) ||
                !opts.filterStatusCode.test(result.response.statusCode.toString())) {
            return next();
        }
        result.settings.parameters = result.settings.parameters || {};

        if (opts.onlyMarked && !result.settings.parameters.sitemap) {
            return;
        }

        result.response.once('data', function (chunk) {
            var str = chunk.toString();
            if (/<sitemapindex/.test(str)) {
                type = 'index';
            } else if (/<urlset/.test(str)) {
                type = 'map';
            }
        });

        result.response.on('data', function (chunk) {
            var str,
                first,
                last,
                $;
            str = rest + chunk.toString();

            if (type === 'map') {
                first = str.indexOf('<url');
                last = str.lastIndexOf('</url>') + 6;

                rest = str.substring(last, str.length);
                str = str.substring(first, last);

                $ = cheerio.load('<urlset>' + str + '</urlset>');
                /*jslint unparam:true*/
                $('url').each(function (i, elem) {
                    var tmp,
                        $elem = $(elem),
                        date;

                    tmp = {
                        loc: $elem.find('loc').text(),
                        changefreq: $elem.find('changefreq').text() || null,
                        priority: parseFloat($elem.find('priority').text()) || null
                    };

                    date = $elem.find('lastmod').text();

                    if (date) {
                        date = new Date(date);
                    }

                    tmp.lastmod = date;

                    if (tmp.loc) {
                        self.sitemap[tmp.loc] = tmp;
                        sitemap[tmp.loc] = tmp;
                    }

                });
                /*jslint unparam:false*/
            } else if (type === 'index') {
                first = str.indexOf('<sitemap');
                last = str.lastIndexOf('</sitemap>') + 10;

                rest = str.substring(last, str.length);
                str = str.substring(first, last);

                $ = cheerio.load('<sitemapindex>' + str + '</sitemapindex>');
                /*jslint unparam:true*/
                $('sitemap').each(function (i, elem) {
                    var tmp,
                        $elem = $(elem),
                        date;

                    tmp = {
                        loc: $elem.find('loc').text(),
                        changefreq: $elem.find('changefreq').text() || null,
                        priority: parseFloat($elem.find('priority').text()) || null
                    };

                    date = $elem.find('lastmod').text();

                    if (date) {
                        date = new Date(date);
                    }

                    tmp.lastmod = date;

                    if (tmp.loc) {
                        sitemap[tmp.loc] = tmp;
                    }

                    if (opts.follow) {
                        self.handle.crawl({
                            url: $elem.find('loc').text(),
                            parameters: {
                                sitemap: true
                            }
                        }, function (err) {
                            if (err) {
                                self.onError(err, result);
                            }
                        });
                    }

                });
                /*jslint unparam:false*/
            }
        });

        result.response.on('end', function () {
            if (type === 'index' || type === 'map') {
                self.onData(sitemap, result);
            }
        });

        next();
    };
};

SitemapPlugin.prototype = {
    '__proto__': WebcheckPlugin.prototype,
    package: pkg,

    /**
     * Complete sitemap
     * @type {{}}
     */
    sitemap: {},
    /**
     *
     * @param {error} err - Error that was thrown
     * @param {webcheck.result} result - Webcheck result object
     */
    onError: function (err, result) {
        console.error(err, result.url);
    },
    /**
     *
     * @param {{}} data - Sitemap data
     * @param {webcheck.result} result - Webcheck result object
     */
    onData: function (data, result) {
        console.warn('Warning: Do not handle sitemap data from ' + result.url, data);
    }
};

module.exports = SitemapPlugin;
