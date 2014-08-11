/*
 * --------------------------------------------------------
 * original script
 *     name:    CreateDOM - $C()
 *     summary: Create DOM Stuctures Easily
 *     url:     http://www.openjs.com/scripts/createdom/
 * author
 *     name:    Binny V Abraham
 *     email:   binnyva@gmail.com
 *     url:     http://binnyva.com/me/
 * license
 *     name:    BSD License
 *     url:     http://www.openjs.com/license.php
 * --------------------------------------------------------
 * modified script
 *     name:    CreateDOM - $C()
 *     summary: Create DOM Stuctures Easily
 *     url:     https://github.com/warren-bank/CreateDOM
 *     notes:   forked from original script on 07/16/2014
 * author
 *     name:    Warren R Bank
 *     email:   warren.r.bank@gmail.com
 *     url:     https://github.com/warren-bank
 * license
 *     name:    GPLv2
 *     url:     http://www.gnu.org/licenses/gpl-2.0.txt
 *     notes:   applies to diff between modified script and original.
 *              This is more restrictive than BSD, and requires that
 *              any and all derivative works also maintain a GPL (copy-left) license.
 * --------------------------------------------------------
 */

var $C = function(dom,id,doc) {
	if(!doc) var doc = document;
	//Most *necessary* HTML tags - make sure not to include any tags that is also a valid attribute name - eg 'cite'
	//Begining and ending commas are intentional - don't remove them
	var valid_tags = ",iframe,b,p,div,span,strong,em,u,img,pre,code,br,hr,a,script,link,table,tr,td,h1,h2,h3,h4,h5,h6,sup,sub,ul,ol,li,dd,dl,dt,form,input,textarea,legend,label,fieldset,select,option,blockquote,";
	var html = new Array();
	var non_alapha = new RegExp(/_\d*$/);
	var get_textnode = function(value){
		var ele;

		if (
				(typeof value === "object")
			&&	(value !== null)
			&&	(typeof value.condition !== "undefined")
		){
			// process: {"condition":bool,"text":string}
			if (
					(value.condition)
				&&	(typeof value.text !== "undefined")
			){
				ele = get_textnode(value.text);
			}
		}
		else {
			// process text value. correct some common mistakes by casting non-string to string.
			switch (typeof value){
				case 'number':
				case 'boolean':
				case 'function':
					value = (value).toString();
				case 'string':
					ele = doc.createTextNode(value);
					break;
			}
		}
		return ele;
	};
	for(var tag in dom) {
		var child = false;
		if(isNaN(tag)) { //Associative array
			var attributes = dom[tag];
		} else { //It's a list
			var tagname = "";
			var attributes = "";
			for(var tagname in dom[tag]) {
				attributes = dom[tag][tagname];
			}
			tag = tagname;
		}
		tag = tag.replace(non_alapha,"");//Remove the numbers at the end

		var ele;
		if (tag == "text"){
			ele = get_textnode(attributes);
			attributes = false;
		}
		else {
			ele = doc.createElement(tag);
		}

		//If the given attribute is a string, it is a text node
		if(typeof(attributes) == "string") child = doc.createTextNode(attributes);
		else if(attributes) {//If it an array...
			for(var att in attributes) {
				var value = "";
				if(isNaN(att)) { //Associative array
					value = attributes[att];
				} else { //It's a list
					for(var index in attributes[att]) {
						value = attributes[att][index];
					}
 					att = index;
				}

				att = att.replace(non_alapha,"");//Remove the numbers at the end - to solve the problem of non unique indexes
				if(att == "condition"){if (! value) {ele = undefined; break;}}
				else if(valid_tags.indexOf(","+att+",") != -1) { //If the attribute is a valid tag,
					//Find the dom sturcture of that tag.
					var node = new Object;
					node[att] = value;
					ele.appendChild($C(node,"",doc));// :RECURSION:
				}
				else if(att == "text") {
					child = get_textnode(value);
				}
				else ele.setAttribute(att,value);
			}
		}

		if(ele){
			if(child && attributes) ele.appendChild(child);//Append the child if it exists
			html.push(ele);
		}
	}

	//If a node/id was given, append the created elements to that element.
	if (id){
		var node = id;
		if(typeof id == "string") node = doc.getElementById(id);//If the given argument is an id.
		for(var i=0;el=html[i],i<html.length;i++) node.appendChild(el);
	}

	if(html.length == 1) return html[0];
	return html;
};