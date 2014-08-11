var HAR_Validator = function(){};

HAR_Validator.prototype.resolve_HAR_Schema_logType = function(){

	// ============================================================================================
	// core/lib.js
	var fromISOString = function(text) {
		if (!text)
			return null;

		var regex = /(\d\d\d\d)(-)?(\d\d)(-)?(\d\d)(T)?(\d\d)(:)?(\d\d)(:)?(\d\d)(\.\d+)?(Z|([+-])(\d\d)(:)?(\d\d))/;
		var reg = new RegExp(regex);
		var m = text.toString().match(new RegExp(regex));
		if (!m)
			return null;

		var date = new Date();
		date.setUTCDate(1);
		date.setUTCFullYear(parseInt(m[1], 10));
		date.setUTCMonth(parseInt(m[3], 10) - 1);
		date.setUTCDate(parseInt(m[5], 10));
		date.setUTCHours(parseInt(m[7], 10));
		date.setUTCMinutes(parseInt(m[9], 10));
		date.setUTCSeconds(parseInt(m[11], 10));

		if (m[12])
			date.setUTCMilliseconds(parseFloat(m[12]) * 1000);
		else
			date.setUTCMilliseconds(0);

		if (m[13] != 'Z') {
			var offset = (m[15] * 60) + parseInt(m[17], 10);
			offset *= ((m[14] == '-') ? -1 : 1);
			date.setTime(date.getTime() - offset * 60 * 1000);
		}

		return date;
	};

	// ============================================================================================
	// preview/ref.js
	var resolveJson = function(root, args) {
		args = args || {};
		var idAttribute = args.idAttribute || 'id';
		var prefix = args.idPrefix || '';
		var assignAbsoluteIds = args.assignAbsoluteIds;
		var index = args.index || {}; // create an index if one doesn't exist
		var timeStamps = args.timeStamps;
		var ref, reWalk = [];
		var pathResolveRegex = /^(.*\/)?(\w+:\/\/)|[^\/\.]+\/\.\.\/|^.*\/(\/)/;
		var addProp = function(id, prop) {
			return id + (id.match(/#/) ? id.length == 1 ? '' : '.' : '#') + prop;
		};
		var F = function() {};

		function walk(it, stop, defaultId, schema, defaultObject) {
			// this walks the new graph, resolving references and making other changes
			var update, val, id = idAttribute in it ? it[idAttribute] : defaultId;
			if (id !== undefined) {
				id = (prefix + id).replace(pathResolveRegex, '$2$3');
			}
			var target = defaultObject || it;
			if (id !== undefined) { // if there is an id available...
				if (assignAbsoluteIds) {
					it.__id = id;
				}
				if (args.schemas && (!(it instanceof Array)) && // won't try on arrays to do prototypes, plus it messes with queries 
					(val = id.match(/^(.+\/)[^\.\[]*$/))) { // if it has a direct table id (no paths)
					schema = args.schemas[val[1]];
				}
				// if the id already exists in the system, we should use the existing object, and just 
				// update it... as long as the object is compatible
				if (index[id] && ((it instanceof Array) == (index[id] instanceof Array))) {
					target = index[id];
					delete target.$ref; // remove this artifact
					update = true;
				} else {
					var proto = schema && schema.prototype; // and if has a prototype
					if (proto) {
						// if the schema defines a prototype, that needs to be the prototype of the object
						F.prototype = proto;
						target = new F();
					}
				}
				index[id] = target; // add the prefix, set _id, and index it
				if (timeStamps) {
					timeStamps[id] = args.time;
				}
			}
			var properties = schema && schema.properties;
			var length = it.length;
			for (var i in it) {
				if (i == length) {
					break;
				}
				if (it.hasOwnProperty(i)) {
					val = it[i];
					var propertyDefinition = properties && properties[i];
					if (propertyDefinition && propertyDefinition.format == 'date-time' && typeof val == 'string') {
						val = fromISOString(val);
					} else if ((typeof val == 'object') && val && !(val instanceof Date)) {
						ref = val.$ref;
						if (ref) { // a reference was found
							// make sure it is a safe reference
							delete it[i]; // remove the property so it doesn't resolve to itself in the case of id.propertyName lazy values
							var path = ref.replace(/(#)([^\.\[])/, '$1.$2').match(/(^([^\[]*\/)?[^#\.\[]*)#?([\.\[].*)?/); // divide along the path
							if ((ref = (path[1] == '$' || path[1] == 'this' || path[1] == '') ? root : index[(prefix + path[1]).replace(pathResolveRegex, '$2$3')])) { // a $ indicates to start with the root, otherwise start with an id
								// if there is a path, we will iterate through the path references
								if (path[3]) {
									path[3].replace(/(\[([^\]]+)\])|(\.?([^\.\[]+))/g, function(t, a, b, c, d) {
										ref = ref && ref[b ? b.replace(/[\"\'\\]/, '') : d];
									});
								}
							}
							if (ref) {
								// otherwise, no starting point was found (id not found), if stop is set, it does not exist, we have
								// unloaded reference, if stop is not set, it may be in a part of the graph not walked yet,
								// we will wait for the second loop
								val = ref;
							} else {
								if (!stop) {
									var rewalking;
									if (!rewalking) {
										reWalk.push(target); // we need to rewalk it to resolve references
									}
									rewalking = true; // we only want to add it once
								} else {
									val = walk(val, false, val.$ref, propertyDefinition);
									// create a lazy loaded object
									val._loadObject = args.loader;
								}
							}
						} else {
							if (!stop) { // if we are in stop, that means we are in the second loop, and we only need to check this current one,
								// further walking may lead down circular loops
								val = walk(
									val,
									reWalk == it,
									id && addProp(id, i), // the default id to use
									propertyDefinition,
									// if we have an existing object child, we want to 
									// maintain it's identity, so we pass it as the default object
									target != it && typeof target[i] == 'object' && target[i]
								);
							}
						}
					}
					it[i] = val;
					if (target != it && !target.__isDirty) { // do updates if we are updating an existing object and it's not dirty				
						var old = target[i];
						target[i] = val; // only update if it changed
						if (update && val !== old && // see if it is different 
							!target._loadObject && // no updates if we are just lazy loading 
							!(val instanceof Date && old instanceof Date && val.getTime() == old.getTime()) && // make sure it isn't an identical date
							!(typeof val == 'function' && typeof old == 'function' && val.toString() == old.toString()) && // make sure it isn't an indentical function
							index.onUpdate) {
							index.onUpdate(target, i, old, val); // call the listener for each update
						}
					}
				}
			}

			if (update) {
				// this means we are updating, we need to remove deleted
				for (i in target) {
					if (!target.__isDirty && target.hasOwnProperty(i) && !it.hasOwnProperty(i) && i != '__id' && i != '__clientId' && !(target instanceof Array && isNaN(i))) {
						if (index.onUpdate && i != "_loadObject" && i != "_idAttr") {
							index.onUpdate(target, i, target[i], undefined); // call the listener for each update
						}
						delete target[i];
						while (target instanceof Array && target.length && target[target.length - 1] === undefined) {
							// shorten the target if necessary
							target.length--;
						}
					}
				}
			} else {
				if (index.onLoad) {
					index.onLoad(target);
				}
			}
			return target;
		}
		if (root && typeof root == 'object') {
			root = walk(root, false, args.defaultId); // do the main walk through
			walk(reWalk, false); // re walk any parts that were not able to resolve references on the first round
		}
		return root;
	};

	// ============================================================================================
	// preview/harSchema.js
	var HarSchema = (function() {
		var dateTimePattern = /^(\d{4})(-)?(\d\d)(-)?(\d\d)(T)?(\d\d)(:)?(\d\d)(:)?(\d\d)(\.\d+)?(Z|([+-])(\d\d)(:)?(\d\d))/;

		/**
		 * Root HTML Archive type.
		 */
		var logType = {
			"logType": {
				"id": "logType",
				"description": "HTTP Archive structure.",
				"type": "object",
				"properties": {
					"log": {
						"type": "object",
						"properties": {
							"version": {
								"type": "string"
							},
							"creator": {
								"$ref": "creatorType"
							},
							"browser": {
								"$ref": "browserType"
							},
							"pages": {
								"type": "array",
								"optional": true,
								"items": {
									"$ref": "pageType"
								}
							},
							"entries": {
								"type": "array",
								"items": {
									"$ref": "entryType"
								}
							},
							"comment": {
								"type": "string",
								"optional": true
							}
						}
					}
				}
			}
		};

		var creatorType = {
			"creatorType": {
				"id": "creatorType",
				"description": "Name and version info of the log creator app.",
				"type": "object",
				"properties": {
					"name": {
						"type": "string"
					},
					"version": {
						"type": "string"
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		};

		var browserType = {
			"browserType": {
				"id": "browserType",
				"description": "Name and version info of used browser.",
				"type": "object",
				"optional": true,
				"properties": {
					"name": {
						"type": "string"
					},
					"version": {
						"type": "string"
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		};

		var pageType = {
			"pageType": {
				"id": "pageType",
				"description": "Exported web page",
				"optional": true,
				"properties": {
					"startedDateTime": {
						"type": "string",
						"format": "date-time",
						"pattern": dateTimePattern
					},
					"id": {
						"type": "string",
						"unique": true
					},
					"title": {
						"type": "string"
					},
					"pageTimings": {
						"$ref": "pageTimingsType"
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		};

		var pageTimingsType = {
			"pageTimingsType": {
				"id": "pageTimingsType",
				"description": "Timing info about page load",
				"properties": {
					"onContentLoad": {
						"type": "number",
						"optional": true,
						"min": -1
					},
					"onLoad": {
						"type": "number",
						"optional": true,
						"min": -1
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		};

		var entryType = {
			"entryType": {
				"id": "entryType",
				"description": "Request and Response related info",
				"optional": true,
				"properties": {
					"pageref": {
						"type": "string",
						"optional": true
					},
					"startedDateTime": {
						"type": "string",
						"format": "date-time",
						"pattern": dateTimePattern
					},
					"time": {
						"type": "number",
						"min": 0
					},
					"request": {
						"$ref": "requestType"
					},
					"response": {
						"$ref": "responseType"
					},
					"cache": {
						"$ref": "cacheType"
					},
					"timings": {
						"$ref": "timingsType"
					},
					"serverIPAddress": {
						"type": "string",
						"optional": true
					},
					"connection": {
						"type": "string",
						"optional": true
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		};

		var requestType = {
			"requestType": {
				"id": "requestType",
				"description": "Monitored request",
				"properties": {
					"method": {
						"type": "string"
					},
					"url": {
						"type": "string"
					},
					"httpVersion": {
						"type": "string"
					},
					"cookies": {
						"type": "array",
						"items": {
							"$ref": "cookieType"
						}
					},
					"headers": {
						"type": "array",
						"items": {
							"$ref": "recordType"
						}
					},
					"queryString": {
						"type": "array",
						"items": {
							"$ref": "recordType"
						}
					},
					"postData": {
						"$ref": "postDataType"
					},
					"headersSize": {
						"type": "integer"
					},
					"bodySize": {
						"type": "integer"
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		};

		var recordType = {
			"recordType": {
				"id": "recordType",
				"description": "Helper name-value pair structure.",
				"properties": {
					"name": {
						"type": "string"
					},
					"value": {
						"type": "string"
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		};

		var responseType = {
			"responseType": {
				"id": "responseType",
				"description": "Monitored Response.",
				"properties": {
					"status": {
						"type": "integer"
					},
					"statusText": {
						"type": "string"
					},
					"httpVersion": {
						"type": "string"
					},
					"cookies": {
						"type": "array",
						"items": {
							"$ref": "cookieType"
						}
					},
					"headers": {
						"type": "array",
						"items": {
							"$ref": "recordType"
						}
					},
					"content": {
						"$ref": "contentType"
					},
					"redirectURL": {
						"type": "string"
					},
					"headersSize": {
						"type": "integer"
					},
					"bodySize": {
						"type": "integer"
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		};

		var cookieType = {
			"cookieType": {
				"id": "cookieType",
				"description": "Cookie description.",
				"properties": {
					"name": {
						"type": "string"
					},
					"value": {
						"type": "string"
					},
					"path": {
						"type": "string",
						"optional": true
					},
					"domain": {
						"type": "string",
						"optional": true
					},
					"expires": {
						"type": "string",
						"optional": true
					},
					"httpOnly": {
						"type": "boolean",
						"optional": true
					},
					"secure": {
						"type": "boolean",
						"optional": true
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		}

		var postDataType = {
			"postDataType": {
				"id": "postDataType",
				"description": "Posted data info.",
				"optional": true,
				"properties": {
					"mimeType": {
						"type": "string"
					},
					"text": {
						"type": "string",
						"optional": true
					},
					"params": {
						"type": "array",
						"optional": true,
						"properties": {
							"name": {
								"type": "string"
							},
							"value": {
								"type": "string",
								"optional": true
							},
							"fileName": {
								"type": "string",
								"optional": true
							},
							"contentType": {
								"type": "string",
								"optional": true
							},
							"comment": {
								"type": "string",
								"optional": true
							}
						}
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		};

		var contentType = {
			"contentType": {
				"id": "contentType",
				"description": "Response content",
				"properties": {
					"size": {
						"type": "integer"
					},
					"compression": {
						"type": "integer",
						"optional": true
					},
					"mimeType": {
						"type": "string"
					},
					"text": {
						"type": "string",
						"optional": true
					},
					"encoding": {
						"type": "string",
						"optional": true
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		};

		var cacheType = {
			"cacheType": {
				"id": "cacheType",
				"description": "Info about a response coming from the cache.",
				"properties": {
					"beforeRequest": {
						"$ref": "cacheEntryType"
					},
					"afterRequest": {
						"$ref": "cacheEntryType"
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		};

		var cacheEntryType = {
			"cacheEntryType": {
				"id": "cacheEntryType",
				"optional": true,
				"description": "Info about cache entry.",
				"properties": {
					"expires": {
						"type": "string",
						optional: "true"
					},
					"lastAccess": {
						"type": "string"
					},
					"eTag": {
						"type": "string"
					},
					"hitCount": {
						"type": "integer"
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		};

		var timingsType = {
			"timingsType": {
				"id": "timingsType",
				"description": "Info about request-response timing.",
				"properties": {
					"dns": {
						"type": "number",
						"optional": true,
						"min": -1
					},
					"connect": {
						"type": "number",
						"optional": true,
						"min": -1
					},
					"blocked": {
						"type": "number",
						"optional": true,
						"min": -1
					},
					"send": {
						"type": "number",
						"min": -1
					},
					"wait": {
						"type": "number",
						"min": -1
					},
					"receive": {
						"type": "number",
						"min": -1
					},
					"ssl": {
						"type": "number",
						"optional": true,
						"min": -1
					},
					"comment": {
						"type": "string",
						"optional": true
					}
				}
			}
		};

		// ************************************************************************************************
		// Helper schema object

		function Schema() {}
		Schema.prototype = {
			registerType: function() {
				var doIt = function(my, obj) {
					for (var name in obj) {
						if (obj.hasOwnProperty(name) && name != "prototype") {
							my[name] = obj[name];
						}
					}
				}
				var that = this;
				for (i = 0; i < arguments.length; i += 1) {
					doIt(that, arguments[i]);
				};
			}
		};

		// ************************************************************************************************
		// Registration

		// Register all defined types into the final schema object.
		var schema = new Schema();
		schema.registerType(
			logType,
			creatorType,
			browserType,
			pageType,
			pageTimingsType,
			entryType,
			requestType,
			recordType,
			responseType,
			postDataType,
			contentType,
			cacheType,
			cacheEntryType,
			timingsType
		);

		// ************************************************************************************************

		return schema;
	})();

	// ============================================================================================
	return ( resolveJson(HarSchema) ).logType;
};

HAR_Validator.prototype.validate = function(json_text){
	var HAR_data, logType, result;

	// ============================================================================================
	// preview/harModel.js -> parse()
	try {
		HAR_data	= JSON.parse(json_text);
	}
	catch(e){
		throw {
			errors: [{
				"message": "Failed to parse JSON",
				"property": "JSON evaluation"
			}]
		};
	}

	var get_logType	= function(use_cache){
		if (use_cache){
			logType	= {"id":"logType","description":"HTTP Archive structure.","type":"object","properties":{"log":{"type":"object","properties":{"version":{"type":"string"},"pages":{"type":"array","optional":true,"items":{"id":"pageType","description":"Exported web page","optional":true,"properties":{"startedDateTime":{"type":"string","format":"date-time","pattern":{}},"id":{"type":"string","unique":true},"title":{"type":"string"},"comment":{"type":"string","optional":true},"pageTimings":{"id":"pageTimingsType","description":"Timing info about page load","properties":{"onContentLoad":{"type":"number","optional":true,"min":-1},"onLoad":{"type":"number","optional":true,"min":-1},"comment":{"type":"string","optional":true}}}}}},"entries":{"type":"array","items":{"id":"entryType","description":"Request and Response related info","optional":true,"properties":{"pageref":{"type":"string","optional":true},"startedDateTime":{"type":"string","format":"date-time","pattern":{}},"time":{"type":"number","min":0},"serverIPAddress":{"type":"string","optional":true},"connection":{"type":"string","optional":true},"comment":{"type":"string","optional":true},"request":{"id":"requestType","description":"Monitored request","properties":{"method":{"type":"string"},"url":{"type":"string"},"httpVersion":{"type":"string"},"cookies":{"type":"array","items":{"$ref":"cookieType"}},"headers":{"type":"array","items":{"id":"recordType","description":"Helper name-value pair structure.","properties":{"name":{"type":"string"},"value":{"type":"string"},"comment":{"type":"string","optional":true}}}},"queryString":{"type":"array","items":{"id":"recordType","description":"Helper name-value pair structure.","properties":{"name":{"type":"string"},"value":{"type":"string"},"comment":{"type":"string","optional":true}}}},"headersSize":{"type":"integer"},"bodySize":{"type":"integer"},"comment":{"type":"string","optional":true},"postData":{"id":"postDataType","description":"Posted data info.","optional":true,"properties":{"mimeType":{"type":"string"},"text":{"type":"string","optional":true},"params":{"type":"array","optional":true,"properties":{"name":{"type":"string"},"value":{"type":"string","optional":true},"fileName":{"type":"string","optional":true},"contentType":{"type":"string","optional":true},"comment":{"type":"string","optional":true}}},"comment":{"type":"string","optional":true}}}}},"response":{"id":"responseType","description":"Monitored Response.","properties":{"status":{"type":"integer"},"statusText":{"type":"string"},"httpVersion":{"type":"string"},"cookies":{"type":"array","items":{"$ref":"cookieType"}},"headers":{"type":"array","items":{"id":"recordType","description":"Helper name-value pair structure.","properties":{"name":{"type":"string"},"value":{"type":"string"},"comment":{"type":"string","optional":true}}}},"redirectURL":{"type":"string"},"headersSize":{"type":"integer"},"bodySize":{"type":"integer"},"comment":{"type":"string","optional":true},"content":{"id":"contentType","description":"Response content","properties":{"size":{"type":"integer"},"compression":{"type":"integer","optional":true},"mimeType":{"type":"string"},"text":{"type":"string","optional":true},"encoding":{"type":"string","optional":true},"comment":{"type":"string","optional":true}}}}},"cache":{"id":"cacheType","description":"Info about a response coming from the cache.","properties":{"comment":{"type":"string","optional":true},"beforeRequest":{"id":"cacheEntryType","optional":true,"description":"Info about cache entry.","properties":{"expires":{"type":"string","optional":"true"},"lastAccess":{"type":"string"},"eTag":{"type":"string"},"hitCount":{"type":"integer"},"comment":{"type":"string","optional":true}}},"afterRequest":{"id":"cacheEntryType","optional":true,"description":"Info about cache entry.","properties":{"expires":{"type":"string","optional":"true"},"lastAccess":{"type":"string"},"eTag":{"type":"string"},"hitCount":{"type":"integer"},"comment":{"type":"string","optional":true}}}}},"timings":{"id":"timingsType","description":"Info about request-response timing.","properties":{"dns":{"type":"number","optional":true,"min":-1},"connect":{"type":"number","optional":true,"min":-1},"blocked":{"type":"number","optional":true,"min":-1},"send":{"type":"number","min":-1},"wait":{"type":"number","min":-1},"receive":{"type":"number","min":-1},"ssl":{"type":"number","optional":true,"min":-1},"comment":{"type":"string","optional":true}}}}}},"comment":{"type":"string","optional":true},"creator":{"id":"creatorType","description":"Name and version info of the log creator app.","type":"object","properties":{"name":{"type":"string"},"version":{"type":"string"},"comment":{"type":"string","optional":true}}},"browser":{"id":"browserType","description":"Name and version info of used browser.","type":"object","optional":true,"properties":{"name":{"type":"string"},"version":{"type":"string"},"comment":{"type":"string","optional":true}}}}}}};

			// one additional step:
			// the data contains 2 RegExp values that cannot serialize to JSON. need to restore them.
			var dateTimePattern = /^(\d{4})(-)?(\d\d)(-)?(\d\d)(T)?(\d\d)(:)?(\d\d)(:)?(\d\d)(\.\d+)?(Z|([+-])(\d\d)(:)?(\d\d))/;
			logType.properties.log.properties.pages.items.properties.startedDateTime.pattern   = dateTimePattern;
			logType.properties.log.properties.entries.items.properties.startedDateTime.pattern = dateTimePattern;
		}
		else {
			logType		= this.resolve_HAR_Schema_logType();
		}
	};

	// ============================================================================================
	// preview/jsonSchema.js
	var validate_JSONSchema = function(instance, schema, _changing) {
		var errors = [];

		// validate a value against a property definition
		var checkProp = function(value, schema, path, i) {
			var l;
			path += path ? typeof i == 'number' ? '[' + i + ']' : typeof i == 'undefined' ? '' : '.' + i : i;

			function addError(message) {
				errors.push({
					property: path,
					message: message
				});
			}

			if ((typeof schema != 'object' || schema instanceof Array) && (path || typeof schema != 'function')) {
				if (typeof schema == 'function') {
					if (!(value instanceof schema)) {
						addError("is not an instance of the class/constructor " + schema.name);
					}
				} else if (schema) {
					addError("Invalid schema/property definition " + schema);
				}
				return null;
			}
			if (_changing && schema.readonly) {
				addError("is a readonly field, it can not be changed");
			}
			if (schema['extends']) { // if it extends another schema, it must pass that schema as well
				checkProp(value, schema['extends'], path, i);
			}
			// validate a value against a type definition
			function checkType(type, value) {
				if (type) {
					if (typeof type == 'string' && type != 'any' &&
						(type == 'null' ? value !== null : typeof value != type) &&
						!(value instanceof Array && type == 'array') &&
						!(type == 'integer' && value % 1 === 0)) {
						return [{
							property: path,
							message: (typeof value) + " value found, but a " + type + " is required"
						}];
					}
					if (type instanceof Array) {
						var unionErrors = [];
						for (var j = 0; j < type.length; j++) { // a union type 
							if (!(unionErrors = checkType(type[j], value)).length) {
								break;
							}
						}
						if (unionErrors.length) {
							return unionErrors;
						}
					} else if (typeof type == 'object') {
						var priorErrors = errors;
						errors = [];
						checkProp(value, type, path);
						var theseErrors = errors;
						errors = priorErrors;
						return theseErrors;
					}
				}
				return [];
			}
			if (value === undefined) {
				if (!schema.optional) {
					addError("is missing and it is not optional");
				}
			} else {
				errors = errors.concat(checkType(schema.type, value));
				if (schema.disallow && !checkType(schema.disallow, value).length) {
					addError(" disallowed value was matched");
				}
				if (value !== null) {
					if (value instanceof Array) {
						if (schema.items) {
							if (schema.items instanceof Array) {
								for (i = 0, l = value.length; i < l; i++) {
									errors.concat(checkProp(value[i], schema.items[i], path, i));
								}
							} else {
								for (i = 0, l = value.length; i < l; i++) {
									errors.concat(checkProp(value[i], schema.items, path, i));
								}
							}
						}
						if (schema.minItems && value.length < schema.minItems) {
							addError("There must be a minimum of " + schema.minItems + " in the array");
						}
						if (schema.maxItems && value.length > schema.maxItems) {
							addError("There must be a maximum of " + schema.maxItems + " in the array");
						}
					} else if (schema.properties) {
						errors.concat(checkObj(value, schema.properties, path, schema.additionalProperties));
					}
					if (schema.pattern && typeof value == 'string' && !value.match(schema.pattern)) {
						addError("does not match the regex pattern " + schema.pattern.toSource());
					}
					if (schema.maxLength && typeof value == 'string' && value.length > schema.maxLength) {
						addError("may only be " + schema.maxLength + " characters long");
					}
					if (schema.minLength && typeof value == 'string' && value.length < schema.minLength) {
						addError("must be at least " + schema.minLength + " characters long");
					}
					if (typeof schema.minimum !== undefined && typeof value == typeof schema.minimum &&
						schema.minimum > value) {
						addError("must have a minimum value of " + schema.minimum);
					}
					if (typeof schema.maximum !== undefined && typeof value == typeof schema.maximum &&
						schema.maximum < value) {
						addError("must have a maximum value of " + schema.maximum);
					}
					if (schema['enum']) {
						var enumer = schema['enum'];
						l = enumer.length;
						var found;
						for (var j = 0; j < l; j++) {
							if (enumer[j] === value) {
								found = 1;
								break;
							}
						}
						if (!found) {
							addError("does not have a value in the enumeration " + enumer.join(", "));
						}
					}
					if (typeof schema.maxDecimal == 'number' &&
						(value.toString().match(new RegExp("\\.[0-9]{" + (schema.maxDecimal + 1) + ",}")))) {
						addError("may only have " + schema.maxDecimal + " digits of decimal places");
					}
				}
			}
			return null;
		};

		// validate an object against a schema
		var checkObj = function(instance, objTypeDef, path, additionalProp) {

			if (typeof objTypeDef == 'object') {
				if (typeof instance != 'object' || instance instanceof Array) {
					errors.push({
						property: path,
						message: "an object is required"
					});
				}

				for (var i in objTypeDef) {
					if (objTypeDef.hasOwnProperty(i) && !(i.charAt(0) == '_' && i.charAt(1) == '_')) {
						var value = instance[i];
						var propDef = objTypeDef[i];
						checkProp(value, propDef, path, i);
					}
				}
			}
			for (i in instance) {
				if (instance.hasOwnProperty(i) && !(i.charAt(0) == '_' && i.charAt(1) == '_') && objTypeDef && !objTypeDef[i] && additionalProp === false) {
					errors.push({
						property: path,
						message: (typeof value) + "The property " + i +
							" is not defined in the schema and the schema does not allow additional properties"
					});
				}
				var requires = objTypeDef && objTypeDef[i] && objTypeDef[i].requires;
				if (requires && !(requires in instance)) {
					errors.push({
						property: path,
						message: "the presence of the property " + i + " requires that " + requires + " also be present"
					});
				}
				value = instance[i];
				if (objTypeDef && typeof objTypeDef == 'object' && !(i in objTypeDef)) {
					checkProp(value, additionalProp, path, i);
				}
				if (!_changing && value && value.$schema) {
					errors = errors.concat(checkProp(value, value.$schema, path, i));
				}
			}
			return errors;
		};

		if (schema) {
			checkProp(instance, schema, '', _changing || '');
		}
		if (!_changing && instance && instance.$schema) {
			checkProp(instance, instance.$schema, '', '');
		}
		return {
			valid: !errors.length,
			errors: errors
		};
	};

	// ============================================================================================
	// core/lib.js
	var cloneArray = function(array, fn) {
		var newArray = [];

		if (fn)
			for (var i = 0; i < array.length; ++i)
				newArray.push(fn(array[i]));
		else
			for (var i = 0; i < array.length; ++i)
				newArray.push(array[i]);

		return newArray;
	};

	var formatString = function(string) {
		var args = cloneArray(arguments),
			string = args.shift();
		for (var i = 0; i < args.length; i++) {
			var value = args[i].toString();
			string = string.replace("%S", value);
		}
		return string;
	};

	// ============================================================================================
	// preview/harModel.js
	var validate_RequestTimings = function(input) {
		var errors = [];

		// Iterate all request timings and check the total time.
		var entries = input.log.entries;
		for (var i = 0; i < entries.length; i++) {
			var entry = entries[i];
			var timings = entry.timings;

			if (timings.blocked < -1 ||
				timings.connect < -1 ||
				timings.dns < -1 ||
				timings.receive < -1 ||
				timings.send < -1 ||
				timings.wait < -1) {
				var message = formatString(
					"Negative time is not allowed: %S, request#: %S, parent page: %S",
					entry.request.url, i, entry.pageref
				);

				errors.push({
					input: input,
					file: entry,
					"message": message,
					"property": "HAR Validation"
				});
			}
		}

		if (errors.length)
			throw {
				errors: errors,
				input: input
			};
	};

	// ============================================================================================
	result			= validate_JSONSchema(HAR_data, logType, false);

	if (! result.valid){
		throw result;
	}

	validate_RequestTimings(HAR_data);

	return true;
};