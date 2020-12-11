/*
 * Author: Dave F. Kleinschmidt
 *
 *    Copyright 2012 Dave Kleinschmidt and
 *        the University of Rochester BCS Department
 *
 *    This program is free software: you can redistribute it and/or modify
 *    it under the terms of the GNU Lesser General Public License version 2.1 as
 *    published by the Free Software Foundation.
 *
 *    This program is distributed in the hope that it will be useful,
 *    but WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU Lesser General Public License for more details.
 *
 *    You should have received a copy of the GNU Lesser General Public License
 *    along with this program.
 *    If not, see <http://www.gnu.org/licenses/old-licenses/lgpl-2.1.html>.
 *
 */
var keyCapture = false;
function ClarkeGarrettBlock(params) {
    // process parameters
    var stimuliObj, instructions, namespace, css_stim_class;
    for (p in params) {
        switch(p) {
        case 'stimuli':
            stimuliObj = params[p];
            break;
        case 'instructions_trial':
            instructions_trial = params[p];
            break;
        case 'mediaType':
            this.mediaType= params[p];
            break;
        case 'namespace':
            namespace = params[p];
            break;
        case 'reps':
            this.reps = params[p];
            break;
        case 'blockReps':
            this.blockReps = params[p];
            break;
        case 'blockRandomizationMethod':
            this.blockRandomizationMethod = params[p];
            break;
        case 'ITI':
            this.ITI = params[p];
            break;
        case 'respKeys':
            this.respKeys = params[p];
            break;
        //case 'sentences':
           // this.sentences = params[p];
           // break;
        case 'categories':
            this.categories = params[p];
            break;
        default:
            break;
        }
    }

    // set namespace for this block (prefix for events/form fields/etc.) and
    // the class that the stimuli are assigned
    if (typeof(namespace) === 'undefined') {
        var namespace = '';
        var css_stim_class = 'stim';
    } else {
        var css_stim_class = namespace + 'stim';
        this.namespace = namespace;
    }
    // install stimuli
    if (isArray(stimuliObj)) {
        // concatenate into one mega-object, and set for this block
        // NOTE / TODO: I'm uncertain if this part of the loop works... when would you need it?
        this.stimuliObj = concatenate_stimuli_and_install(stimuliObj, css_stim_class);
        this.auds = this.stimuliObj.installed;
    } else {
        // set stimuli object for this block
        this.stimuliObj = stimuliObj;
        $('#continue').show();
    }
    
    // create responses form element and append to form
    this.respField = $('<textArea id="' + namespace + 'Resp" ' +
                       'name="' + namespace + 'Resp" ></textArea>').appendTo('#mturk_form');
    $('#mturk_form').append('<br />');
    
}


