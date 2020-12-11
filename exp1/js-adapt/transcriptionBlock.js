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
var keyPress = false;
function TranscriptionBlock(params) {
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
        case 'isPractice':
            this.isPractice = params[p];
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
    if (typeof(isPractice) === 'undefined') {
        isPractice = false;
    }

    if (isArray(stimuliObj)) {
        // concatenate into one mega-object, and set for this block
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

TranscriptionBlock.prototype = {
    reps: undefined,
    blockReps: 1,
    stims: [], // the indices WITH randomiziation
    n: 0,
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
    instructions: undefined,
    isPractice: false,
    mediaType: "audio",

    run: function() {
        var _self = this;
        _self.init();
       _self.next();
    },
    
    init: function(opts) {
        var _self = this;
        
        _self.totalUniqueTrials = _self.stimuliObj.filenames.length;
        
        // initialize trial counter
        this.n = 0;

        ////////////////////////////////////////////////////////////////////////////////
        // Randomize stimuli order.

        this.stims = [];
        for (var br = 0; br < this.blockReps; br++) {
            this.stims = this.stims.concat(pseudoRandomOrder(this.reps, this.totalUniqueTrials, this.blockRandomizationMethod));
        }
        this.pbIncrement = 1.0 / this.stims.length;
        //Move to next trial on click 
        
        $(document).on('keyup.' + this.namespace, function(e) {_self.handleResp(e);});
        $(document).on('keydown.' + this.namespace, function(e) {_self.handleRespDown(e);});

   /*     $('#nextTrial').click(function (event) {
            $originalAudio.remove();
            console.log(this.isPractice);
            _self.recordResp();
        });
     */           
        $("#instructionsLower").html(_self.instructions);

        // install, initialize, and show a progress bar (progressBar.js)
        installPB("progressBar");
        resetPB("progressBar");
        $("#progressBar").show();
        // DEBUGGING: add button to force start of calibration block (skip preview)
    },

    handleResp: function(e) {
        if (keyPress === true) {
            if (e.keyCode === 13 || e.keyCode === 10 ) {
                e.preventDefault();
                $originalAudio.remove();
                this.recordResp();
            }
        }
    },
    handleRespDown: function(e) {
        if (keyPress === true) {
            document.getElementById("transcription").focus();
        }
        if (e.keyCode === 13 || e.keyCode === 10 ) {
            e.preventDefault();
        }
    },
    // start next trial
    next: function() {
        var _self = this;
        // some status information (hidden by default)
        $('#testStatus').append('<br />stims: ' + this.stims + ', n: ' + this.n);
        $('#testStatus').html('...wait');

        $("#instructionsLower").show();
        
        var extension = "";
        if (_self.mediaType === "audio") {
            extension = ".wav";
        }
        if (_self.mediaType === "video") {
            extension = ".webm";
        }
        var originalFile = _self.stimuliObj.prefix + _self.stimuliObj.filenames[_self.stims[_self.n]] + extension;
        setTimeout(function() {
            if (_self.mediaType === "audio") {
                $originalAudio = $('<audio>');
                $originalAudio.attr("src", originalFile);
                $originalAudio[0].play();
                audioFinishedPlaying = false;
                $("#transcription").show();
                $originalAudio.on('ended', function() {
                    keyPress = true;
                    audioFinishedPlaying = true;
                    //$("#nextTrial").show();
                });
            }
            if (_self.mediaType === "video") {
        //        $('#miniVideoContainer').append($originalAudio[0]);
                $('#miniVideoContainer').html("<video class='vidStimLikert' src=" + originalFile + "></video>");
//                $originalAudio[0].play();
                $("video.vidStimLikert")[0].load();
                $("video.vidStimLikert")[0].play();
                $("video.vidStimLikert").on('ended', function() {
                    keyPress = true;
                    $("#transcription").show();
                    //$("#nextTrial").show();
                });
            }
        }, _self.ITI)
        
    },

    // handle end of trial (called by key press handler)
    end: function() {
        // update progress bar
        plusPB("progressBar", this.pbIncrement);
        //unbind things
        keyPress = false;
        $("#transcription").empty();
        $("#transcription").hide();
        $("#nextTrial").hide();
        // if more trials remain, trigger next trial
        if (++this.n < this.stims.length) {
            this.next();
        } else {
            this.endBlock();
        }
    },

    endBlock: function() {
        // trigger endCalibrationBlock event
        $("#testInstructions").hide();
        $("#progressBar").hide();
       // $(this.auds).unbind('.' + this.namespace).height(0);
       // $(document).unbind('.' + this.namespace);
        $("#instructionsLower").hide();
        $("#nextTrial").hide();
        $("#transcription").hide();
        $("#wrongAnsMessage").hide();
        $(document).off();
        if (typeof(this.onEndedBlock) === 'function') {
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
        var condition = this.urlparams['condition'];
        var set = this.urlparams['set'];
        var list = this.urlparams['list'];
        var speaker = this.urlparams['speaker'];
        var transcript = $('#transcription').text();
        transcript = escapeHTML(transcript);
        var resp = [this.namespace, this.n, this.stims[this.n], _self.stimuliObj.filenames[_self.stims[_self.n]], _self.stimuliObj.subtitles[_self.stims[_self.n]], 
            transcript, condition, set, list, speaker,
            workerid].join('|');
        // write info to form field            
        //$('#calibrationResp').val($('#calibrationResp').val() + resp + respDelim);
        if (_self.isPractice == true && this.namespace == 'practice') {
            transcript = transcript.toLowerCase().replace(/[.,-\/#!$%\^&\*;:{}=\-_`~()]/g,"").trim();
            //if (transcript !== _self.stimuliObj.subtitles[_self.stims[_self.n]]) { //does not match exactly
            if (levDist(transcript, _self.stimuliObj.subtitles[_self.stims[_self.n]]) > 4) {
                $("#wrongAnsMessage").show();
                this.next();
                return;
            }

        }
        if (this.n < this.stims.length) {
            $("#wrongAnsMessage").hide();
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
