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


// update experimental control script.  defines Experiment object.

// convenience variable for debugging (block of experiment currently being executed)
var _curBlock;

function Experiment(baseobj) {
    // add any properties passed as object to this, overriding defaults
    $.extend(this, baseobj);
    this.survey = baseobj.survey; //TODO: make this a list of surveys?
    this.urlparams = gupo();
    this.consentFormDiv = '<div id="consent">By accepting this HIT, you confirm that you have read and understood the <a target="_blank" href="' + baseobj.consentForm +
    '">consent form</a>, that you are willing to participate in this experiment, and that you agree that the data you provide by participating can be used in scientific publications (no identifying information will be used). Sometimes it is necessary to share the data elicited from you &mdash; including sound files &mdash; with other researchers for scientific purposes (for replication purposes). That is the only reason for which we will share data and we will only share data with other researchers and only if it is for non-commercial use. Identifying information will <span style="font-weight:bold;">never</span> be shared (your MTurk ID will be replaced with an arbitrary alphanumeric code).</div>'

}

Experiment.prototype = {
    blocks: [],
    blockn: undefined,
    rsrbProtocolNumber: 'RSRB00045955',
    //rsrbConsentFormURL: 'https://www.hlp.rochester.edu/consent/RSRB45955_Consent_2017-02-10.pdf',
    //consentFormDiv: '<div id="consent">By accepting this HIT, you confirm that you have read and understood the <a target="_blank" href="https://www.hlp.rochester.edu/consent/RSRB45955_Consent_2017-02-10.pdf">consent form</a>, that you are willing to participate in this experiment, and that you agree that the data you provide by participating can be used in scientific publications (no identifying information will be used). Sometimes it is necessary to share the data elicited from you &mdash; including sound files &mdash; with other researchers for scientific purposes (for replication purposes). That is the only reason for which we will share data and we will only share data with other researchers and only if it is for non-commercial use. Identifying information will <span style="font-weight:bold;">never</span> be shared (your MTurk ID will be replaced with an arbitrary alphanumeric code).</div>',
    
    // addBlock: function(block, instructions, endedHandler, practiceParameters) {
    addBlock: function(obj) {
        var block, instructions, endedHandler, practiceParameters, onPreview;
        // detect "naked block" vs. object with block info
        if (typeof(obj.run) === 'function' || typeof(obj) === 'function') {
            // naked block cases: 
            // naked blocks are either objects with a .run() method (first case)
            // or functions themselves (which are called by Experiment.nextBlock()
            // and return a block object)
            block = obj;            
        } else {
            // block + parameters objects, with fields:
            block = obj['block'];
            instructions = obj['instructions'];
            endedHandler = obj['endedHandler'];
            practiceParameters = obj['practiceParameters'];
            // show block during preview?
            onPreview = typeof(obj['onPreview']) === 'undefined' ?
                false :
                obj['onPreview'];
            showInTest = typeof(obj['showInTest']) === 'undefined' ?
                true :
                obj['showInTest'];
        }
        
        // add onEndedBlock handler function to block (block object MUST
        // call its onEndedBlock method  when it has truly ended...)
        var _self = this;
        block.onEndedBlock =
            typeof(endedHandler) === 'undefined' ?
            function() {_self.nextBlock();} :
            endedHandler;
        // and link back to this experiment object to block object...
        block.parent = _self;
        // add block object and its associated instructions to the blocks array
        if (this.urlparams['mode'] == 'test' && showInTest == false) {
        }
        else {
            this.blocks.push({block: block,
                              instructions: instructions,
                              practiceParameters: practiceParameters && practiceParameters.substring ?
                              {instructions: practiceParameters} : practiceParameters,
                              onPreview: onPreview}); // gracefully handle bare instructions strings
        }
    },

    nextBlock: function() {
        // pull out block object holder, but don't increment block counter yet
        scroll(0,0);
        var this_block = this.blocks[this.blockn];
        if (typeof(this_block) === 'undefined') {
            // no more blocks, so finish up
            this.wrapup();
        } else {
            // check for preview mode, and stop if not ready.
            if (e.previewMode && !this_block.onPreview) {
                $("#continue").hide();
                $("#instructions").html('<h3>End of preview </h3><p>You must accept this HIT before continuing</p>').show();
                return false;
            }
            
            // if the block is given as a function, evaluate that function to create real block
            if (typeof this_block.block === 'function') {
                // functions should take a callback as first argument.
                this_block.blockfcn = this_block.block;
                // ... and return a block object.
                this_block.block = this_block.blockfcn(this_block.block.onEndedBlock);
            }

            _curBlock = this_block.block;
            var _self = this;
            
            // then check to see if practice mode is needed.
            if (typeof this_block.practiceParameters !== 'undefined') {
                // if yes, do practice mode, with a call back to run the block for real
                this_block.block.practice(this_block.practiceParameters,
                                          function() {_self.runBlock();});
            } else {
                // otherwise, run the block for real.
                this.runBlock();
            }
        }
            
    },

    // method to actually RUN the current block, showing optional instructions if they're provided
    runBlock: function() {
        var this_block = this.blocks[this.blockn++];
        var _self = this;

        if (typeof(this_block.instructions) !== 'undefined') {
            // if there are instructions...
            // show them, with a continue button
            $("#instructions").html(this_block.instructions).show();
            continueButton(function() {
                               $("#instructions").hide();
                               //this_block.block.run();
                               //_curBlock = this_block.block;
                               var _onend = this_block.block.onEndedBlock;
                               this_block.block.onEndedBlock = function(){
                                $("#instructions").show();
                                _onend && _onend();
                                };
                               this_block.block.run();
                           });
        } else {
            // ...otherwise, just run the block.
            this_block.block.run();
        }
    },

    init: function() {
        this.blockn = 0;

        // read in URL parameters
        this.urlparams = gupo();

        // get assignmentID and populate form field
        $("#assignmentId").val(this.urlparams['assignmentId']);
        // record userAgent
        $("#userAgent").val(navigator.userAgent);
        $("#speaker").val(this.urlparams['speaker'])
        $("#condition").val(this.urlparams['condition'])
        $("#list_num").val(this.urlparams['list'])
        $("#set").val(this.urlparams['set'])
        
        // format consent form div with appropriate link to consent form.
        this.consentFormDiv = this.consentFormDiv.format(this.rsrbConsentFormURL);

        // set up form for end of experiment with demographic and other info
        // load demographic survey into div in form
        var rsrbNum = this.rsrbProtocolNumber;
        // load audio equipment/comment survey into div in form
        $('form#mturk_form')
            .append($('<div id="endForm" class="survey"></div>')
                    //.load('js-adapt/audio_comments_form.html #endForm > *'));
                    .load('surveys/priming_survey.html #endForm > *'));
        $('form#mturk_form')
            .append($('<div id="rsrb" class="survey">')
                    .load('js-adapt/rsrb_survey.html #rsrb > *', function() {
                        // set protocol number
                        $('input[name="rsrb.protocol"]:hidden').val(rsrbNum);
                        if (console) console.log($('input[name="rsrb.protocol"]').val());
                    }));
        
        // detect whether the browser can play audio/video and what formats
        vidSuffix =
            Modernizr.video.webm ? '.webm' :
            Modernizr.video.h264 ? '.mp4' :
            '';
        audSuffix =
            Modernizr.audio.wav == 'probably' ? '.wav' :
            Modernizr.audio.ogg == 'probably' ? '.ogg' :
            Modernizr.audio.mp3 == 'probably' ? '.mp3' :
            '';
        var IE = (!! window.ActiveXObject && +(/msie\s(\d+)/i.exec(navigator.userAgent)[1])) || NaN;
        console.log(IE);
        if (IE < 9) {
            $("#oldBrowserMessage").show();
            $("#instructions").hide();
            $("#continue").hide();
            return false;
        }
        // check for video and audio support, and if it's missing show a message
        // with an explanation and links to browser download websites
        if (vidSuffix && audSuffix) {
            $("#oldBrowserMessage").hide();
            $("#instructions").show();
        } else {
            $("#oldBrowserMessage").show();
            $("#instructions").hide();
            $("#continue").hide();
            return false;
        }

        var cookie = readCookie('bradlowExp1');
        if (cookie) {
            $("#instructions").hide();
            $("#failMessage").show();
            return false;
        }



        
    },

    wrapup: function(why) {
        createCookie('bradlowExp1',1,14);
     
        if (typeof(why)==='undefined') {
            // success
            // no error reported to callback
            $("#passCalibration").val("passed");
            $("#instructions").html("<h3>Thanks for participating!</h3>" +
                                    "<p>That's the end of the experiment!  Just a few more things for you to answer.</p>")
            .show();
           
            continueButton(mturk_end_surveys_and_submit);
        // mturk_end_surveys_and_submit() is a function in js-adapt/mturk-helpers.js
        // which steps through the demographics/audio equipment surveys and then submits.
        } else {
            // error?
            // any parameter not undefined is assumed to be an error, so record it and then wrap up.
            $("#passCalibration").val("failed");
            $("#experimentStatus").append("wrapup called: " + why + "<br />");
            $("#errors").val($("#errors").val() + why + respDelim);
            $("#instructions").html("<h3>Experiment is over</h3>" +
                                    "<p>Unfortunately, we were not able to calibrate the experiment to your hearing and audio system, and this is the end of the experiment.  If you have any comments, please write them in the box below before submitting this HIT.  Thank you for participating.</p>")
                .show();
        
        continueButton(mturk_end_surveys_and_submit_error);
        }
        
    }
};