ClarkeGarrettBlock.prototype = {
    reps: undefined,
    blockReps: 1,
    stims: [],
    n: 0,
    respKeys: undefined, //{71: 'B', 72: 'D'},
    categories: undefined, // ['B', 'D']
    ncorrect: 0,
    keyCapture: false,
    tResp: -1,
    tStart: -1,
    ITI: 1000,
    auds: [],
    practiceMode: false,
    namespace: '',
    respField: undefined,
    onEndedBlock: undefined,
    pbIncrement: undefined,
    blockRandomizationMethod: undefined,
    totalUniqueTrials: undefined, 
    //instructions: undefined,
    //isPractice: false,
    //mediaType: "audio",

    run: function() {
        var _self = this;
        _self.init();
       _self.next();
    },
    
    init: function(opts) {
        var _self = this;
        
        // initialize trial counter
        this.n = 0;
        _self.totalUniqueTrials = _self.stimuliObj.filenames.length;

        ////////////////////////////////////////////////////////////////////////////////
        // initialize response keys and response labels:
        // response keys can be provided to constructor, or default to global var respKeyMap
        if (typeof this.respKeys === 'undefined') {
            this.respKeys = respKeyMap;
        }

        // likewise response labels ('categories') can be provided to the constructor or
        // set from the global (if it exists), or default to being extracted from the values
        // of the response key mapping.
        if (typeof this.categories === 'undefined') {
            // populate the category names from the global vector if it exists, or extract from the resp keys
            if (typeof categories === 'undefined') {
                this.categories = [];
                for (k in this.respKeys) {
                    this.categories.push(this.respKeys[k]);
                }
            } else {
                this.categories = categories;
            }
            console.log(this.keyCapture);
//            console.log(this.respKeys[String.fromCharCode(e.which)]);
        }

        if (!validateRespKeys(this.respKeys, this.categories)) {
            return false;
        }
        

        ////////////////////////////////////////////////////////////////////////////////
        // Randomize stimuli order.
        // default to "calibReps" reps property of this.stimuliObj for reps of each
        // stimulus.
        this.stims = [];
        for (var br = 0; br < this.blockReps; br++) {
            this.stims = this.stims.concat(pseudoRandomOrder(this.reps, this.totalUniqueTrials, this.blockRandomizationMethod));
        }
        console.log(this.stims);
        
        this.pbIncrement = 1.0 / this.stims.length;
                
        ////////////////////////////////////////////////////////////////////////////////
        // Bind handlers for this block:
        // create handler to capture and process keyboard input, and bind to document
        $(document).on('keyup.' + this.namespace, function(e) {_self.handleResp(e);});

        // create handler to turn on keyboard capture when stims end, and bind to stims
//        $(this.auds).bind('ended.' + this.namespace, function() {_self.waitForResp();});

        ////////////////////////////////////////////////////////////////////////////////
        // Initialize UI elements
        // set task instructions and response cues

        $("#testInstructions").html('Is it a real word?'+'<br />'+'Press <span id="bKey" class="respKey">' + 
                                    valToKey(this.respKeys, this.categories[0]) + 
                                    '</span> for "' + this.categories[0] + '"<br />' + 
                                    'Press <span id="dKey" class="respKey">' + 
                                    valToKey(this.respKeys, this.categories[1]) + '</span> for "' + this.categories[1] + '"');

        installPB("progressBar");
        resetPB("progressBar");
        $("#progressBar").show();
        // DEBUGGING: add button to force start of calibration block (skip preview)
        $('#buttons').append('<input type="button" onclick="calibrationBlock.next()" value="start calibration"></input>');
    },

    waitForResp: function() {
        this.keyCapture=true;
        $("#fixation").hide();
        $("#testInstructions").removeClass("dimmed");
        $('#testStatus').html('Stim ended');
        console.log('waiting for resp');
    },

    handleResp: function(e) {
        $('#testStatus').html('keyup() detected: keycode = ' + e.which + ' (' +
                              String.fromCharCode(e.which) + ')'); // this line changes js keycode of pressed keys into strings (e.g, 65 --> A)
        console.log(this.respKeys[String.fromCharCode(e.which)]);
        console.log(this.keyCapture);
        console.log(this.respKeys);
        console.log(String.fromCharCode(e.which));
        
        if (this.keyCapture && this.respKeys[String.fromCharCode(e.which)]) {
            console.log('if statement');
            this.tResp = Date.now();
            this.keyCapture=false;
            this.end(e);
        }
    },

    // start next trial
    next: function() {
        var _self = this;
        // some status information (hidden by default)
        $('#testStatus').append('<br />stims: ' + this.stims + ', n: ' + this.n);
        $('#testStatus').html('...wait');

        $("#testInstructions").show().addClass("dimmed");
        // pause before next fixation cross appears 
        console.log(_self.stims);
        
        var extension = "";
        if (_self.mediaType === "audio") {
            extension = ".wav";
        }
        if (_self.mediaType === "video") {
            extension = ".webm";
        }
        
        var current = _self.stimuliObj.prefix + _self.stimuliObj.filenames[_self.stims[_self.n]] + extension;
        // play next stimuli after ITI has elapsed (asynchronously with fixation display)
        setTimeout(function() {
                     // NOTE: can't use 'this' here, since function is being evaluate outside of method context
                     if (_self.mediaType == 'audio') {
                         $("#fixation").show();
                         $("#subtitle").show();
                         $originalAudio = $('<audio>')
                         $originalAudio.attr("src", current);
                         keyPress = true;
                         $originalAudio[0].play();
                         //Show sentence at the same time as when the audio begins to play
                         //$originalAudio.on('play', function() {
                         //});
                         //Show sentence at the same time as when the audio ends
                         $originalAudio.on('ended', function() {
                            $("#instructions_trial").show();
                            $("#subtitle").text(_self.stimuliObj.sentences[_self.stims[_self.n]]);
                            _self.tStart = Date.now();
                            _self.waitForResp();
                         });
                     }
                 }, _self.ITI);
    },

    // handle end of trial (called by key press handler)
    end: function(e) {
        $("#subtitle").empty();
        $("#subtitle").hide();
        // update progress bar
        plusPB("progressBar", this.pbIncrement);
        // record response
        this.recordResp(e);
        // if more trials remain, trigger next trial
        if (++this.n < this.stims.length) {
            this.next();
        } else {
            this.endBlock();
        }
    },

    endBlock: function() {
        // trigger endCalibrationBlock event
        $('#fixation').hide();
        $("#testInstructions").hide();
        $("#progressBar").hide();
        $("#instructionsLower").hide();
        $("#subtitle").hide();
       // $(this.auds).unbind('.' + this.namespace).height(0);
       // $(document).unbind('.' + this.namespace);
        $(document).off();
        if (typeof(this.onEndedBlock) === 'function') {
            this.onEndedBlock();
        } else {
            if (console) console.log('WARNING: End of block reached but no callback found');
        }
    },

    // return info on current state in string form
    info: function() {
        // alert('stims: ' + this.stims + ', n: ' + this.n);
        var _self = this;
        return [this.namespace, this.n, this.stims[this.n], _self.stimuliObj.filenames[_self.stims[_self.n]], _self.stimuliObj.sentences[_self.stims[_self.n]]].join(); 
    },

    // method to handle response. takes event object as input
    recordResp: function(e) {
        
        // format trial information 
        this.urlparams = gupo();
        var workerid = this.urlparams['workerId'];
        var condition = this.urlparams['condition'];
        var list = this.urlparams['list'];
        var speaker = this.urlparams['speaker'];
        var resp = [this.info(), e.which,
                    this.respKeys[String.fromCharCode(e.which)],
                    this.tStart, this.tResp, this.tResp-this.tStart, 
                    workerid, condition,list,speaker].join('|');
        // write info to form field            
        //$('#calibrationResp').val($('#calibrationResp').val() + resp + respDelim);
        $(this.respField).val($(this.respField).val() + resp + respDelim);
        
        // write info to form field            
        //$('#calibrationResp').val($('#calibrationResp').val() + resp + respDelim);
        if (this.n < this.stims.length) {
            console.log("Writing resp:" + resp);
            $(this.respField).val($(this.respField).val() + resp + respDelim);
        };
    },
}

