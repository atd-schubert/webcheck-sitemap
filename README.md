# webcheck-sitemap
A sitemap crawler for [webcheck](https://github.com/atd-schubert/node-webcheck).


## How to install

```bash
npm install --save webcheck-sitemap
```

## How to use

```js
/*jslint node:true*/

'use strict';

var SitemapPlugin = require('webcheck-sitemap');

var Webcheck = require('webcheck');

var webcheck = new Webcheck();
var plugin = new SitemapPlugin({

});

webcheck.addPlugin(plugin);
plugin.enable();


```

## Options
- `filterContentType`: Follow only in matching content-type (defaults to ).
- `filterStatusCode`: Follow only in matching HTTP status code (defaults to 2xx status codes).
- `follow`: Should this plugin follow sitemaps from sitemapindex'?
- `onlyMarked`: Should this plugin only process calls with setting-parameter `sitemap=true`?
- `onError`: Function that get executed on errors.
- `onData`: Function that get executed when data was fetched.


### Note for filters

Filters are regular expressions, but the plugin uses only the `.test(str)` method to proof. You are able to write
your own and much complexer functions by writing the logic in the test method of an object like this:

```js
opts = {
   filterSomething: {
       test: function (val) {
           return false || true;
       }
   }
}
```

## Properties

- `sitemap`: This object collects all sitemap data.
- `onError`: Function to call on errors (same as `opts.onError` from [options](#options)).
- `onData`: Function to call on data (same as `opts.onData` from [options](#options)).

## Working with onData

onData gives you the json parsed representation of the sitemap.

### URLset

```json
{
  "http://example.com/": {
    "loc": "http://example.com/",
    "changefreq": "daily",
    "priority": 0.8,
    "lastmod": "2006-01-07T00:00:00.000Z"
  }
}

### Sitemap index


```json
{
  "http://example.com/sitemap1.xml": {
    "loc": "http://example.com/sitemap1.xml",
    "changefreq": null,
    "priority": null,
    "lastmod": "2014-10-15T18:23:17.000Z"
  }
}

```