////////////////////////////////////////////////////////////////////////////////
// Some other little block implementations

// show instructions, wait for continue button press
function InstructionsBlock(instructions) {
    this.instructions = instructions;
    this.onEndedBlock = function() {return this;};
}

InstructionsBlock.prototype = {
    run: function() {
        $("#instructions").html(this.instructions).show();
        var _self = this;
        continueButton(function() {
                           $("#instructions").hide();
                           _self.onEndedBlock();
                       });
    }
};

// show instructions with subsections which open and close
// argument instrObj should be an object with two fields:
//   instrObj.title, text to be shown as a (sticky) title
//   instrObj.mainInstructions, HTML/text that will always appear (sticky)
//   instrObj.subsections, an array with the subsections.
//     each subjects must have fields for the content of the instructions, and the title
//     can also have "checkbox text"
//     can have "optional" flag
function InstructionsSubsectionsBlock(instrObj) {
    this.title = typeof(instrObj.title) === 'undefined' ? 'Experiment instructions' : instrObj.title;
    this.mainInstructions = instrObj.mainInstructions;
    this.subsections = instrObj.subsections;
    this.logoImg = instrObj.logoImg;
    this.instrImg = instrObj.instrImg;
    this.instrStyle = instrObj.instrStyle;
    this.buttonInstructions = instrObj.buttonInstructions;
    this.beginMessage = instrObj.beginMessage;
    this.exptInstructions = instrObj.exptInstructions; // true means that this instruction block is the Experiment Instruction at the beginning of the experiment, not instruction for a section
    this.onEndedBlock = function() {return this;};
}

