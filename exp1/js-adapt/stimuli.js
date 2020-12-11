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

var vidSuffix, audSuffix;
var stimuli_list_all = []

// constructor: just copy JSON properties into this object
function Stimuli(baseobj) {
    $.extend(this, baseobj);
};

// default values
Stimuli.prototype = {
    // default value of calibReps is empty array
    calibReps: [],
    maxAmbig: 'undefined',
    // create a new object which is a subset of these stimuli
    subset: function(subinds) {
        // deep copy of original object
        var newstims = $.extend(true, {}, this);

        // for any properties that are arrays, default to taking the specified subset...
        for (key in newstims) {
            if (typeof(newstims[key].getSubset) !== 'undefined') {
                newstims[key] = newstims[key].getSubset(subinds);    
            }
        }

        // repair properties which may not exist or be handled by the loop over properties above
        if (typeof(this.indices) === 'undefined') newstims.indices = subinds;
        newstims.maxAmbigRange = this.maxAmbigRange;

        newstims.__proto__ = this.__proto__;
        return newstims;
    },

    install: function(css_class, tmp_css_class) {
        // check to see if indices are specified in object; if not, create them as range...
        var indices = typeof(this.indices)==='undefined' ? range(this.continuum.length) : this.indices;

        // if stimuli are already installed, can skip this (see else below) 
         if (typeof(this.installed) == 'undefined') {
            var _self = this;
            // create temporary class to pick out stimuli installed right now.
            // (this is necessary because other stimuli might share the same css_class, especially
            // if doing a concatenate_stimuli_and_install for multiple sets)
            // handle audio and video separately (default to audio if type not specified)
            switch(typeof(this.mediaType) != 'undefined' ? this.mediaType : 'audio')
            {
            case 'audio':
                // clear pre-existing html in div
                //$("#audioContainer").html("");
                //for (var j=0; j < indices.length; j++) {
                $(indices==0 ? [indices] : indices).map(function(j,index) {
                    //_self.queue.loadFile({src: _self.filenameFormatter(j, _self.prefix) +audSuffix, type:createjs.AbstractLoader.AUDIO, css_class:css_class, tmp_css_class:tmp_css_class});
                    stimuli_list_all.push({'src':_self.filenameFormatter(index, _self.prefix) +audSuffix, 'class':css_class + ' audStim', 'type':'audio'});
                });
                break;
            case 'video':
                // clear pre-existing html in div
                //$("#videoContainer").html("");
                $(indices==0 ? [indices] : indices).map(function(j,index) {
//                    _self.queue.loadFile({src: _self.filenameFormatter(index, _self.prefix) +vidSuffix, type:createjs.AbstractLoader.VIDEO, css_class:css_class, tmp_css_class:tmp_css_class});
                    stimuli_list_all.push({'src':_self.filenameFormatter(index, _self.prefix) +vidSuffix, 'class':css_class + ' vidStim', 'type':'video'});
                });
                break; 
            }
        }
         else {
            // already installed. just add css class
            if (typeof(css_class) !== 'undefined') {
                $(this.installed).addClass(css_class);
                //this takes the 3 surrounding each side of the maxAmbig
                this.installed = this.installed.slice(this.maxAmbig-3, this.maxAmbig+4);
            }
        }
        return;
    },
    get_and_load_stims: function(css_class) { 
              var tmp_css_class = 'tmpclass' + Math.floor(Math.random() * 1000000);
              var _self = this;
              _self.install(css_class, tmp_css_class);
              _self.installed = stimuli_list_all;
        },

    get_installed:function() {
        var _self = this;
        if (this.maxAmbig !== 'undefined') {
              _self.installed = this.installed.slice(this.maxAmbig-3, this.maxAmbig+4); // this takes three before the maxAmbig (7 total)
        }
        return _self.installed;
    },
    // default file name formatter just indexes stored filenames.
    filenameFormatter: function(n, prefix) {
        return(prefix + this.filenames[n]);
    }
};

/*
 * Stimuli objects
 *   prefix: appended to filenames returned by formatter (if you want to avoid typing)
 *   continuum: array of values which give x-coordinate on stimulus continuum
 *   maxAmbigRange: [min, max] acceptable continuum range for boundary
 *   calibReps: number (or array of numbers) which gives default number of repetitions during calibration phase
 *   mediaType: 'audio' or 'video'
 *   filenameFormatter: function(n), where n is in 1..continuum.length, and returns nth filename
 *   catchFilenameFormatter: same as filenameFormatter 
 */

