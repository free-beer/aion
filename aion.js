/**
 * Aion 2.0.0
 * Copyright (c) 2013, Peter Wood.
 */

var Aion = {
   /**
    * This function converts a passed in time span to an equivalent number of
    * milliseconds. The function expects at least one parameter but will accept
    * up to two in total. The first parameter should be a numeric value, either
    * an integer or float. If this is the only parameter passed in it will be
    * assumed to be in seconds. The second parameter must be the unit associated
    * with the time span and must be a string. Recognised values for this
    * parameter include "millisecond", "milliseconds", "second", "seconds", "minute", "mintues",
    * "hour", "hours", "day", "days", "week" and "weeks" (case is ignored for
    * this value).
    */
   toMilliseconds: function() {
      var total = 0;

      if(arguments.length === 0) {
         throw("No time span specified for call to Aion.toMilliseconds() function.");
      }

      if(typeof arguments[0] !== 'number') {
         throw("Non-numeric time span value specified in call to Aion.toMilliseconds() function.");
      }

      total = arguments[0];
      unit  = (arguments.length > 1 ? ("" + arguments[1]).toLowerCase() : "seconds");
      switch(unit) {
         case "day":
         case "days":
            total = Math.round(total * 86400000);
            break;

         case "hour":
         case "hours":
            total = Math.round(total * 3600000);
            break;

         case "millisecond":
         case "milliseconds":
            total = Math.round(total * 1);
            break;

         case "minute":
         case "minutes":
            total = Math.round(total * 60000);
            break;

         case "second":
         case "seconds":
            total = Math.round(total * 1000);
            break;

         case "week":
         case "weeks":
            total = Math.round(total * 604800000);
            break;

         default:
            throw("Unrecognised time unit '" + unit + "' encountered.");
      }

      return(total);
   },

   /**
    * A collection of generic elements that get folded into to both durations
    * and intervals.
    */
   generic: {
      action: null,
      afterCancel: null,
      afterComplete: null,
      before: function(onStart) {
         this.beforeStart = onStart;
         return(this);
      },
      beforeStart: null,
      go: function() {
         return(this.start());
      },
      isActive: function() {
         return(this.status == "active");
      },
      finished: null,
      started: null,
      status: "pending"
   },

   /**
    * A collection of duration specific elements that get folded into every
    * duration created.
    */
   duration: {
      cancel: function() {
         if(this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
            this.started = null;
            this.status  = "cancelled";

            if(this.afterCancel) {
               this.afterCancel(this);
            }
         }
         return(this);
      },
      do: function(onComplete) {
         this.action = onComplete;
         return(this);
      },
      expended: function() {
         return(this.timeout ? ((new Date()).getTime() - this.started.getTime()) : 0);
      },
      isFinished: function() {
         return(this.status === "complete");
      },
      onComplete: function() {
         if(this.action) {
            this.action(this);
            this.timeout  = null;
            this.status   = "complete";
            this.finished = new Date();
            if(this.afterComplete) {
               this.afterComplete(this);
            }
         }
      },
      remaining: function() {
         return(this.timeout ? (this.total - this.expended()) : this.duration);
      },
      start: function() {
         if(!this.timeout) {
            var duration = this,
                stop     = false;

            if(this.beforeStart) {
               stop = !this.beforeStart();
            }

            if(!stop) {
               this.started = new Date();
               this.status  = "active";
               this.timeout = setTimeout(function() {duration.onComplete.call(duration);}, this.total);
            }
         } else {
            throw("Start called on already active duration object.");
         }
         return(this);
      },
      timeout: null
   },

   interval: {
      for: function() {
         var unit = (arguments.length > 1 ? arguments[1] : "seconds");

         if(arguments.length == 0) {
            throw("No time span specified in call to interval after() function.");
         }
         this.maximum = Aion.toMilliseconds(arguments[0], unit);
         return(this);
      },
      cancel: function() {
         if(this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            this.started  = null;
            this.status   = "cancelled";

            if(this.afterCancel) {
               this.afterCancel(this);
            }
         }
      },
      do: function(onComplete) {
         this.action = onComplete;
         return(this);
      },
      expended: function() {
         return(this.interval ? ((new Date()).getTime() - this.started.getTime()) : 0);
      },
      maximum: null,
      onComplete: function() {
         if(this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            this.status   = "complete";
            this.finished = new Date();
            if(this.afterComplete) {
               this.afterComplete(this);
            }
         }
      },
      onInterval: function() {
         if(this.action) {
            this.action(this);
            if(this.maximum && this.expended() >= this.maximum) {
               this.onComplete();
            }
         }
      },
      start: function() {
         if(!this.interval) {
            var interval = this;

            if(this.beforeStart) {
               stop = !this.beforeStart();
            }

            this.started = new Date();
            this.status  = "active";
            this.interval = setInterval(function() {interval.onInterval.call(interval)}, this.period);
         } else {
            throw("Start called on an already active interval object.");
         }
      },
      then: function(onComplete) {
         this.afterComplete = onComplete;
         return(this);
      }
   },

   /**
    * This function creates a new duration entity that will run for a specified
    * period of time then execute a piece of functionality. The function expects
    * at least one parameter but accepts up to two. The parameters to the
    * function are a time span so the first value should be a numeric and the
    * optional second value should be a time unit (see the comments for the
    * toMilliseconds() function for details of acceptable units). Note that you
    * will have to set a function that gets called on completion of the duration
    * by calling the do() function of the object returned. The duration also
    * needs to be explicitly kicked off with a call to start().
    *
    * @returns  A 'duration' object. This object will be a collection of data
    *           and functionality that can be used to interact with the duration
    *           to set details, start the duration running and cancel it if
    *           needed.
    */
   in: function() {
      var item = {type: "duration"},
          unit = (arguments.length > 1 ? arguments[1] : "seconds");

      if(arguments.length == 0) {
         throw("No time span specified for call to Aion.in() function.");
      }

      item.total = this.toMilliseconds(arguments[0], unit);
      for(var name in this.generic) {
         item[name] = this.generic[name];
      }
      for(var name in this.duration) {
         item[name] = this.duration[name];
      }

      return(item);
   },

   /**
    * This function creates a new interval that will run indefinitely. The
    * function expects at least one parameter but accepts up to two. The
    * parameters to the function are a time span so the first value should be a
    * numeric and the optional second value should be a time unit (see the
    * comments for the toMilliseconds() function for details of acceptable
    * units). Note that you will have to set a function that gets called by
    * the interval by calling the do() function of the object returned. The
    * interval also needs to be explicitly kicked off with a call to the start()
    * function.
    *
    * @returns  An 'interval' object. This object will be a collection of data
    *           and functionality that can be used to interact with the interval
    *           to set details, start the interval running and cancel it if
    *           needed.
    */
   every: function() {
      var item = {type: "interval"},
          unit = (arguments.length > 1 ? arguments[1] : "seconds");

      if(arguments.length == 0) {
         throw("No time span specified for call to Aion.every() function.");
      }

      item.period = Aion.toMilliseconds(arguments[0], unit);
      for(var name in this.generic) {
         item[name] = this.generic[name];
      }
      for(var name in this.interval) {
         item[name] = this.interval[name];
      }

      return(item);
   }
};