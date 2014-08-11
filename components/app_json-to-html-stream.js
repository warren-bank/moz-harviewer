Components.utils.import("chrome://HTTP-Archive-Viewer/content/generate_stream_converter.js");

var this_stream_converter = (function(){
	var class_description, class_id, from_mime_type;

	class_description	= "JSON to HTML stream converter";
	class_id			= "{2aef7db0-ba54-48f7-9a07-a8d724a73709}";
	from_mime_type		= "application/json";

	generate_stream_converter(class_description, class_id, from_mime_type);

	return HTTP_Archive_Viewer.StreamConverters[class_id];
})();

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([ this_stream_converter ]);
else
    var NSGetModule  = XPCOMUtils.generateNSGetModule( [ this_stream_converter ]);
