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

var orderClipsPlayed = [];
var alreadyPlayedAudio = [];
var alreadyDragged = [];
function GridBlock(params) {
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
        case 'prefix':
            this.prefix = params[p];
            break;
        case 'colors':
            this.colors = params[p];
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


GridBlock.prototype = {
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
    gridOffset: '',
    prefix: undefined,
    
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
            return(reps * blockReps * this.stimuliObj.filenames.length);
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
        
        //initialize number of unique trials 
        _self.totalUniqueTrials = _self.stimuliObj.filenames.length;
        console.log(_self.totalUniqueTrials);
        _self.gridOffset = $('#grid-wrapper').offset();
        console.log(_self.gridOffset);
        // initialize trial counter
        this.n = 0;

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
        $("#instructionsLower").html('Each of the circles below represents a different person. Click on a circle to play a sentence or word from that person. Your task is to form groups of people based on how similar they sound. You can move the circles by dragging and dropping them.<br><br>The button to continue will appear when this task is completed.')

        // install, initialize, and show a progress bar (progressBar.js)
        installPB("progressBar");
        resetPB("progressBar");
        $("#progressBar").show();
        $("#playButtons").show();
        // DEBUGGING: add button to force start of calibration block (skip preview)
        $('#buttons').append('<input type="button" onclick="calibrationBlock.next()" value="start calibration"></input>');
        $('#grid-wrapper').show();

  
    },
    // start next trial
    next: function() {
        $('#nextTrial').hide();
        var _self = this;
        // some status information (hidden by default)
        $('#testStatus').append('<br />stims: ' + this.stims + ', n: ' + this.n);
        $('#testStatus').html('...wait');

        $("#instructionsLower").show();
        
        //Loop to load all the audio
        var currentAudio = _self.stimuliObj.filenames[_self.stims[_self.n]].split('|');
        for (var i=0; i<currentAudio.length; i++) {
            currentAudio[i] = this.stimuliObj.prefix + currentAudio[i] + '.wav';
        };
        var currentSpeakers = _self.stimuliObj.speakers[_self.stims[_self.n]].split('|');
        
        alreadyPlayedAudio = jQuery.extend(true, [], currentSpeakers); //copy; when empty this means all the clips have been played
        alreadyDragged = jQuery.extend(true, [], currentSpeakers); //copy; when empty this means all the clips have been played
        for (var i=0; i<currentSpeakers.length; i++) {
            //create the little icons for each speaker
            var node = document.createElement("div"); 
            var textnode = document.createElement("span"); 
            textnode.setAttribute("class", 'itemPos');
            node.appendChild(textnode);
            node.setAttribute("class", "draggable ui-widget-content ui-draggable ui-draggable-handle");
            node.setAttribute("id", currentSpeakers[i]);
            document.getElementById("landing").appendChild(node);
            document.getElementById(currentSpeakers[i]).style.background = this.colors[i];
            
            //add audio
            var audionode= document.createElement("audio");
            audionode.setAttribute("src", currentAudio[i]);
            audionode.setAttribute("class", "audioStimFile");
            node.appendChild(audionode);
        }
        install_grid();
        $('#nextTrial') .click(function(event) {
                         _self.recordResp();
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
        orderClipsPlayed = [];
        var currentSpeakers = _self.stimuliObj.speakers[_self.stims[_self.n]].split('|');
        for (var i=0; i<currentSpeakers.length; i++) {
            document.getElementById(currentSpeakers[i]).remove();
        }
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
        $('#grid-wrapper').hide();
        $('#nextTrial').hide();
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
    recordResp: function() {
        
        // format trial information 
        _self = this;
        this.urlparams = gupo();
        var workerid = this.urlparams['workerId'];
//        var my_label = this.urlparams['label'];
  //      var my_condition = this.urlparams['condition'];
   //     var version = this.urlparams['version'];
        var ansX = [];
        var ansY = [];
        if (typeof(_self.stimuliObj.speakers[_self.stims[_self.n]]) === undefined) {
            this.end();
        }
        else {
            var currentSpeakers = _self.stimuliObj.speakers[_self.stims[_self.n]].split('|');
            for (var i=0; i<currentSpeakers.length; i++) {
                ansX.push($('#'+currentSpeakers[i]).attr("PosX"));
                ansY.push($('#'+currentSpeakers[i]).attr("PosY"));
            }
            console.log(orderClipsPlayed);
            var resp = [this.namespace, this.n, this.stims[this.n], _self.stimuliObj.filenames[_self.stims[_self.n]], _self.stimuliObj.speakers[_self.stims[_self.n]], 
                ansX.join('|'), ansY.join('|'), orderClipsPlayed.join('|'), workerid].join();
            console.log("Writing resp:" + resp);
            // write info to form field            
            //$('#calibrationResp').val($('#calibrationResp').val() + resp + respDelim);
            $(this.respField).val($(this.respField).val() + resp + respDelim);
            this.end();
        }
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
function check_if_all_played_and_dragged() {
    if (alreadyDragged.length < 1 && alreadyPlayedAudio.length < 1) {
        $('#nextTrial').show();
    }
}
function install_grid() {
    $(".draggable" )
        .draggable({ 
            drag: function(){
                var offset = $(this).offset();
                var xPos = offset.left;
                var yPos = offset.top;
                $(this).attr("PosX", xPos);
                $(this).attr("PosY", yPos);
                //$(this).children('.itemPos').text("(" +xPos +"," + yPos + ")");
                var indexDragged = alreadyDragged.indexOf($(this).attr("id"));
                if (indexDragged > -1) {
                        alreadyDragged.splice(indexDragged, 1);
                }
                check_if_all_played_and_dragged();
            },
            containment: "#grid-wrapper",
        })
        .click(function(){
            if ( $(this).is('.ui-draggable-dragging') ) {
                return;
            }
            $(this).children('.audioStimFile')[0].play();
            orderClipsPlayed.push($(this).attr("id"));
            var indexAudio = alreadyPlayedAudio.indexOf($(this).attr("id"));
            if (indexAudio > -1) {
                    alreadyPlayedAudio.splice(indexAudio, 1);
            }
            check_if_all_played_and_dragged();
        });
}
