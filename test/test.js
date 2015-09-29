/*jslint node:true*/

/*global describe, it, before, after, beforeEach, afterEach*/

'use strict';

var SitemapPlugin = require('../');

var Webcheck = require('webcheck');
var freeport = require('freeport');
var express = require('express');


describe('Sitemap Plugin', function () {
    var port;
    before(function (done) {
        var app = express();

        /*jslint unparam: true*/
        app.get('/sitemapindex.xml', function (req, res) {
            res.set('Content-Type', 'application/xml').send('<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>http://localhost:' + port + '/sitemap1.xml</loc><lastmod>2014-10-15T18:23:17+00:00</lastmod></sitemap></sitemapindex>');
        });
        app.get('/sitemap1.xml', function (req, res) {
            res.set('Content-Type', 'application/xml').send('<?xml version="1.0" encoding="utf-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd"><url><loc>http://example.com/</loc><lastmod>2006-01-07</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url></urlset>');
        });
        app.get('/another.xml', function (req, res) {
            res.set('Content-Type', 'application/xml').send('<?xml version="1.0" encoding="utf-8"?><index>Some other xml</index>');
        });
        /*jslint unparam: false*/

        freeport(function (err, p) {
            if (err) {
                done(err);
            }
            port = p;
            app.listen(port);
            done();
        });
    });
    describe('Get sitemap', function () {
        var webcheck, plugin;

        before(function () {
            webcheck = new Webcheck();
            plugin = new SitemapPlugin({
                follow: false
            });
            webcheck.addPlugin(plugin);
            plugin.enable();
        });

        it('should not call on different XMLs', function (done) {
            plugin.onError = done;
            plugin.onData = function () {
                return done(new Error('Called data but is no sitemap'));
            };

            webcheck.crawl({
                url: 'http://localhost:' + port + '/another.xml'
            }, function (err) {
                if (err) {
                    return done(err);
                }
                return done();
            });
        });

        it('should get urlset of a sitemap', function (done) {
            plugin.onError = done;
            plugin.onData = function (data) {
                var elem = data['http://example.com/'];
                if (elem &&
                        elem.loc === 'http://example.com/' &&
                        Date.prototype.isPrototypeOf(elem.lastmod) &&
                        elem.lastmod.getFullYear() === 2006 &&
                        elem.lastmod.getMonth() === 0 &&
                        elem.lastmod.getDate() === 7 &&
                        elem.changefreq === 'daily' &&
                        elem.priority === 0.8) {
                    return done();
                }
                return done(new Error('Wrong content fetched'));
            };

            webcheck.crawl({
                url: 'http://localhost:' + port + '/sitemap1.xml'
            }, function (err) {
                if (err) {
                    return done(err);
                }
            });
        });
        it('should get an index of a sitemap', function (done) {
            plugin.onError = done;
            plugin.onData = function (data) {
                var elem = data['http://localhost:' + port + '/sitemap1.xml'];
                if (elem &&
                        elem.loc === 'http://localhost:' + port + '/sitemap1.xml' &&
                        Date.prototype.isPrototypeOf(elem.lastmod) &&
                        elem.lastmod.getFullYear() === 2014 &&
                        elem.lastmod.getMonth() === 9 &&
                        elem.lastmod.getDate() === 15) {
                    return done();
                }
                return done(new Error('Wrong content fetched'));
            };

            webcheck.crawl({
                url: 'http://localhost:' + port + '/sitemapindex.xml'
            }, function (err) {
                if (err) {
                    return done(err);
                }
            });
        });
    });
});