InstructionsSubsectionsBlock.prototype = {
    run: function() {
        // clear previous content
        $("#instructions").html('');        
        
        // add logo if specified
        if (typeof(this.logoImg) !== 'undefined') {
            $('<img />')
                .attr('src', this.logoImg)
                .appendTo('#instructions')
                .wrap('<div id="logo"></div>');
        }

        // add title
        $("<h2></h2>")
            .addClass('instructionsTitle instrSubsContent')
            .html(this.title)
            .appendTo("#instructions");

        // add "sticky" main instructions
        if (typeof(this.mainInstructions) !== 'undefined' ) {
            $("<div></div>")
                .addClass('mainInstructions instrSubsContent')
                .append($.map([].concat(this.mainInstructions), function(instp) {
                                  return('<p>' + instp + '</p>');
                              }))
                .appendTo("#instructions");
        }
        
        // add an image to illustrate instructions if specified
        if (typeof(this.instrImg) !== 'undefined') {
            $('<img />')
                .attr('src', this.instrImg)
                .appendTo('#instructions')
                .wrap('<div id='+this.instrStyle+'></div>');
        }

        // add subsections
        // first add contianing unordered list
        var instList = $("<ul></ul>")
            .addClass('instructionlist')
            .appendTo('#instructions');

        // add final div w/ end instructions button
        var finalLi = $("<li></li>").addClass('instructionlistitem').attr('id', 'endInstructions')
            .append('<h3>'+this.beginMessage+'</h3>')
            .append($('<div></div>')
                    .addClass('listcontent')
                    .append('<p>Press the green box below to continue. Make sure you understand all the instructions above.</p>')
                    .append('<button type="button" id="endinstr">'+this.buttonInstructions+'</button>'))
            .appendTo(instList);
        


        // iterate over subsections, parsing, formatting, and adding each
        if (this.exptInstructions){  
        $.each(this.subsections, function(i) {
                   // [object is referred to w/ this inside $.each]
                   // check to make sure this isn't a "finally": 
                   var isFinally = typeof(this.finallyInfo) !== 'undefined' && this.finallyInfo;
                   // create li element to hold this subsection
                   var thisLi = $("<li></li>").addClass('instructionlistitem');
                   // add title element
                   $("<h3></h3>").text(this.title).appendTo(thisLi);
                   // create continue element (checkbox w/ label if provided, otherwise generic button)
                   var contElem =
                       isFinally ? '' : 
                       typeof(this.checkboxText)==='undefined'
                       ? '<button type="button" class="instructionbutton">Take me to the next section</button>'
                       : '<p class="instructioncheckbox"><input type="checkbox" />' + this.checkboxText + '</p>';
                   // create content.
                   // first, coerce to array.  this wraps naked strings and does nothing to arrays
                   var contentArr = [].concat(this.content);
                   // for each piece of the content, parse and add.
                   // pieces can be naked strings or objects with key-value pairs (subtitle and content)
                   var contentHTML = $.map(contentArr, function(item) {
                                                // check to see if it has subtitle and content attributes
                                                if (typeof(item.content) !== 'undefined' && typeof(item.subtitle) !== 'undefined') {
                                                    // if so, wrap in h4 and p
                                                    return('<h4>' + item.subtitle + '</h4>' +
                                                           '<p>' + item.content + '</p>');
                                                } else if (typeof(item) === 'function') {
                                                    // if this item is a function, evaluate and return the results
                                                    return(item());
                                                } else {
                                                    // if not, just wrap in p
                                                    return('<p>' + item + '</p>');
                                                }
                                            });

                   // concatenate everything together in this list item
                   $("<div></div>")
                       .addClass('listcontent')
                       .append(contentHTML)
                       .append(contElem)
                       .appendTo(thisLi);
                   
                   // add to list parent element
                   if (isFinally) {
                       // if this is a "finally" element, add after final item
                       $(thisLi).addClass('finallyInfo').appendTo(instList);
                   } else {
                       // if not (aka normal instructions) add before
                       $(instList).children('#endInstructions').before(thisLi);
                   }
               });
        }    

        // start by hiding all listcontent divs
        $('div.listcontent').css('display', 'none');

        // set up interaction behaviors:
        // clicking subsection header toggles content display display
        $('li.instructionlistitem > h3').on('click', function(){
                                                $(this).parent().children('.listcontent').toggle(500);
                                            });

        // clicking the "next" button hides the current section and shows the next
        // click on checkbox advances to next item
        $('.instructionlist :checkbox, .instructionbutton')
            .on('click', function(e){
                    e.stopPropagation();
                    $(this).parents('.listcontent').hide(500);
                    $(this).parents('li.instructionlistitem')
                       .children('h3')
                       .css('color', 'black');
                    $(this).parents('.instructionlistitem').next().children('.listcontent')
                        .show(500, function(){
                                  var pos = $(this).parents('.instructionlistitem').offset();
                                  $('html,body').animate({scrollTop: pos.top}, 500);
                              });
                });
        
        // apply clicks anywhere in the checkbox label to the checkbox.
        $('#instructions p.instructioncheckbox').on('click', function(e){
                              $(this).children('input').first().click();
                          });

        // when "end instructions" button is clicked, validate everything
        if (this.exptInstructions){ 
        var _self = this;
        $('button#endinstr')
            .click(function(){
                         
                       var instructionsDone = true;
                       // look for uncheck boxes, and change their parent h3 elements to red
                       // if there are any, length will be > 0, so throw an alert
                      
                       var uncheckedItems = $('#instructions input:checkbox:not(:checked)')
                           .parents('li.instructionlistitem')
                           .children('h3')
                           .css('color', 'red');
                       if (uncheckedItems.length)
                       {
                           alert('Please read and check the necessary items before you continue.');
                           $(uncheckedItems).parents('.listcontent').show();
                       } else {
                            if (e.previewMode) {
                                alert('End of preview. You must accept this HIT before continuing.');
                                return;
                            }
                            else{
                         /*       if ($('.allCorrectAns.true').length !== 1) {
                                    createCookie('soundCheckCookie','failed',7);
                                    $("#instructions").hide();
                                    $("#failMessage").show();
                                    return false;
                                }
                                */
                                    _self.onEndedBlock();
                            }
                       }

            });
         }

        else if (this.exptInstructions === false){
        var _self = this;
        $('button#endinstr')
            .click(function(){
                    _self.onEndedBlock();});
        }

    }
}


