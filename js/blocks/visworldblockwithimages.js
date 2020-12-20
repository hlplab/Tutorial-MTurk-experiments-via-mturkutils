/*
 * Author: Dave F. Kleinschmidt
 * http://davekleinschmidt.com
 *
 *    Copyright 2013 Dave Kleinschmidt and
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
 * 
 * visworldBlock.js: javascript code for implementing a visual world experiment where
 * stimulus images are displayed and can then be clicked on in response to an audio
 * stimulus.
 */

function VisworldBlock(params) {
    for (p in params) {
        switch(p) {
        case 'stimuli':
            this.stims = params[p];
            break;
        case 'instructions':
            instructions = params[p];
            break;
        case 'namespace':
            namespace = params[p];
            break;
        case 'ITI':
            this.ITI = params[p];
            break;
        case 'images':
            this.images = params[p];
            break;
        case 'imageMapping':
            this.imageMapping = params[p];
            break;
        case 'jennaMapping':
            this.jennaMapping = params[p];
            break;
        case 'imagePositions':
            this.imagePositions = params[p];
            break;
        case 'randomizeImagePositions':
            this.randomizeImagePositions = params[p];
            break;
        case 'breakEvery':
            this.breakEvery = params[p];
            break;
        case 'showFamiliarization':
            this.showFamiliarization = params[p];
            break;
        case 'randomizationMethod':
            this.randomizationMethod = params[p];
            break;
        default:
            if(console) console.log('Warning: unknown parameter passed to VisworldBlock: ' + p);
            break;
        }
    }

    this.n = 0;

    // set namespace for this block (prefix for events/form fields/etc.) and
    // the class that the stimuli are assigned
    if (typeof(namespace) === 'undefined') {
        this.namespace = 'visworld';
    } else {
        this.namespace = namespace;
    }
    
    // add images to DOM
    for (image_name in this.images) {
        $("<img />")
            .addClass(this.namespace + 'image')
            .attr('id', image_name)
            .attr('src', this.images[image_name])
            .load()
            .hide()
            .appendTo('#visworldContainer');
    }
    
    // Create audio file item
    $("<audio />")
        .addClass(this.namespace + 'audio')
        .attr('preload', 'auto')
        .appendTo('#visworldContainer');

    // create response form fields
    this.respField = $('<textArea id="' + namespace + 'Resp" ' +
                       'name="' + namespace + 'Resp" ></textArea>').appendTo('#mturk_form');
    $('#mturk_form').append('<br />');
}