/*
 * StimuliList objects
 *   prefix: 
 *   filenames: array of file names (without prefix).
 *   (that's it. everything else will be computed from those.)
 */

/*ExtendedStimuliList objects 
    * Use these if you want to specify a file that matches audio/visual stimuli with some sort of text.
    * prefix
    *mapping: file mapping filename|subtitle
    */
function ExtendedStimuliFileList(baseobj) {
    $.extend(this, baseobj);
    var numstims = this.filenames.length;
    // make sure file name list is provided and formatter is not
    // filename list
    if (typeof(baseobj.filenames) === 'undefined') {
        throw('Must provide list of filenames to StimuliFileList');
    }
    // check for filename formatter, warn if present
    if (typeof(baseobj.filenameFormatter) !== 'undefined') {
        if (console) console.log('filenameFormatter specified for a StimuliFileList object. Are you sure you didn\'t actually want to create a Stimuli object?');
    }


    // check for media type
    if (typeof(this.mediaType) === 'undefined') {
        throw('Must specify media type as \'audio\' or \'video\'');
    }    
}

ExtendedStimuliFileList.prototype = {
    filenameFormatter: function(n, prefix) {
        // default formatter is just going to pick out the nth filename
        return(prefix + this.filenames[n]); 
    },
    getSubtitles: function(n) {
        // default formatter is just going to pick out the nth filename
        return(this.subtitles[n]); 
    },
    prefix: '',
    calibReps: 1
};

/*TripleStimuliList
    * Use these if you want to specify a three files to play during a trial at once. The indices will be the same.
    * prefix
    */
function TripleStimuliList(baseobj) {
    $.extend(this, baseobj);
    var numstims = this.filenames.length;
    // make sure file name list is provided and formatter is not
    // filename list
    if (typeof(baseobj.filenames) === 'undefined') {
        throw('Must provide list of filenames to StimuliFileList');
    }
    if (typeof(baseobj.comparison1) === 'undefined') {
        throw('Must provide list of first comparisons to TripleStimuliList. Otherwise use normal StimulFileList');
    }
    if (typeof(baseobj.comparison2) === 'undefined') {
        throw('Must provide list of second comparisons to TripleStimuliList. Otherwise use normal StimulFileList');
    }
    // check for filename formatter, warn if present
    if (typeof(baseobj.filenameFormatter) !== 'undefined') {
        if (console) console.log('filenameFormatter specified for a StimuliFileList object. Are you sure you didn\'t actually want to create a Stimuli object?');
    }


        //make sure subtitles is same length as filenames
    if (this.comparison1.length != this.filenames.length) {
        throw('comparison1 length != number of filenames');
    }
    if (this.comparison2.length != this.filenames.length) {
        throw('comparison2 length != number of filenames');
    }
    if (this.comparison1talker.length != this.comparison2.length) {
        throw('comparison1 length != comparison2 talker length');
    }
    if (this.comparison1talker.length != this.filenametalker.length) {
        throw('comparison1 length != comparison2 talker length');
    }
    if (this.comparison1talker.length != this.comparison2talker.length) {
        throw('comparison1 length != comparison2 talker length');
    }
}

ExtendedStimuliFileList.prototype = {
    filenameFormatter: function(n, prefix) {
        // default formatter is just going to pick out the nth filename
        return(prefix + this.filenames[n]); 
    },
    getComparison1: function(n) {
        // default formatter is just going to pick out the nth filename
        return(this.comparison1[n]); 
    },
    getComparison2: function(n) {
        // default formatter is just going to pick out the nth filename
        return(this.comparison2[n]); 
    },
    prefix: '',
    calibReps: 1
};


extend(StimuliFileList, Stimuli);


function StimuliFileList(baseobj) {
    $.extend(this, baseobj);
    var numstims = this.filenames.length;
    // make sure file name list is provided and formatter is not
    // filename list
    if (typeof(baseobj.filenames) === 'undefined') {
        throw('Must provide list of filenames to StimuliFileList');
    }
    // check for filename formatter, warn if present
    if (typeof(baseobj.filenameFormatter) !== 'undefined') {
        if (console) console.log('filenameFormatter specified for a StimuliFileList object. Are you sure you didn\'t actually want to create a Stimuli object?');
    }


    // check for whether baseobj contains the right stuff; if not, fill in
    if (typeof(this.continuum) === 'undefined') {
        // make continuum 1:numstims
        this.continuum = range(numstims);
    } else {
        // make sure continuum is right length
        if (this.continuum.length != this.filenames.length) {
            throw('Continuum length != number of filenames');
        }
    }

    // check for maxambig range
    if (typeof(this.maxAmbigRange) === 'undefined') {
        this.maxAmbigRange = [1, numstims];
    }

    // check for media type
    if (typeof(this.mediaType) === 'undefined') {
        throw('Must specify media type as \'audio\' or \'video\'');
    }    
}

