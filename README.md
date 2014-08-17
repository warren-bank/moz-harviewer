# [HTTP Archive (.HAR file format) Viewer](https://github.com/warren-bank/moz-harviewer)
Firefox add-on that displays HTTP Archive data in .HAR format

## Screenshot

![Google homepage, saved on Aug 1, 2014](https://raw.githubusercontent.com/warren-bank/moz-harviewer/screenshots/01.png)

## Summary

  * based on: [HAR Viewer](https://github.com/janodvarko/harviewer)

    > notes:
    > * The derivative code contained in this branch (_master_) is prepared for inclusion within the add-on.
        It has been minified.
        Though this is appropriate for the codebase belonging strictly to the development of the add-on,
        it loses fidelity and obfuscates the changes made to _harviewer_.
    > * To have the best of both worlds, a separate branch [(_libs/harviewer_)](https://github.com/warren-bank/moz-harviewer/tree/libs/harviewer) has been added to this repository that tracks all of the changes made to _harviewer_.
    > * The first commit to that branch (_libs/harviewer_) is a mirror of two directories that were taken from a checkout of the [source repository](https://github.com/janodvarko/harviewer/tree/22c7b7b21c1db0f80ebcf8955ceea56b316ddde3);
        any individual file can be easily validated between repositories by comparing its SHA-1 hash in both locations.
    > * Subsequent commits to that branch (_libs/harviewer_) can be diff'ed against the earlier commit, which serves as a baseline, to see exactly what has been modified.
    > * The _RequireJS Optimizer_ [build config file](https://github.com/warren-bank/moz-harviewer/blob/libs/harviewer/scripts/app.build.js) is included;
        it would be very easy to validate that the [minified script](https://github.com/warren-bank/moz-harviewer/blob/master/chrome/skin/preview/scripts/harViewer.min.js) used by the add-on,
        the version that is included in this branch (_master_),
        is safe by running the _RequireJS Optimizer_ yourself and comparing output.

    >   <sub>actually.. if anyone does perform this comparison, you'll notice that the license comments differ slightly. A few manual edits were done post-optimizer (in the current release).</sub>

## Comments

  * The goal of this project is to provide a Firefox add-on that embeds HAR data visualization into the browser with automatic detection and display.

  * The best tool available to accomplish this task is [HAR Viewer](https://github.com/janodvarko/harviewer).
    * It's beautifully written.
    * It has all of the desired features.
      In fact, there were many features of this project that were not necessary to accomplish the stated goal.

  * The strategy chosen was to carve the "Preview" tab out of the original source code,
    and to repackage its functionality into a Firefox add-on.

  * The original source code was modified as little as possible.
    * configurable user options were moved from `cookie` storage to add-on preferences.
    * the Flash library (`downloadify`) that was used to extract/save the .HAR data
      to a local file upon user request was replaced with a pure javascript alternative.
    * `infoTip` can now properly determine the height of the document when the page is rendered in quirks mode.

  * All additional/unnecessary resources (scripts, css, images) were removed.
    The remaining resources were combined and minified.

  * Since the scripts are written as [AMD modules](http://requirejs.org/docs/whyamd.html),
    the [RequireJS Optimizer](http://requirejs.org/docs/optimization.html)
    was used to combine all of the modules into a single file.
    Within this file, the code is wrapped inside an anonymous closure.
    [Almond](https://github.com/jrburke/almond) is used as a lightweight embedded module loader.
    To kick things off, `require(["harViewer"])` is included by the optimizer to bootstrap the entry point.

  * Eventually, initialization of `harViewer` will complete.
    At which time, the event `onViewerInit` is fired.
    The add-on is listening for this event.
    When it occurs, the `harView` object can be retrieved from the DOM:

    > `harView = ( document.getElementById("content") ).repObject`

    The add-on will then directly invoke the module API, passing to it the HAR data:

    > `harView.appendPreview( json_string )`

## Detection methodology

  * This add-on will modify the display of all server responses (or local files) that satisfy all of the following criteria:
    * none of the following short-circuit conditions are true:
      * the location protocol is 'view-source:'
      * the location hash contains: `No-HTTP-Archive-Viewer`

        > notes:
        > * not case sensitive
        > * can be combined with other hash tokens by using one of the separators: `/,`

      * the location protocol is 'file:' and the location path does not terminate with the file extension: `.har`
      * the location pathname terminates with any of the following file extensions: `.json, .txt, .css, .js, .html, .md, .csv`
    * the HTTP header 'content-type' is one of:
        * 'application/json'
        * 'text/json'
        * 'text/x-json'
        * 'text/plain'
    * one of the following additional conditions are met:
        * the location pathname terminates with the file extension: `.har`
        * the location hash contains: `HTTP-Archive-Viewer`

          > note: If the response is HAR data and the pathname doesn't have a '.har' file extension
            (which is common when the data is being retrieved via passing querystring parameters to a backend script),
            then appending this token into the URL hash will short-circuit the final detection test:

        * the response content is confirmed to be JSON,
          and the schema of the JSON data is validated to be HAR.

          > note: Schema validation is normally a configurable user options.
            If it is used during detection and passes,
            then it will not be validated a second time regardless of the value of this preference.

## Notes:

  * The 'detection methodology' does not currently support JSONP (.harp) responses.
    It may be added later if there's interest by users to do so.

## User Preferences:

  * Initial Settings (applied at page creation):

    setting | default value
    ------- | -------------
    Validate JSON | <sub>true</sub>
    Show Page Timeline | <sub>true</sub>
    Show Statistics | <sub>true</sub>
    Expand All Pages | <sub>false</sub>
    Expand First Page | <sub>true</sub>

  * Request List:

    setting | default value
    ------- | -------------
    Visible Columns | <sub>url,status,size,timeline</sub>

  * Request Body:

    setting | default value
    ------- | -------------
    Phase Interval (ms) | <sub>4000</sub>
    Height of HTML Preview Panel (px) | <sub>100</sub>

  * Data to be Removed/Filtered from __Sanitized__ (HAR) Downloads:

    * Cookies:

      setting | default value
      ------- | -------------
      All Trace of Existence | <sub>false</sub>
      Only Values | <sub>true</sub>


## Examples

  > URLs to render in-browser after the add-on has been installed, which illustrate its functionality

  * http://httparchive.webpagetest.org/export.php?test=140801_0_8JH&run=1&cached=0&pretty=1

    > [google.com](http://www.google.com) via [httparchive.org](http://httparchive.org/websites.php)

    >> * This is the URL displayed in the screenshot (above).
         The server returns HAR-formatted JSON data.
         There is a caveat, though.
         * HAR isn't considered an in-browser data format.
           Since it has no 'content-type' (or MIME type) specifically assigned to it,
           the best type to use is that of JSON.
         * Since JSON is a very browser-centric data format,
           most servers will include a `Content-Disposition` header with the (HAR) response.
           This instructs the browser to display the 'save-as' dialog.
           For example, the following is the header returned from a request to this URL:

    >>     `Content-Disposition: attachment; filename=www.google.com.140801_0_8JH.har`

    >>   * This is a problem, since the purpose of this add-on is to render the response in-browser.

    >>   * The solution that I use (and believe to be the most general purpose)
           is to use another add-on that is specifically intended to combat this type of issue:

    >>     [Open In Browser](https://addons.mozilla.org/en-us/firefox/addon/open-in-browser/)

    >>   * After this add-on is installed, the 'save-as' dialog that is opened by the browser
           offers a new/additional option: `Open in browser as`

    >>   * If you select the option `Server sent MIME` from the dropdown list, then:
           * the `Content-Disposition` header will be ignored
           * the HAR file will be rendered in-browser using the 'content-type' sent by the server,
             which in this case is: `application/json`
           * this add-on will detect this 'content-type' and be given the opportunity to
             inspect the response using its 'detection methodology'..
             and ultimately render an in-browser viewer for the data.

    >> * There is one more possible conflict that is worth mentioning.
         The HAR file is now being rendered by the browser, and it's seen as a JSON type.
         If you have another add-on installed (into your browser) that is intended to [display JSON data](https://github.com/warren-bank/moz-json-data-view),
         then both add-ons will want to control the rendering of the page (and bad things could happen).

    >>   Options: (ranging from least obtrusive to most aggravating)
         * append some token to the URL request (for the HAR data)
           that can signal to the JSON viewer add-on that it should ignore this page.

    >>     ex: [http://httparchive.webpagetest.org/export.php?test=140801_0_8JH&run=1&cached=0&pretty=1#HTTP-Archive-Viewer/No-JSON-DataView](http://httparchive.webpagetest.org/export.php?test=140801_0_8JH&run=1&cached=0&pretty=1#HTTP-Archive-Viewer/No-JSON-DataView)

    >>   * save the data to a file on disk.
           Be sure to give its filename a `.har` extension;
           this will be necessary for the file to pass the 'detection methodology' when loaded.
           Load the local file into the browser, either via drag/drop or a URI using the `file:` protocol.
           The browser will (should) load the file using a `text/plain` MIME-type.
           The JSON viewer add-on won't detect that the file contains JSON.
           This add-on will detect that the file contains HAR-formatted JSON data.

    >>   * temporarily disable the JSON viewer add-on, which requires that the browser be restarted.

## Great Video
  * [Make The Web Fast: "The HAR Show"](https://www.youtube.com/watch?v=FmsLJHikRf8&t=20s)

    > on Google Developers Live <sub>(with Ilya Grigorik and Peter Lubbers)</sub>
    > * [related blog post](http://www.igvita.com/2012/08/28/web-performance-power-tool-http-archive-har/)
    > * [related gist](https://gist.github.com/igrigorik/3500508)

## Licenses
  * [HAR Viewer](https://github.com/janodvarko/harviewer):

    > [BSD](https://github.com/janodvarko/harviewer/raw/22c7b7b21c1db0f80ebcf8955ceea56b316ddde3/webapp/license.txt)
    > Copyright (c) 2007, Jan Odvarko

  * all original code belonging to [this project](https://github.com/warren-bank/moz-harviewer)

    > [GPLv2](http://www.gnu.org/licenses/gpl-2.0.txt)
    > Copyright (c) 2014, Warren Bank
