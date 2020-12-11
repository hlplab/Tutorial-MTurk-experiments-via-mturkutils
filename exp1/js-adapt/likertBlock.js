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

function setSliderTicks(){
    var $slider =  $('#slider');
    var max =  $slider.slider("option", "max");    
    var spacing =  100 / (max -1);

    $slider.find('.ui-slider-tick-mark').remove();
    for (var i = 0; i < max ; i++) {
        $('<span class="ui-slider-tick-mark"></span>').css('left', (spacing * i) +  '%').appendTo($slider); 
     }
}

var keyCapture = false;
function LikertBlock(params) {
    // process parameters
    var stimuliObj, namespace, css_stim_class;
    for (p in params) {
        switch(p) {
        case 'stimuli':
            stimuliObj = params[p];
            break;
        case 'instructions':
            this.instructions = params[p];
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
        case 'min':
            this.min= params[p];
            break;
        case 'max':
            this.max= params[p];
            break;
        case 'length':
            this.length = params[p];
            break;
        case 'value':
            this.value = params[p];
            break;
        case 'currentValue':
            this.value = params[p];
            break;
        case 'step':
            this.step = params[p];
            break;
        case 'minLabel':
            this.minLabel = params[p];
            break;
        case 'maxLabel':
            this.maxLabel = params[p];
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

    if (isArray(stimuliObj)) {
        // concatenate into one mega-object, and set for this block
        console.log("YO you should figure out this loop here");
        this.stimuliObj = concatenate_stimuli_and_install(stimuliObj, css_stim_class);
        this.auds = this.stimuliObj.installed;
    } else {
        // set stimuli object for this block
        this.stimuliObj = stimuliObj;
        console.log(stimuliObj);
        $('#continue').show();
    }
    
    // create responses form element and append to form
    this.respField = $('<textArea id="' + namespace + 'Resp" ' +
                       'name="' + namespace + 'Resp" ></textArea>').appendTo('#mturk_form');
    $('#mturk_form').append('<br />');
    
}

LikertBlock.prototype = {
    reps: undefined,
    blockReps: 1,
    stims: [], // the indices WITH randomiziation
    n: 0,
    respKeys: undefined, //{71: 'B', 72: 'D'},
    categories: undefined, // ['B', 'D']
    ncorrect: 0,
    tResp: -1,
    tStart: -1,
    ITI: 1000,
    namespace: '',
    respField: undefined,
    onEndedBlock: undefined,
    pbIncrement: undefined,
    blockRandomizationMethod: undefined,
    totalUniqueTrials: undefined, 
    min: 1,
    max: 100,
    step: 1,
    value: 5,
    currentValue: undefined,
    minLabel: "Not likely",
    maxLabel: "Very likely",
    instructions: undefined,
    mediaType: "audio",

    getTotalReps: function() {
        var reps;
        var blockReps = 1;
        if (typeof this.reps === 'undefined')  {
            reps = this.stimuliObj.calibReps;
        } else {
            reps = this.reps;    
        }

        if (typeof this.blockReps !== 'undefined') {
            blockReps = this.blockReps;
        }

        if (reps.sum) {
            return(reps.sum());
        } else {
            return(reps * blockReps * this.stimuliObj.continuum.length);
        }
    },

    run: function() {
        var _self = this;
        _self.init();
       _self.next();
    },
    
    init: function(opts) {
        console.log("In init");
        var _self = this;
        console.log(_self.instructions);
        if (_self.mediaType === "audio") {
            $('#miniVideoContainer').remove();
        };
        
        console.log(_self.value, _self.step, _self.min, _self.max);

        $("#slider").slider({
            range: "min",
            value: _self.value,
            step: _self.step,
            min: _self.min,
            max: _self.max,
            slide: function( event, ui ) {
                $("#sliderVal" ).val( ui.value );
                _self.currentValue = ui.value;
            },
            create: function(event, ui){
                $("#slider").slider('value', _self.value);
                $("#sliderVal" ).val(_self.value);
                setSliderTicks();
            }
        });
        
        $("#sliderVal").change(function () {
            var value = ui.value;
            console.log(_self.max);
            if (value > _self.max) {
                value = _self.max;
            }
            if (value < _self.min) {
                value = _self.min;
            }
            $("#slider").slider("value", parseInt(value));
            _self.currentValue = value;

        }); 
        $('#nextTrialSlider').click(function (event) {
            $("video.vidStimLikert").remove();
            _self.recordResp();
            $("#slider").slider('value', _self.value);
            $("#sliderVal" ).val(_self.value);
        });

        $("#minLabel").html(_self.minLabel);
        $("#maxLabel").html(_self.maxLabel);
        _self.totalUniqueTrials = _self.stimuliObj.filenames.length;
        
        console.log("trials: " + _self.totalUniqueTrials);
        // initialize trial counter
        this.n = 0;

        ////////////////////////////////////////////////////////////////////////////////
        // initialize response keys and response labels:
        // response keys can be provided to constructor, or default to global var respKeyMap
        if (typeof this.respKeys === 'undefined') {
            this.respKeys = respKeyMap;
        }

        this.currentValue = this.value;

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
        }

        ////////////////////////////////////////////////////////////////////////////////
        // Randomize stimuli order.

        this.stims = [];
        for (var br = 0; br < this.blockReps; br++) {
            this.stims = this.stims.concat(pseudoRandomOrder(this.reps, this.totalUniqueTrials, this.blockRandomizationMethod));
        }
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
        $("#instructionsLower").html(_self.instructions);

        // install, initialize, and show a progress bar (progressBar.js)
        installPB("progressBar");
        resetPB("progressBar");
        $("#progressBar").show();
        $("#slider").show();
        $("#sliderVal").show();
        $("#sliderLabel").show();
        $("#minLabel").show();
        $("#maxLabel").show();
        // DEBUGGING: add button to force start of calibration block (skip preview)
    },

    handleResp: function(e) {
        if (keyCapture === true) {
            if (String.fromCharCode(e.which) === 'X') {
                this.currentValue = Math.max((this.currentValue - this.step), this.min);
                $("#slider").slider('value', this.currentValue);
                $("#sliderVal").val(this.currentValue);
            
            }
            if (String.fromCharCode(e.which) === 'M') {
                this.currentValue = Math.min((this.currentValue + this.step), this.max);
                $("#slider").slider('value', this.currentValue);
                $("#sliderVal").val(this.currentValue);
            
            }
            
            if (e.keyCode === 0 || e.keyCode === 32) {
                $("video.vidStimLikert").remove();
                this.recordResp();
                $("#slider").slider('value', this.value);
                $("#sliderVal" ).val(this.value);
            }
        }
    },
    // start next trial
    next: function() {
        var _self = this;
        // some status information (hidden by default)
        $('#testStatus').append('<br />stims: ' + this.stims + ', n: ' + this.n);
        $('#testStatus').html('...wait');

        $("#instructionsLower").show();
        $("#nextTrialSlider").hide();
        
        var extension = "";
        if (_self.mediaType === "audio") {
            extension = ".wav";
        }
        if (_self.mediaType === "video") {
            extension = ".webm";
        }
        _self.currentValue = _self.value;
        var originalFile = _self.stimuliObj.prefix + _self.stimuliObj.filenames[_self.stims[_self.n]] + extension;
        setTimeout(function() {
            if (_self.mediaType === "audio") {
                $originalAudio = $('<audio>')
                $originalAudio.attr("src", originalFile);
                $originalAudio[0].play();
                $originalAudio.on('ended', function() {
                    keyCapture = true;
                    $("#nextTrialSlider").show();
                });
            }
            if (_self.mediaType === "video") {
        //        $('#miniVideoContainer').append($originalAudio[0]);
                $('#miniVideoContainer').html("<video class='vidStimLikert' src=" + originalFile + "></video>");
//                $originalAudio[0].play();
                $("video.vidStimLikert")[0].load();
                $("video.vidStimLikert")[0].play();
                $("video.vidStimLikert").on('ended', function() {
                    $("#nextTrialSlider").show();
                });
            }
        }, _self.ITI)
        
    },

    // handle end of trial (called by key press handler)
    end: function() {
        // update progress bar
        keyCapture = false;
        $originalAudio.remove();
        plusPB("progressBar", this.pbIncrement);
        //unbind things
        // if more trials remain, trigger next trial
        if (++this.n < this.stims.length) {
            console.log("P");
            this.next();
        } else {
            console.log("P2");
            this.endBlock();
        }
    },

    endBlock: function() {
        // trigger endCalibrationBlock event
        console.log("in end block");
        $("#testInstructions").hide();
        $("#progressBar").hide();
       // $(this.auds).unbind('.' + this.namespace).height(0);
       // $(document).unbind('.' + this.namespace);
        $("#instructionsLower").hide();
        $("#slider").hide()
        $("#sliderVal").hide();
        $("#minLabel").hide();
        $("#maxLabel").hide();
        $("#nextTrialSlider").hide();
        $(document).off();
        $(document).trigger('endBlock_' + this.namespace + 
                            (this.practiceMode ? '.practice' : ''));
        if (this.practiceMode && typeof(this.onEndedPractice) === 'function') {
            console.log("WAH-racit");
            this.onEndedPractice();
        } else if (typeof(this.onEndedBlock) === 'function') {
            console.log("WAH");
            this.onEndedBlock();
        } else {
            if (console) console.log('WARNING: End of block reached but no callback found');
        }
    },

    // method to handle response. takes event object as input
    recordResp: function() {
        
        // format trial information 
        _self = this;
        this.urlparams = gupo();
        var workerid = this.urlparams['workerId'];
//        var my_label = this.urlparams['label'];
  //      var my_condition = this.urlparams['condition'];
   //     var version = this.urlparams['version'];
        var ans;
        var resp = [this.namespace, this.n, this.stims[this.n], _self.stimuliObj.filenames[_self.stims[_self.n]],
             _self.min, _self.max, _self.minLabel, _self.maxLabel, _self.step, $("#sliderVal").val(), workerid].join();
        // write info to form field            
        //$('#calibrationResp').val($('#calibrationResp').val() + resp + respDelim);
        if (this.n < this.stims.length) {
            console.log("Writing resp:" + resp);
            $(this.respField).val($(this.respField).val() + resp + respDelim);
        };
        this.end();
    },

};


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

// DEPRECATED: now lives in "utilities.js"  will run w/ warning
// function to pseduo-randomize stimuli lists.  takes either vector of repetitions for
// each item, or (scalar) number of repetitions for each item and the length of the continuum.
function pseudoRandomOrder(reps, n, method) {
    if (console) console.log('WARNING: labelingblock.js:pseduoRandomOrder is deprecated.  use utilities.js:pseudoRandomOrder instead');

    // if reps is specified as a constant, convert to an array
    if (typeof(reps) === "number" || reps.length == 1) {
        if (typeof(n) !== "undefined") {
            reps = (function(N) {var x=[]; for (var i=0; i<N; i++) {x[i] = reps;}; return(x);})(n);
        } else {
            throw "Must provide either vector of repetitions or number of stimuli";
        }
    }

    // method of pseudorandomization
    if (typeof(method) === 'undefined') {
        method = 'extreme_early';
    }

    // pseudo-random order for stimuli: create blocks with one of
    // each stimulus, shuffle within each block and shuffle order
    // of blocks (only necessary because of non-uniform repetitions)
    var repsRem = reps.slice(0);
    var block = [];
    var blocks = [];
    do {
        block = [];
        for (var i=0; i<repsRem.length; i++) {
            if (repsRem[i] > 0) {
                block.push(i);
                repsRem[i]--;
            }
        }
        // randomize order of stimuli in THIS block
        blocks.push(shuffle(block));
    } while (block.length > 0);

    // DON'T RANDOMIZE order of blocks, so that extreme stimuli are guaranteed
    // to be more common early on
    // ...and concatenate each shuffled block to list of trials
    var stims = [];
    switch(method) {
    case 'extreme_early':
        for (var i=0; i<blocks.length; i++) {
            stims = stims.concat(blocks[i]);
        }
        break;
    case 'extreme_late':
        for (var i=blocks.length; i>0; i--) {
            stims = stims.concat(blocks[i-1]);
        }
        break;
    case 'shuffle':
        blocks = shuffle(blocks);
        for (var i=0; i<blocks.length; i++) {
            stims = stims.concat(blocks[i]);
        }
        break;
    default:
        if (console) {console.log('ERROR: bad randomization method: ' + method);}
        throw('bad randomization method: ' + method);
    }

    return(stims);
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
