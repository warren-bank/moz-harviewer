Components.utils.import("chrome://HTTP-Archive-Viewer/content/generate_stream_converter.js");

var this_stream_converter = (function(){
	var class_description, class_id, from_mime_type;

	class_description	= "JSON to HTML stream converter";
	class_id			= "{cd6c8a2b-d0a8-46d3-b1cf-74d0198e9d0a}";
	from_mime_type		= "text/json";

	generate_stream_converter(class_description, class_id, from_mime_type);

	return HTTP_Archive_Viewer.StreamConverters[class_id];
})();

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([ this_stream_converter ]);
else
    var NSGetModule  = XPCOMUtils.generateNSGetModule( [ this_stream_converter ]);