////////////////////////////////////////////////////////////////////////////////
// GUI/helper things

// display a "continue" button which executes the given function
function continueButton(fcn, validateFcn) {
    $("#continue")
        .show()
        .unbind('click.cont')
        .bind('click.cont', function() {
                  if (typeof(validateFcn) !== 'function' || 
                      typeof(validateFcn) === 'function' && validateFcn()) 
                  {
                      $(this).unbind('click.cont');
                      $(this).hide();
                      fcn();
                  }
              });
}

function continueButtonHidden(fcn, validateFcn) {
    $("#continue")
        .hide()
        .unbind('click.cont')
        .bind('click.cont', function() {
                  if (typeof(validateFcn) !== 'function' || 
                      typeof(validateFcn) === 'function' && validateFcn()) 
                  {
                      $(this).unbind('click.cont');
                      $(this).hide();
                      fcn();
                  }
              });
}
// collect a keyboard response, with optional timeout
function collect_keyboard_resp(fcn, keys, to, tofcn) {
    var namespace = '._resp' + (new Date()).getTime();
    $(document).bind('keyup' + namespace, function(e) {
        if (!keys || keys.indexOf(String.fromCharCode(e.which)) != -1) {
            $(document).off(namespace);
            fcn(e);
            e.stopImmediatePropagation();
            return false;
        } else {
            return true;
        }
    });

    if (typeof tofcn !== 'undefined') {
        $(document).off('to' + namespace, function() {
                             $(document).off(namespace);
                             tofcn();
                         });
    }

    if (typeof to !== 'undefined') {
        // timeout response after specified time and call function if it exists
        setTimeout(function(e) {
                       $(document).trigger('to' + namespace);
                       $(document).off(namespace);
                   }, to);
    }
}