VisworldBlock.prototype = {
    itemOrder: undefined,       // replaces this.stims in LabelingBlock, indexed by n, indexes stimuli
    randomizationMethod: 'shuffle',
    randomizeImagePositions: true,
    imagePositions: ['topleft', 'topright', 'bottomleft', 'bottomright'],
    ITI: 1000,
    breakEvery: 100,            // number of trials between breaks
    trialsPerMinute: 12.5,      // number of trials per minute (based on testing, ~500 trials in 40 mins)
    clickCapture: false,
    onEndedBlock: undefined,
    showFamiliarization: true,

    run: function() {
        var _self = this;
        this.init();
        if (_self.showFamiliarization == true) {
            _self.familiarize();
        }
        else {
            _self.endFamiliarize();
        }
    },

    init: function() {
        var _self = this;

        // initialize trial counter
        this.n = 0;
        
        // install wait/go images
        $('<div id="readyWaitContainer"> </div>').appendTo('#visworldContainer');
        $("<img />")
            .addClass('visworld')
            .attr('id', 'ready')
            .attr('src', 'img/greenready.png')
            .appendTo('#readyWaitContainer')
            .hide()
            .load();
        $("<img />")
            .addClass('visworld')
            .attr('id', 'wait')
            .attr('src', 'img/greenwait.png')
            .appendTo('#readyWaitContainer')
            .hide()
            .load();


        ////////////////////////////////////////////////////////////////////////////////
        // construct list of items and randomize trial order
        // NOT SURE ABOUT THIS TODO
        this.itemOrder = pseudoRandomOrder(this.stims.reps, undefined, this.randomizationMethod);
        // install "start trial" handler for the "ready" light
        $('#readyWaitContainer img#ready')
            .click(function() {
                       // "turn off" the light
                       $(this).hide().siblings('img#wait').show();
                       // play stimulus and wait for response
                       _self.handlePlay();
                   });

        // install click handler on the stimulus images
        $('img.' + this.namespace + 'image').click(function(e) {_self.handleResp(e);});
        
        // install, initialize, and show a progress bar (progressBar.js)
        installPB("progressBar");
        resetPB("progressBar");
        $("#progressBar").show();
        this.pbIncrement = 1.0 / this.itemOrder.length;
                   
    },

    takeBreak: function() {
        var _self = this;
        $("#visworldContainer").hide();
        $("#instructions").html('<h3>Break Time!</h3><p>If you\'d like to take a break, you can do that now.  Keep in mind that you have a limited amount of time to complete this task.</p>').show();
        continueButton(function() {
                           $("#instructions").hide();
                           $("#visworldContainer").show();
                           _self.next();
                       });
    },
    next: function() {
        var _self = this;
        console.log(_self.randomizationMethod);
        $('#readyWaitContainer img#wait').show();
        // after ITI, turn on "ready" light, and display images
        setTimeout(function() {
                       $('#readyWaitContainer img#wait').hide().siblings('img#ready').show();
                   }, _self.ITI);

        // display images after ITI/2
        setTimeout(function() {_self.showStimImages();}, _self.ITI/2);
        
    },
    handlePlay: function() {
        console.log('in handle');
        $('.'+this.namespace + 'audio').trigger('play');
        this.waitForResp();
        this.tStart = Date.now();
    },

    showStimImages: function() {
        var _self = this;
        var positions;
        if (this.randomizeImagePositions == true) {
            positions = shuffle(this.imagePositions);
        } else {
            positions = this.imagePositions;
        }
	var blindex = positions.indexOf('bottomleft');
	if (blindex == -1)
	{
        	positions[2] = 'bottomleft';
	}
	else
	{
		var tmp = positions[2];
		positions[2] = 'bottomleft';
		positions[blindex] = tmp;
	}
        
        //Load the relevant sound file When while the images are being shown
        $('.'+this.namespace + 'audio')
            .attr('src', this.stims.prefix + this.stims.filenames[this.itemOrder[this.n]])
            .load();

        // Get the image mapping based on whether the current trial should or shouldn't be supervised
        var currentStimMapping = this.imageMapping[this.stims.supervised[this.itemOrder[this.n]]];

        $.map(currentStimMapping[this.stims.words[this.itemOrder[this.n]]],
              function(image, i) {
                  $('img#' + image + '.' + _self.namespace + 'image')
                      .addClass('vw_trialimage')
                      .attr('vw_pos', positions[i])
                      .show();
              });
        $('img#' + this.jennaMapping[this.stims.pen[this.itemOrder[this.n]]] + '.' + _self.namespace + 'image')//TODO: change image to something correct
            .addClass('vw_trialimage')
            .attr('vw_pos', positions[2])
            .show();

            
    },

    waitForResp: function() {
        // if collecting a keyboard response, would turn on listening here
        this.clickCapture = true;
    },
    handleResp: function(e) {
        if (this.clickCapture && $(e.target).attr('vw_pos') != 'bottomleft') {
            this.tResp = Date.now();
            this.clickCapture = false;
            this.end(e);
        }
    },

    info: function() {
        // pull out stimulus file basename for current trial
        var curStimSrc = this.stims.filenames[this.itemOrder[this.n]];
        var currentStimuliInfo = [];
        for (param in this.stims) {
            if (typeof this.stims[param] === 'object') {
                currentStimuliInfo.push(this.stims[param][this.itemOrder[this.n]]);
            }
        }
        return [this.namespace, this.n, this.itemOrder[this.n], currentStimuliInfo, getURLParamList(gupo())].join();
    },
    recordResp: function(e) {
        var clickID, clickVWPos, clickVWx, clickVWy;
        clickID = e.target.id;                   // ID of element clicked
        clickVWPos = $(e.target).attr('vw_pos'); // vw_pos attr value of element clicked
        clickVWx = e.pageX - $("#visworldContainer")[0].offsetLeft;
        clickVWy = e.pageY - $("#visworldContainer")[0].offsetTop;
        var resp = [this.info(), clickID, clickVWPos, clickVWx, clickVWy,
                    this.tStart, this.tResp, this.tResp-this.tStart].join();
        $(this.respField).val($(this.respField).val() + resp + RESPDELIM);
        console.log(resp);
    },

    end: function(e) {
        // update progress bar
        plusPB("progressBar", this.pbIncrement);

        // record response
        this.recordResp(e);

        // hide images and scrub of identifiers
        $('img.vw_trialimage')
            .removeClass('vw_trialimage')
            .removeAttr('vw_pos')
            .hide();

        // next trial, or end
        if (++this.n < this.itemOrder.length) {
            if (this.n % this.breakEvery == 0) {
                this.takeBreak();
            } else {
                this.next();
            }
        } else {
            this.endBlock();
        }
    },
    endBlock: function() {
        $("#visworldContainer").hide();
        $("#progressBar").hide();
        $('#readyWaitContainer').remove();
        
        // finally: hand control back to whatever called this
        if (this.practiceMode && typeof(this.onEndedPractice) === 'function') {
            // handle callback provided for end of practice phase
            this.onEndedPractice();
        } else if (typeof(this.onEndedBlock) === 'function') {
            // will be set by Experiment if added as block
            this.onEndedBlock();
        } else {
            // otherwise, write warning to console.
            if (console) console.log('WARNING: End of block reached but no callback found');
        }
    },

    // run a familiarization block with the images+labels
    familiarize: function() {
        // show image + name, wait for click, then do next.
        // add a click handler to each image, which
        //   1) removes the handler
        //   2) hides the image
        //   3) shows the next image

        var _self = this;
        
        // iterate over images in random order, assigning handlers

        

        var imgs = shuffle($("."+this.namespace + 'image'));
        function isNotJenna(v) {console.log(v); var s = $(imgs[v])[0].id; return s != 'holdpen' && s != 'normal' && s != 'penmouth';}
        imgs = imgs.filter(isNotJenna);
        console.log(imgs);

        $("#progressBar").hide();
        $('#visworldContainer').hide();
        $('#instructions')
            .html('<h3>Pictures and names</h3><p>Welcome to the experiment. First there will be a short familiarization phase. You will see a picture and its name.</p> <p>Please read the name and then click on the picture to see the next picture. These pictures will be used in the next phase of the experiment.</p>')
            .show();
                
        $(imgs)
            .addClass('familiarizationImage')
            .map(function(i, img) {
                        $(imgs[i]).bind('click.familiarization',
                                        function(e) {
                                            $(this).hide();
                                            // deal with final image
                                            if (i+1==imgs.length) {
                                                $(imgs)
                                                    .removeClass('familiarizationImage')
                                                    .unbind('.familiarization');
                                                $('#familiarizationText').remove();
                                                $('#familiarizationInstructions').remove();
                                                _self.endFamiliarize();
                                            } else {
                                                $(imgs[i+1]).show();
                                                $('#familiarizationText').html(imgs[i+1].id);
                                            }
                                        });                        
                    });

        // on continue click, start familiarization by showing first stim
        continueButton(function() {
                           $("#instructions").hide();
                           $("#visworldContainer").show();
                           $(imgs[0]).show();
                           $('<div id="familiarizationInstructions"></div>')
                               .html('<p>Read the name, then click the image to advance</p>')
                               .prependTo('#visworldContainer');
                           $('<div id="familiarizationText"></div>')
                               .html(imgs[0].id)
                               .appendTo("#visworldContainer");
                       });
    },

    endFamiliarize: function() {
        if (console) console.log('Familiarization completed');
        $("#visworldContainer").hide();
        var numTrials = this.itemOrder.length;
        // approximate duration of whole section, to nearest five minutes (rounded up)
        var timeNearestFiveMins = Math.ceil(this.itemOrder.length/this.trialsPerMinute / 5)*5;
        $("#instructions")
            .html('<h3>Start of experiment</h3>'+
                  '<p>The pictures and words you just saw will be used in the next phase of the experiment. First you will see two pictures and a green circle, with a picture of a person below the circle. When the green circle lights up, click on the circle. You will then hear a word, which was said by the person in the picture below the circle. Please click on the picture that you hear.</p><p><strong>Please respond as quickly and as accurately as possible.</strong>  If you\'re not sure, please take your best guess. ' + 
                  '<p>  There are {0} trials, and you will have a chance to take breaks every {1} trials.  This part of the experiment should take about {2} minutes or less.  The progress bar at the top will show you how many trials you have completed and how many trials remain.</p>'.format(numTrials, this.breakEvery, timeNearestFiveMins))
            .show();

        var _self = this;
        continueButton(function() {
                           $("#progressBar").show();
                           $("#instructions").hide();
                           $("#visworldContainer").show();
                           _self.next();
                       });
    }
};
