/*
 * Author: Linda Liu (adapted from code from Dave Kleinschmidt)
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

function TripleComparisonBlock(params) {
    // process parameters
    var stimuliObj, instructions, namespace, css_stim_class;
    for (p in params) {
        switch(p) {
        case 'stimuli':
            stimuliObj = params[p];
            break;
        case 'instructions':
            instructions = params[p];
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


TripleComparisonBlock.prototype = {
    reps: undefined,
    blockReps: 1,
    stims: [], // the indices WITH randomiziation
    n: 0,
    respKeys: undefined, //{71: 'B', 72: 'D'},
    categories: undefined, // ['B', 'D']
    ncorrect: 0,
    keyCapture: false,
    tResp: -1,
    tStart: -1,
    ITI: 1000,
    namespace: '',
    respField: undefined,
    onEndedBlock: undefined,
    pbIncrement: undefined,
    blockRandomizationMethod: undefined,
    totalUniqueTrials: undefined, 

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
        
        console.log("I'm not sure if I need to adjust this part yet.");
       // _self.auds = temp2;
       // _self.stims = temp2;
        
        //initialize number of unique trials 
        _self.totalUniqueTrials = _self.stimuliObj.filenames.length;
        console.log(_self.totalUniqueTrials);
        
        // initialize trial counter
        this.n = 0;

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
        }

        if (!validateRespKeys(this.respKeys, this.categories)) {
            return false;
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
        //$(document).on('keyup.' + this.namespace, function(e) {_self.handleResp(e);});

        // create handler to turn on keyboard capture when stims end, and bind to stims
//        $(this.auds).bind('ended.' + this.namespace, function() {_self.waitForResp();});

        ////////////////////////////////////////////////////////////////////////////////
        // Initialize UI elements
        // set task instructions and response cues
        $("#instructionsLower").html('Which speaker sounds the most similar to the one above?');

        // install, initialize, and show a progress bar (progressBar.js)
        installPB("progressBar");
        resetPB("progressBar");
        $("#progressBar").show();
        $("#playButtons").show();
        // DEBUGGING: add button to force start of calibration block (skip preview)
        $('#buttons').append('<input type="button" onclick="calibrationBlock.next()" value="start calibration"></input>');

    },

    // start next trial
    next: function() {
        var _self = this;
        // some status information (hidden by default)
        $('#testStatus').append('<br />stims: ' + this.stims + ', n: ' + this.n);
        $('#testStatus').html('...wait');

        $("#instructionsLower").show();
        $(".silhouette").show();
        $(".comparisonAnswers").show();

        var originalFile = '/' + _self.stimuliObj.prefix + _self.stimuliObj.filenames[_self.stims[_self.n]];
        $originalAudio = $('<audio>')
        $originalAudio.attr("src", originalFile);

        var comp1File = '/' + _self.stimuliObj.prefix + _self.stimuliObj.comparison1[_self.stims[_self.n]];
        $comp1Audio = $('<audio>')
        $comp1Audio.attr("src", comp1File);
        
        var comp2File = '/' + _self.stimuliObj.prefix + _self.stimuliObj.comparison2[_self.stims[_self.n]];
        $comp2Audio = $('<audio>')
        $comp2Audio.attr("src", comp2File);

        var play1 = false;
        var play2 = false;
        var play3 = false;

        document.getElementById('playOriginal').addEventListener('click', playOriginal);
        document.getElementById('play1').addEventListener('click', playComp1);
        document.getElementById('play2').addEventListener('click', playComp2);
        console.log(play1);

        function playOriginal() {
            $originalAudio[0].play();
            play1 = true;

        }
        function playComp1() {
            $comp1Audio[0].play();
            play2 = true;

        }
        function playComp2() {
            $comp2Audio[0].play();
            play3 = true;

        }
        $('.comparisonAnswers') 
            .click(function(event) {
                //Check to make sure the participant played each file at least once
                if (play1 === true && play2 === true && play3===true){
                    $("#listenToAllError").hide();
                    play1 = false;
                    play2 = false;
                    play3 = false;
                    document.getElementById('playOriginal').removeEventListener('click', playOriginal);
                    _self.recordResp(event);
                }
                else {
                    $("#listenToAllError").show();
                }
        });
        // create handler to turn on keyboard capture when stims end, and bind to stims
        //audio.play();
      //  lastplayed = current;
      //  $(audio).on('ended.' + this.namespace, function() {_self.waitForResp();});
        _self.tStart = Date.now();
        $('#testStatus').html('Trial started');
    },

    // handle end of trial (called by key press handler)
    end: function() {
        // update progress bar
        plusPB("progressBar", this.pbIncrement);
        //unbind things
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
        $(".silhouette").hide();
        $(".comparisonAnswers").hide();
        $(document).off();
        $(document).trigger('endBlock_' + this.namespace + 
                            (this.practiceMode ? '.practice' : ''));
        if (this.practiceMode && typeof(this.onEndedPractice) === 'function') {
            this.onEndedPractice();
        } else if (typeof(this.onEndedBlock) === 'function') {
            this.onEndedBlock();
        } else {
            if (console) console.log('WARNING: End of block reached but no callback found');
        }
    },

    // method to handle response. takes event object as input
    recordResp: function(event) {
        
        // format trial information 
        _self = this;
        this.urlparams = gupo();
        var workerid = this.urlparams['workerId'];
//        var my_label = this.urlparams['label'];
  //      var my_condition = this.urlparams['condition'];
   //     var version = this.urlparams['version'];
        var ans;
        if ($(event.target).attr("id") === 'ChoiceA') {
            ans = _self.stimuliObj.comparison1[_self.stims[_self.n]];
        }
        else {
            ans = _self.stimuliObj.comparison2[_self.stims[_self.n]];
        }
        var resp = [this.namespace, this.n, this.stims[this.n], _self.stimuliObj.filenames[_self.stims[_self.n]],
            _self.stimuliObj.comparison1[_self.stims[_self.n]], _self.stimuliObj.comparison2[_self.stims[_self.n]], $(event.target).attr("id"), ans, workerid].join();
        console.log("Writing resp:" + resp);
        // write info to form field            
        //$('#calibrationResp').val($('#calibrationResp').val() + resp + respDelim);
        $(this.respField).val($(this.respField).val() + resp + respDelim);
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

function validateRespKeys(respKeys, categories) {
    for (k in respKeys) {
        if (! categories.has(respKeys[k])) {
            if (console) console.log('ERROR: response label {0} not found in specified categories {1}'.format(respKeys[k], categories));
            return false;
        }
    }
    return true;
}
