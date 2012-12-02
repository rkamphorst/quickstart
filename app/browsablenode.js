/*
* Ordina, OSD Mobile
*
* Copyright (c) 2012 - Ordina N.V.
*
*/

(function(define) {
	
	var bus_ns = Class.ns("osd.mobile.business");
	var ns = Class.ns(bus_ns, "model");
			
	ns.BrowsableFeed = bus_ns.FeedItem.decorate({
		init: function(viewKey) {
			if (viewKey) {
				this._viewKey = viewKey;
			}
		},
		getViewKey: function() {
			if (this._viewKey) {
				if (typeof this._viewKey == "string") {
					return this._viewKey;
				} else if (typeof this._viewKey == "object" && this._viewKey.length) {
					return this._viewKey[0];
				} else {
					return null;
				}
			} else if (this._parent && typeof this._parent.getViewKey == "function") {
				return this._parent.getViewKey();
			} else {
				return null;
			}
		},
		setViewKey: function(viewKey) {
			this._viewKey = viewKey;
		},
		getViewParams: function() {
			var info = this.getInfo();
			if (info.link) return { link: info.link };
			if (info.id) return { id: info.id};
			if (info.title) return { title: info.title };
		},
		findForViewParams: function(params, deepest) {
			var result = null;
			var info = this.getInfo();
			var children = this.getChildren();
			
			if (children && deepest && result === null) {
				for (var i = 0; i < children.length; i++) {
					result = children[i].findForViewParams(params, deepest);
					if (result !== null) break;
				}
			}
			
			if (result === null) {
				var isMatch = true;
				if (params) {
					for (var prop in params) {
						isMatch = info && prop in info && params[prop] == info[prop];
						if (!isMatch) break;
					}
				}
				if (isMatch) result = this;
			}
			
			if (children && !deepest && result === null) {
				for (var i = 0; i < children.length; i++) {
					var child = children[i];
					result = child.findForViewParams(params, deepest);
					if (result !== null) break;
				}
			}
			return result;
		},
	});
		
})(typeof define == 'function'
        // AMD
        ? define
        // CommonJS
        : function(deps, factory) {
                module.exports = factory.apply(this, [require].concat(deps.slice(1).map(function(x) {
                        return require(x);
                })));
        }
);
