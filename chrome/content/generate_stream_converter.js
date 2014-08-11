if (! HTTP_Archive_Viewer){
	var HTTP_Archive_Viewer = {};
}
if (! HTTP_Archive_Viewer.StreamConverters){
	HTTP_Archive_Viewer.StreamConverters = {};
}

if (typeof generate_stream_converter !== 'function'){
	Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

	var generate_stream_converter = function(class_description, class_id, from_mime_type){

		if (typeof HTTP_Archive_Viewer.StreamConverters[class_id] === 'function'){return;}

		HTTP_Archive_Viewer.StreamConverters[class_id] = function() {};

		HTTP_Archive_Viewer.StreamConverters[class_id].prototype = {
			classDescription:	class_description,
			classID:			Components.ID(class_id),
			contractID:			("@mozilla.org/streamconv;1?from=" +from_mime_type+ "&to=*/*"),

			_xpcom_factory: {
				createInstance: function(outer, iid) {
					if (outer != null)
						throw Components.results.NS_ERROR_NO_AGGREGATION;

					if (iid.equals(Components.interfaces.nsISupports) ||
						iid.equals(Components.interfaces.nsIStreamConverter) ||
						iid.equals(Components.interfaces.nsIStreamListener) ||
						iid.equals(Components.interfaces.nsIRequestObserver)) {
						return new HTTP_Archive_Viewer.StreamConverters[class_id]();
					}
					throw Components.results.NS_ERROR_NO_INTERFACE;
				}
			},

			QueryInterface: XPCOMUtils.generateQI(
				[Components.interfaces.nsIObserver,
				Components.interfaces.nsIStreamConverter,
				Components.interfaces.nsIStreamListener,
				Components.interfaces.nsIRequestObserver]
			),

			onStartRequest: function(aRequest, aContext) {
				this.data    = "";
				this.uri     = aRequest.QueryInterface (Components.interfaces.nsIChannel).URI.spec;
			    this.channel = aRequest;
			    this.channel.contentType = "text/html";
				this.channel.contentCharset = "UTF-8";
			    this.listener.onStartRequest (this.channel, aContext);
			},

			onStopRequest: function(aRequest, aContext, aStatusCode) {
			    var sis = Components.classes["@mozilla.org/io/string-input-stream;1"].createInstance(Components.interfaces.nsIStringInputStream);
			    sis.setData(this.data, this.data.length);
			    this.listener.onDataAvailable(this.channel, aContext, sis, 0, this.data.length);
			    this.listener.onStopRequest(this.channel, aContext, aStatusCode);
			},

			onDataAvailable: function(aRequest, aContext, aInputStream, aOffset, aCount) {
				var si = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance();
				si     = si.QueryInterface(Components.interfaces.nsIScriptableInputStream);
				si.init(aInputStream);
				this.data += si.read(aCount);
			},

			asyncConvertData: function(aFromType, aToType, aListener, aCtxt) {
			    this.listener = aListener;
			},

			convert: function(aFromStream, aFromType, aToType, aCtxt) {
			    return aFromStream;
			}
		};

	};
}