StimuliFileList.prototype = {
    filenameFormatter: function(n, prefix) {
        // default formatter is just going to pick out the nth filename
        return(prefix + this.filenames[n]); 
    },
    prefix: '',
    calibReps: 1
};

function SpeakerSentencePairStimuliFileList(baseobj) {
    $.extend(this, baseobj);
    var numstims = this.filenames.length;
    // make sure file name list is provided and formatter is not
    // filename list
    if (typeof(baseobj.filenames) === 'undefined') {
        throw('Must provide list of filenames to SpeakerSentencePairStimuliFileList');
    }
    if (typeof(baseobj.speakers) === 'undefined') {
        throw('Must provide list of names SpeakerSentencePairStimuliFileList. Otherwise use normal StimulFileList');
    }
    // check for filename formatter, warn if present
    if (typeof(baseobj.filenameFormatter) !== 'undefined') {
        if (console) console.log('filenameFormatter specified for a SpeakerSentencePairStimuliFileList object. Are you sure you didn\'t actually want to create a Stimuli object?');
    }


    // check for whether baseobj contains the right stuff; if not, fill in
        //make sure subtitles is same length as filenames
    if (this.speakers.length != this.filenames.length) {
        throw('subtitles length != number of filenames');
    }
    // check for media type
    if (typeof(this.mediaType) === 'undefined') {
        throw('Must specify media type as \'audio\' or \'video\'');
    }    

    //randomize 
    if (this.randomizeSpeakers === true) {
        var new_audio = [];
        var new_speaker = [];
        for (var i=0; i < this.speakers.length; i++) {
            var newSpeakerOrder = [];
            var newAudioOrder = [];
            var myspeakers = this.speakers[i].split('|');
            var myaudio = this.filenames[i].split('|');
            var listOfIndex = shuffle(range(myspeakers.length));
            for (var j=0; j < listOfIndex.length; j++) {
                newSpeakerOrder[j] = myspeakers[listOfIndex[j]];
                newAudioOrder[j] = myaudio[listOfIndex[j]];
            }
            new_speaker.push(newSpeakerOrder.join('|'));
            new_audio.push(newAudioOrder.join('|'));

        }
        this.speakers = new_speaker;
        this.filenames = new_audio;
        }
}


ExtendedStimuliFileList.prototype = {
    filenameFormatter: function(n, prefix) {
        // default formatter is just going to pick out the nth filename
        return(prefix + this.filenames[n]); 
    },
    getSubtitles: function(n) {
        // default formatter is just going to pick out the nth filename
        return(this.subtitles[n]); 
    },
    prefix: '',
    calibReps: 1
};
extend(StimuliFileList, Stimuli);


// Concatenate multiple stimuli objects together
function concatenate_stimuli_and_install(stimArray, css_class) {
    var stims = {continuum: [], calibReps: [], installed: [], prefix: ''};
    var tmp_css_class = 'tmpclass' + Math.floor(Math.random() * 1000000);
    
    for (var i = 0; i < stimArray.length; i++) {
        $.merge(stims.continuum, stimArray[i].continuum);
        $.merge(stims.calibReps, stimArray[i].calibReps);
        stimArray[i].install(css_class, tmp_css_class);
        $.merge(stims.installed, stimArray[i].installed);
    }

    return(stims);
}

function range(from, to, step) {
    if (typeof(to) === 'undefined') {
        to = from;
        from = 0;
    }
    if (typeof(step)==='undefined') {
        step = 1;
    }
    var x = [];
    var n = from;
    do {
        x.push(n);
        n += step;
    } while (n < to)
    return x;
}

Array.prototype.getSubset = function(subset) {
    var _self = this;
    return $.makeArray($(subset==0 ? [subset] : subset).map(function(i,j) {
                                         return _self[j];
                                     }));
};

// classical-esque class inheritance: sets prototype of prototype to superclass prototype
function extend(child, supertype)
{
    child.prototype.__proto__ = supertype.prototype;
    child.prototype.__super__ = supertype.prototype;
}
