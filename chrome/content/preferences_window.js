var HTTP_Archive_Viewer_prefwindow = {
	"debug"				: true,
	"prefs"				: null,

	"get_prefs"			: function(){
		var branch_name	= "extensions.HTTP_Archive_Viewer.";

		return Components.classes["@mozilla.org/preferences-service;1"]
			.getService(Components.interfaces.nsIPrefService)
			.getBranch(branch_name);
	},

	// output: array of selected values, or FALSE if error
	"read_listbox"		: function(dom_id){
		var listbox, selected_items, selected_values, i, max;

		listbox			= document.getElementById(dom_id);
		if (! listbox){return false;}

		selected_items	= listbox.selectedItems;
		if ((typeof selected_items !== 'object') || (selected_items === null) || (typeof selected_items.length !== 'number')){return false;}

		selected_values	= [];
		max				= selected_items.length;
		for(i=0; i<max; i++) {
			selected_values.push( selected_items[i].value );
		}
		return selected_values;
	},

	// input: array of values to select
	"write_listbox"		: function(dom_id, selected_values, retail_current_selections){
		var listbox, i, max;

		listbox			= document.getElementById(dom_id);
		if (! listbox){return false;}

		if (! retail_current_selections){
			listbox.clearSelection();
		}

		max				= listbox.childNodes.length;
		for(i=0; i<max; i++) {
			if (selected_values.indexOf(listbox.childNodes[i].value) !== -1){
				listbox.addItemToSelection( listbox.childNodes[i] );
			}
		}
		return true;
	},

	"onload"			: function(){
		try {

			HTTP_Archive_Viewer_prefwindow.prefs = HTTP_Archive_Viewer_prefwindow.get_prefs();

			var _old		= {
				"visible_columns"	: HTTP_Archive_Viewer_prefwindow.prefs.getCharPref('request_list.visible_columns')
			};

			if (_old.visible_columns){
				(function(cols_csv){
					var dom_id, selected_values, retail_current_selections;

					dom_id						= "visible_columns";
					selected_values				= cols_csv.split(',');
					retail_current_selections	= false;

					HTTP_Archive_Viewer_prefwindow.write_listbox(dom_id, selected_values, retail_current_selections);
				})(_old.visible_columns);
			}

		}
		catch(e){
			if (HTTP_Archive_Viewer_prefwindow.debug) {alert(e.message);}
		}
	},

	"ondialogaccept"	: function(){
		try {

			var _old		= {
				"visible_columns"	: HTTP_Archive_Viewer_prefwindow.prefs.getCharPref('request_list.visible_columns')
			};

			var _new		= {
				"visible_columns"	: (function(dom_id){
										var selected_values = HTTP_Archive_Viewer_prefwindow.read_listbox(dom_id);
										if (selected_values === false){
											return _old.visible_columns;
										}
										else {
											return selected_values.join(',');
										}
									})("visible_columns")
			};

			var _updated	= {
				"visible_columns"	: (_old.visible_columns !== _new.visible_columns)
			};

			if (_updated.visible_columns){
				HTTP_Archive_Viewer_prefwindow.prefs.setCharPref("request_list.visible_columns", _new.visible_columns);
			}

			return true;

		}
		catch(e){
			if (HTTP_Archive_Viewer_prefwindow.debug) {alert(e.message);}
		}
	}

};
