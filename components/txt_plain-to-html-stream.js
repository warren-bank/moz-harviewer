Components.utils.import("chrome://HTTP-Archive-Viewer/content/generate_stream_converter.js");

var this_stream_converter = (function(){
	var class_description, class_id, from_mime_type;

	class_description	= "JSON to HTML stream converter";
	class_id			= "{cc1987f3-ea6e-4f99-a99f-dfd07d4d7b90}";
	from_mime_type		= "text/plain";

	generate_stream_converter(class_description, class_id, from_mime_type);

	return HTTP_Archive_Viewer.StreamConverters[class_id];
})();

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([ this_stream_converter ]);
else
    var NSGetModule  = XPCOMUtils.generateNSGetModule( [ this_stream_converter ]);
