var HTTP_Archive_Viewer_prefwindow = {
	"debug"				: false,
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
	"write_listbox"		: function(dom_id, selected_values, retain_current_selections){
		var listbox, i, max;

		listbox			= document.getElementById(dom_id);
		if (! listbox){return false;}

		if (! retain_current_selections){
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

	// input:
	//   - "dom_id" refers to a "radiogroup"
	//   - "value_to_pref_map" is a hash table.
	//     keys are radio-button "value" attributes.
	//     values are strings that can be passed to:
	//       prefs.setBoolPref()
	"read_radiogroup"	: function(dom_id, value_to_pref_map){
		var radiogroup, selected_index, count, i, item, value;

		radiogroup		= document.getElementById(dom_id);
		if (! radiogroup){return false;}

		selected_index	= radiogroup.selectedIndex;
		count			= radiogroup.itemCount;

		for (i=0; i<count; i++){
			item		= radiogroup.getItemAtIndex(i);
			value		= item.value;

			if (value_to_pref_map[value]){
				HTTP_Archive_Viewer_prefwindow.prefs.setBoolPref(
					value_to_pref_map[value],
					(i === selected_index)
				);
			}
		}
	},

	// input:
	//   - "dom_id" refers to a "radiogroup"
	//   - "mutually_exclusive_prefs" is a hash table.
	//     keys are radio-button "value" attributes.
	//     values are boolean; only one (at most) may be true.
	"write_radiogroup"	: function(dom_id, mutually_exclusive_prefs){
		var radiogroup, count, i, item, value;

		radiogroup		= document.getElementById(dom_id);
		if (! radiogroup){return false;}

		count			= radiogroup.itemCount;

		for (i=0; i<count; i++){
			item		= radiogroup.getItemAtIndex(i);
			value		= item.value;
			if ( mutually_exclusive_prefs[value] === true ){
				radiogroup.selectedIndex	= i;
				i							= count;
			}
		}
	},

	"onload"			: function(){
		try {
			HTTP_Archive_Viewer_prefwindow.prefs = HTTP_Archive_Viewer_prefwindow.get_prefs();

			var tasks = {};
			tasks['request_list.visible_columns'] = function(){
				var _old		= {
					"visible_columns"	: HTTP_Archive_Viewer_prefwindow.prefs.getCharPref('request_list.visible_columns')
				};

				if (_old.visible_columns){
					(function(cols_csv){
						var dom_id, selected_values, retain_current_selections;

						dom_id						= "visible_columns";
						selected_values				= cols_csv.split(',');
						retain_current_selections	= false;

						HTTP_Archive_Viewer_prefwindow.write_listbox(dom_id, selected_values, retain_current_selections);
					})(_old.visible_columns);
				}
			};
			tasks['sanitized_download.remove_cookies'] = function(){
				var dom_id, mutually_exclusive_prefs;

				dom_id								= "remove_cookies";
				mutually_exclusive_prefs			= {
					"whole_header"		: HTTP_Archive_Viewer_prefwindow.prefs.getBoolPref("sanitized_download.remove_cookies.whole_header"),
					"value_only"		: HTTP_Archive_Viewer_prefwindow.prefs.getBoolPref("sanitized_download.remove_cookies.value_only")
				};

				HTTP_Archive_Viewer_prefwindow.write_radiogroup(dom_id, mutually_exclusive_prefs);
			};

			tasks['request_list.visible_columns']();
			tasks['sanitized_download.remove_cookies']();
		}
		catch(e){
			if (HTTP_Archive_Viewer_prefwindow.debug) {alert(e.message);}
		}
	},

	"ondialogaccept"	: function(){
		try {

			var tasks = {};
			tasks['request_list.visible_columns'] = function(){
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
			};
			tasks['sanitized_download.remove_cookies'] = function(){
				var dom_id, value_to_pref_map;

				dom_id					= "remove_cookies";
				value_to_pref_map		= {
					"whole_header"		: "sanitized_download.remove_cookies.whole_header",
					"value_only"		: "sanitized_download.remove_cookies.value_only"
				};

				HTTP_Archive_Viewer_prefwindow.read_radiogroup(dom_id, value_to_pref_map);
			};

			tasks['request_list.visible_columns']();
			tasks['sanitized_download.remove_cookies']();
		}
		catch(e){
			if (HTTP_Archive_Viewer_prefwindow.debug) {alert(e.message);}
		}
		finally {
			return true;
		}
	}

};
