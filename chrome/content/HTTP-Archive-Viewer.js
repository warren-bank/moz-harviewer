window.addEventListener('load', function load(event) {
	window.removeEventListener('load', load, false);
	HTTP_Archive_Viewer.init();
}, false);

if (!HTTP_Archive_Viewer) {
	var HTTP_Archive_Viewer = {

		prefs: null,
		load_prefs: function(){
			this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
							.getService(Components.interfaces.nsIPrefService)
							.getBranch("extensions.HTTP_Archive_Viewer.");
		},

		init: function() {
			var appcontent = document.getElementById('appcontent');
			if (appcontent){
				this.load_prefs();
				appcontent.addEventListener('DOMContentLoaded', this.onPageLoad, true);
			}
		},

		onPageLoad: function(aEvent) {
			var self				= HTTP_Archive_Viewer;
			var document			= aEvent.originalTarget;
			var is_HAR				= false;
			var is_validated		= false;
			var body, json_text;

			// short-circuit when: request to view page source
			// (takes priority over invoker token in hash)
			if (
					(is_HAR !== true)
				&&	(document.location.protocol.toLowerCase() === "view-source:")
			){return;}

			// short-circuit when: detect stop token in hash
			// (takes priority over invoker token in hash)
			if (
					(is_HAR !== true)
				&&	( /(?:^[#]?|[\/,])No-HTTP-Archive-Viewer(?:[\/,]|$)/i.test(document.location.hash) )
			){return;}

			// detect invoker token in hash
			if (
					(is_HAR !== true)
				&&	( /(?:^[#]?|[\/,])HTTP-Archive-Viewer(?:[\/,]|$)/i.test(document.location.hash) )
			){is_HAR = true;}

			// short-circuit when: loaded from local disk, file extension is not '.har'
			if (
					(is_HAR !== true)
				&&	( document.location.protocol.toLowerCase() === "file:" )
				&&	( /\.har$/.test(document.location.pathname.toLowerCase()) !== true )
			){return;}

			// short-circuit when: file extension is known to not be HAR
			if (
					(is_HAR !== true)
				&&	( /\.(?:json|txt|css|js|html|md|csv)$/.test(document.location.pathname.toLowerCase()) )
			){return;}

			if (is_HAR !== true){
				switch( document.contentType.toLowerCase() ){
					case 'application/json':
					case 'text/json':
					case 'text/x-json':
					case 'text/plain':
						is_HAR			= 1;
						break;
				}
			}

			if (is_HAR === false){return;}

			if (
					(is_HAR !== true)
				&&	( /\.har$/.test(document.location.pathname.toLowerCase()) )
			){is_HAR = true;}

			body							= document.body;
			json_text						= body.textContent;

			if (is_HAR !== true){
				// confirm that the response is JSON, and that it validates against the HAR Schema.
				// when this validation occurs/passes, store a flag that will be used to override the user-preference for validation; there's no reason to do it twice.
				(function(){
					try {
						var $HAR_Validator	= new HAR_Validator();
						var ok				= $HAR_Validator.validate(json_text);
						if (ok){
							is_HAR			= true;
							is_validated	= true;
						}
					}
					catch(e){
						is_HAR				= false;
					}

				})();
			}

			if (is_HAR !== true){return;}

			document.title					= 'HTTP Archive Viewer';

			(function(){
				var get_inline_js, jq;

				get_inline_js		= function(){
					var user_prefs, inline_js;

					user_prefs = {
						"validate_json"		: (is_validated? false : self.prefs.getBoolPref("validate_json")),
						"show_timeline"		: self.prefs.getBoolPref("show_timeline"),
						"show_stats"		: self.prefs.getBoolPref("show_stats"),
						"expand_all_pages"	: self.prefs.getBoolPref("expand_all_pages"),
						"expand_first_page"	: self.prefs.getBoolPref("expand_first_page"),
						"request_list"		: {
							"visible_columns"		: (self.prefs.getCharPref("request_list.visible_columns")).split(','),
							"phase_interval"		: self.prefs.getIntPref("request_list.phase_interval")
						},
						"request_body"		: {
							"html_preview_height"	: self.prefs.getIntPref("request_body.html_preview_height")
						},
						"sanitized_download"	: {
							"remove_cookies"		: {
								"whole_header"		: self.prefs.getBoolPref("sanitized_download.remove_cookies.whole_header"),
								"value_only"		: self.prefs.getBoolPref("sanitized_download.remove_cookies.value_only")
							}
						}
					};

					inline_js = [];
					inline_js.push('var user_prefs = ' + JSON.stringify(user_prefs) + ';');
					inline_js.push('(function($){var content = document.getElementById("content");$(content).bind("onViewerInit", function(){var harView = content.repObject;harView.appendPreview(' + JSON.stringify(json_text) + ');});})(jQuery);');
					inline_js = inline_js.join("\n");

					return inline_js;
				};

				// empty the body
				while (body.firstChild) {
					body.removeChild(body.firstChild);
				}

				// give body a class name
				body.classList.add("harBody");

				// append to body: all non-script resources
				$C({
					"link": {
						"rel"		: "stylesheet",
						"type"		: "text/css",
						"href"		: "resource://HARvskin/preview/css/harViewer.min.css"
					},
					"div": {
						"id"		: "content",
						"version"	: "2.0.16"
					}
				}, body, document);

				// jquerify the page: construct a detached script tag
				jq = $C({
					"script": {
						"type"		: "text/javascript",
						"src"		: "resource://HARvskin/preview/scripts/jquery.min.js"
					}
				}, false, document);

				// jquerify the page: add an "onload" event handler
				jq.onload = function(){

					// jQuery is now loaded.
					// append to body: all remaining scripts that depend on jQuery
					$C({
						"script_01": {
							"type"		: "text/javascript",
							"text"		: get_inline_js()
						},
						"script_02": {
							"type"		: "text/javascript",
							"src"		: "resource://HARvskin/preview/scripts/harViewer.min.js"
						}
					}, body, document);

				};

				// jquerify the page: append the script tag to body
				body.appendChild(jq);

			})();

		}
	};
}