// link up via __super__ to superclass, etc.
extend(TestBlock, ClarkeGarrettBlock);



//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [rev. #1]
//  shuffle the input array
// DEPRECATED: use version in utilities.js
var shuffle = function(v){
    if (console) console.log('WARNING: labelingblock.js:pseduoRandomOrder is deprecated.  use utilities.js:pseudoRandomOrder instead');

    for(var j, x, i = v.length; i; j = parseInt(Math.random() * i), x = v[--i], v[i] = v[j], v[j] = x);
    return v;
};

// Some vector math helper functions (get max, min, range, and sum of a numeric Array)
Array.max = function( array ){
    return Math.max.apply( Math, array );
};
Array.min = function( array ){
    return Math.min.apply( Math, array );
};
Array.range = function(array) {
    return Array.max(array) - Array.min(array);
};
Array.prototype.sum = function() {
    var s=0;
    for (var i=0; i<this.length; i++) {
        s += this[i];
    };
    return(s)
};

// reverse map lookup (get key given value)
function valToKey(obj, v) {
    var keys = [];
    for (k in obj) {
        if (obj[k]==v) {
            keys.push(k);
        }
    }
    return(keys);
}

// Function to detect if object is an array, from http://stackoverflow.com/a/1058753
function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}

// classical-esque class inheritance: sets prototype of prototype to superclass prototype
function extend(child, supertype)
{
    child.prototype.__proto__ = supertype.prototype;
    child.prototype.__super__ = supertype.prototype;
}

function validateRespKeys(respKeys, categories) {
    for (k in respKeys) {
        if (! categories.has(respKeys[k])) {
            if (console) console.log('ERROR: response label {0} not found in specified categories {1}'.format(respKeys[k], categories));
            return false;
        }
    }
    return true;
}
