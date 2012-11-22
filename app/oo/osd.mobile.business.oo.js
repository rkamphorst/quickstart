/*
* Ordina, OSD Mobile
*
* Copyright (c) 2012 - Ordina N.V.
*
*/

/* Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * 
 * MIT Licensed.
 * 
 * Reinder Kamphorst added:
 * - Class.decorate
 * - Class.ns
 */
// Inspired by base2 and Prototype
(function(){
  var initializing = false;
  var fnSuperTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;
  var fnDecoreeTest = /xyz/.test(function(){xyz;}) ? /\b_decoree\b/ : /.*/;

  // The base Class implementation (does nothing)
  this.Class = function(){};
  
  // Create a new Class that inherits from this class
  Class.extend = function(prop) {
    var _super = this.prototype;
   
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;
   
    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnSuperTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._super;
           
            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];
           
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);       
            this._super = tmp;
           
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
   
    // The dummy class constructor
    function SubClass() {
      // All construction is actually done in the init method
      if ( !initializing && this.init )
        this.init.apply(this, arguments);
    }
   
    // Populate our constructed prototype object
    SubClass.prototype = prototype;
   
    // Enforce the constructor to be what we expect
    SubClass.prototype.constructor = SubClass;

    // And make this class extendable
    SubClass.extend = Class.extend;
    SubClass.decorate = Class.decorate;
   
    return SubClass;
  };
  
  // Create a new Class that inherits from this class *and* decorates an instance
  Class.decorate = function(prop) {
    var _super = this.prototype;
   
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;
   
    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnDecoreeTest.test(prop[name]) ?
        (function(name, fn){
          return function() {
            var tmp = this._decoree;
            
            // Add a new ._decoree() method that is the same method
            // but on the decorated class.
			// The complicated code is to make sure a decorated class
			// can in turn be decorated by chaining _decoratedInstance
			// properties.
			
			var decoree = this._decoratedInstance[name];
			var decoratedInstance = this._decoratedInstance;
			
			// go down the chain of _decoratedInstance properties until
			// we find an actual function
			while (typeof decoree == "object") {
				decoratedInstance = decoree;
				decoree = decoratedInstance[name];
			}
			decoratedInstance[name] = decoratedInstance._decoratedInstance;
			
			this._decoree = decoree;
			
            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);
			
			if (decoratedInstance != null) {
				decoratedInstance[name] = decoree;
			}
            this._decoree = tmp;
           
            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }
    
   	var superconstructor = this;
   	
    // The dummy class constructor
    function DecoratorClass() {
      if (arguments.length < 0 || !(arguments[0] instanceof superconstructor)) {
      	throw new Error("First argument must be object to decorate");
      }

      for (var name in arguments[0]) {
	     if (!(prototype.hasOwnProperty(name))) {
	     	this[name] = arguments[0][name];
	     }
	  }
	  this._decoratedInstance = arguments[0];
	  
	  var args = [];
	  for (var i = 1; i < arguments.length; i++) {
		args.push(arguments[i]);
	  }
      
      // All construction is actually done in the init method
      if ( !initializing && this.init )
        this.init.apply(this, args);
    }
   
    // Populate our constructed prototype object
    DecoratorClass.prototype = prototype;
   
    // Enforce the constructor to be what we expect
    DecoratorClass.prototype.constructor = DecoratorClass;

    // And make this class extendable
    DecoratorClass.extend = Class.extend;
    DecoratorClass.decorate = Class.decorate;
   
    return DecoratorClass;
  };
  
  var glob = this;
  
  /**
   * ns: get a namespace object
   */
  Class.ns = function() {
  	var curNs = glob;
  	var len = arguments.length;
  	var i = 0;
  	if (len > 0 && typeof arguments[i] == "object") {
  		curNs = arguments[i];
  		i = 1;
  	}
  	for (i = i; i < len; i++) {
  		var parts = arguments[i].split(".");
  		for (var j = 0; j < parts.length; j++) {
  			if (!(parts[j] in curNs)) {
  				curNs[parts[j]] = {};
  			}
  			curNs = curNs[parts[j]];
  		}
  	}
  	return curNs;
  };
  
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
