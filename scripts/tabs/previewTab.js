/* See license.txt for terms of usage */

require.def("tabs/previewTab", [
    "domplate/domplate",
    "domplate/tabView",
    "core/lib",
    "i18n!nls/previewTab",
    "domplate/toolbar",
    "tabs/pageTimeline",
    "tabs/pageStats",
    "preview/pageList",
//	"core/cookies",
    "preview/validationError"
],

function(Domplate, TabView, Lib, Strings, Toolbar, Timeline, Stats, PageList, /* Cookies, */
    ValidationError) {

with (Domplate) {

//*************************************************************************************************
// Home Tab

function PreviewTab(model)
{
    this.model = model;

    this.toolbar = new Toolbar();
    this.timeline = new Timeline();
    this.stats = new Stats(model, this.timeline);

    // Initialize toolbar.
    this.toolbar.addButtons(this.getToolbarButtons());

    // Context menu listener.
    ValidationError.addListener(this);
}

PreviewTab.prototype = Lib.extend(TabView.Tab.prototype,
{
    id: "Preview",
    label: Strings.previewTabLabel,

    // Use tabBodyTag so, the basic content layout is rendered immediately
    // and not as soon as the tab is actually selected. This is useful when
    // new data are appended while the tab hasn't been selected yet.
    tabBodyTag:
        DIV({"class": "tab$tab.id\\Body tabBody", _repObject: "$tab"},
            DIV({"class": "previewToolbar"}),
            DIV({"class": "previewTimeline"}),
            DIV({"class": "previewStats"}),
            DIV({"class": "previewList"})
        ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Tab

    onUpdateBody: function(tabView, body)
    {
        // Render all UI components except of the page list. The page list is rendered
        // as soon as HAR data are loaded into the page.
        this.toolbar.render(Lib.$(body, "previewToolbar"));
        this.stats.render(Lib.$(body, "previewStats"));
        this.timeline.render(Lib.$(body, "previewTimeline"));

        // Show timeline & stats by default if the cookie says so (no animation)
        // But there should be an input.
        var input = this.model.input;
        if (input && user_prefs.show_timeline)
            this.onTimeline(false);

        if (input && user_prefs.show_stats)
            this.onStats(false);
    },

    getToolbarButtons: function()
    {
        var buttons = [
            {
                id: "showTimeline",
                label: Strings.showTimelineButton,
                tooltiptext: Strings.showTimelineTooltip,
                command: Lib.bindFixed(this.onTimeline, this, true)
            }
          , {
                id: "showStats",
                label: Strings.showStatsButton,
                tooltiptext: Strings.showStatsTooltip,
                command: Lib.bindFixed(this.onStats, this, true)
            }
		/*
          , {
                id: "clear",
                label: Strings.clearButton,
                tooltiptext: Strings.clearTooltip,
                command: Lib.bindFixed(this.onClear, this)
            }
		*/
          , {
                id: "download",
                tooltiptext: Strings.downloadTooltip,
                className: "harDownloadButton",
                command: Lib.bindFixed(this.onDownload, this)
            }
         , {
                id: "download",
                tooltiptext: Strings.sanitizedDownloadTooltip,
                className: "harSanitizedDownloadButton",
                command: Lib.bindFixed(this.onSanitizedDownload, this)
            }
        ];

        return buttons;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Toolbar commands

    onTimeline: function(animation)
    {
        // Update showTimeline button label.
        var button = this.toolbar.getButton("showTimeline");
        if (!button)
            return;

        this.timeline.toggle(animation);

        var visible = this.timeline.isVisible();
        button.label = Strings[visible ? "hideTimelineButton" : "showTimelineButton"];

        // Re-render toolbar to update label.
        this.toolbar.render();

		user_prefs.show_timeline = visible;
    },

    onStats: function(animation)
    {
        // Update showStats button label.
        var button = this.toolbar.getButton("showStats");
        if (!button)
            return;

        this.stats.toggle(animation);

        var visible = this.stats.isVisible();
        button.label = Strings[visible ? "hideStatsButton" : "showStatsButton"];

        // Re-render toolbar to update label.
        this.toolbar.render();

		user_prefs.show_stats = visible;
    },

/*
    onClear: function()
    {
        var href = document.location.href;
        var index = href.indexOf("?");
        document.location = href.substr(0, index);
    },
*/

	trigger_har_download: function(sanitize_har){
		var model, har_data, har_json;

		model		= this.model;
		har_data	= model ? model.input : false;

		if (sanitize_har && har_data && har_data.log && har_data.log.entries){
			if (user_prefs && user_prefs.sanitized_download){

				har_data = jQuery.extend(true, {}, har_data);

				if (user_prefs.sanitized_download.remove_cookies){
					// www.softwareishard.com/blog/har-12-spec/#cookies

					har_data.log.entries.forEach(function(entry){
						var cookie_headers = {
							"request"	: [],
							"response"	: []
						};

						// sanity check:
						if (! entry.request)
							{ entry.request = {"headers":[], "cookies":[]}; }
						if (! entry.request.headers)
							{ entry.request.headers = []; }
						if (! entry.request.cookies)
							{ entry.request.cookies = []; }
						if (! entry.response)
							{ entry.response = {"headers":[], "cookies":[]}; }
						if (! entry.response.headers)
							{ entry.response.headers = []; }
						if (! entry.response.cookies)
							{ entry.response.cookies = []; }

						entry.request.headers.forEach(function(header, index){
							if (header.name.toLowerCase() === 'cookie'){
								cookie_headers.request.unshift(index);
							}
						});

						entry.response.headers.forEach(function(header, index){
							if (header.name.toLowerCase() === 'set-cookie'){
								cookie_headers.response.unshift(index);
							}
						});

						if (user_prefs.sanitized_download.remove_cookies.whole_header){
							entry.request.cookies  = [];
							entry.response.cookies = [];

							// process in descending order
							cookie_headers.request.forEach(function(index){
								entry.request.headers.splice(index, 1);
							});
							cookie_headers.response.forEach(function(index){
								entry.response.headers.splice(index, 1);
							});
						}
						else if (user_prefs.sanitized_download.remove_cookies.value_only){
							entry.request.cookies.forEach(function(cookie){
								cookie.value = "";
							});
							entry.response.cookies.forEach(function(cookie){
								cookie.value = "";
							});

							cookie_headers.request.forEach(function(index){
								entry.request.headers[index].value = "";
							});
							cookie_headers.response.forEach(function(index){
								entry.response.headers[index].value = "";
							});
						}
					});
				}

			}
		}

		har_json	= (model && har_data) ? model.toJSON(har_data) : "";

		// $("body").empty().text(har_json); return;

		var Base64, get_filename, uri, downloader;

		// http://stackoverflow.com/questions/246801/how-can-you-encode-a-string-to-base64-in-javascript
		Base64 = (function() {
			"use strict";

			var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

			var _utf8_encode = function(string) {

				var utftext = "",
					c, n;

				string = string.replace(/\r\n/g, "\n");

				for (n = 0; n < string.length; n++) {

					c = string.charCodeAt(n);

					if (c < 128) {

						utftext += String.fromCharCode(c);

					} else if ((c > 127) && (c < 2048)) {

						utftext += String.fromCharCode((c >> 6) | 192);
						utftext += String.fromCharCode((c & 63) | 128);

					} else {

						utftext += String.fromCharCode((c >> 12) | 224);
						utftext += String.fromCharCode(((c >> 6) & 63) | 128);
						utftext += String.fromCharCode((c & 63) | 128);

					}

				}

				return utftext;
			};

			var _utf8_decode = function(utftext) {
				var string = "",
					i = 0,
					c = 0,
					c1 = 0,
					c2 = 0;

				while (i < utftext.length) {

					c = utftext.charCodeAt(i);

					if (c < 128) {

						string += String.fromCharCode(c);
						i++;

					} else if ((c > 191) && (c < 224)) {

						c1 = utftext.charCodeAt(i + 1);
						string += String.fromCharCode(((c & 31) << 6) | (c1 & 63));
						i += 2;

					} else {

						c1 = utftext.charCodeAt(i + 1);
						c2 = utftext.charCodeAt(i + 2);
						string += String.fromCharCode(((c & 15) << 12) | ((c1 & 63) << 6) | (c2 & 63));
						i += 3;

					}

				}

				return string;
			};

			var _hexEncode = function(input) {
				var output = '',
					i;

				for (i = 0; i < input.length; i++) {
					output += input.charCodeAt(i).toString(16);
				}

				return output;
			};

			var _hexDecode = function(input) {
				var output = '',
					i;

				if (input.length % 2 > 0) {
					input = '0' + input;
				}

				for (i = 0; i < input.length; i = i + 2) {
					output += String.fromCharCode(parseInt(input.charAt(i) + input.charAt(i + 1), 16));
				}

				return output;
			};

			var encode = function(input) {
				var output = "",
					chr1, chr2, chr3, enc1, enc2, enc3, enc4, i = 0;

				input = _utf8_encode(input);

				while (i < input.length) {

					chr1 = input.charCodeAt(i++);
					chr2 = input.charCodeAt(i++);
					chr3 = input.charCodeAt(i++);

					enc1 = chr1 >> 2;
					enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
					enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
					enc4 = chr3 & 63;

					if (isNaN(chr2)) {
						enc3 = enc4 = 64;
					} else if (isNaN(chr3)) {
						enc4 = 64;
					}

					output += _keyStr.charAt(enc1);
					output += _keyStr.charAt(enc2);
					output += _keyStr.charAt(enc3);
					output += _keyStr.charAt(enc4);

				}

				return output;
			};

			var decode = function(input) {
				var output = "",
					chr1, chr2, chr3, enc1, enc2, enc3, enc4, i = 0;

				input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

				while (i < input.length) {

					enc1 = _keyStr.indexOf(input.charAt(i++));
					enc2 = _keyStr.indexOf(input.charAt(i++));
					enc3 = _keyStr.indexOf(input.charAt(i++));
					enc4 = _keyStr.indexOf(input.charAt(i++));

					chr1 = (enc1 << 2) | (enc2 >> 4);
					chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
					chr3 = ((enc3 & 3) << 6) | enc4;

					output += String.fromCharCode(chr1);

					if (enc3 !== 64) {
						output += String.fromCharCode(chr2);
					}
					if (enc4 !== 64) {
						output += String.fromCharCode(chr3);
					}

				}

				return _utf8_decode(output);
			};

			var decodeToHex = function(input) {
				return _hexEncode(decode(input));
			};

			var encodeFromHex = function(input) {
				return encode(_hexDecode(input));
			};

			return {
				'encode': encode,
				'decode': decode,
				'decodeToHex': decodeToHex,
				'encodeFromHex': encodeFromHex
			};
		}());

		get_filename		= function(){
			var fname		= 'data.har';
			var pathname	= window.location.pathname;
			var pattern		= /^(?:.*\/)*([^\/]+\.har[p]?)$/i;
			if (pattern.test(pathname)){
				fname		= pathname.replace(pattern, '$1');
			}
			return fname;
		};

		uri					= 'data:application/octet-stream;base64,' + Base64.encode(har_json);
		downloader			= document.createElement("a");
		downloader.href		= uri;
		downloader.download	= get_filename();
		document.body.appendChild(downloader);
		downloader.click();
		document.body.removeChild(downloader);
	},

    onDownload: function(){
		this.trigger_har_download(false);
    },

    onSanitizedDownload: function(){
		this.trigger_har_download(true);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Public

    showStats: function(show)
    {
		user_prefs.show_stats = show;
    },

    showTimeline: function(show)
    {
		user_prefs.show_timeline = show;
    },

    append: function(input)
    {
        // The page list is responsible for rendering expandable list of pages and requests.
        // xxxHonza: There should probable be a list of all pageLists. Inside the pageList?
        var pageList = new PageList(input);
        pageList.append(Lib.$(this._body, "previewList"));

        // Append new pages into the timeline.
        this.timeline.append(input);

        // Register context menu listener (provids additional commands for the context menu).
        pageList.addListener(this);
    },

    appendError: function(err)
    {
        ValidationError.appendError(err, Lib.$(this._body, "previewList"));
    },

    addPageTiming: function(timing)
    {
        PageList.prototype.pageTimings.push(timing);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * //
    // Request List Commands

    getMenuItems: function(items, input, file)
    {
        if (!file)
            return;

        items.push("-");
        items.push(
        {
            label: Strings.menuShowHARSource,
            command: Lib.bind(this.showHARSource, this, input, file)
        });
    },

    showHARSource: function(menu, input, file)
    {
        var domTab = this.tabView.getTab("DOM");
        if (!domTab)
            return;

        domTab.select("DOM");
        domTab.highlightFile(input, file);
    }
});

//*************************************************************************************************

return PreviewTab;

//*************************************************************************************************
}});
