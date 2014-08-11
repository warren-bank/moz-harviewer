Components.utils.import("chrome://HTTP-Archive-Viewer/content/generate_stream_converter.js");

var this_stream_converter = (function(){
	var class_description, class_id, from_mime_type;

	class_description	= "JSON to HTML stream converter";
	class_id			= "{c4a0972d-729f-46c9-8116-bb17b6a3f369}";
	from_mime_type		= "text/x-json";

	generate_stream_converter(class_description, class_id, from_mime_type);

	return HTTP_Archive_Viewer.StreamConverters[class_id];
})();

if (XPCOMUtils.generateNSGetFactory)
    var NSGetFactory = XPCOMUtils.generateNSGetFactory([ this_stream_converter ]);
else
    var NSGetModule  = XPCOMUtils.generateNSGetModule( [ this_stream_converter ]);
