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

var RESPDELIM = '|';

function Experiment(obj) {
    this.blocks = [];
    this.blockn = undefined;
    this.cookie = obj.cookie;
    this.survey = obj.survey; //TODO: make this a list of surveys?
    this.urlparams = gupo();
    this.consentFormDiv = '<div id="consent">By accepting this HIT, you confirm that you have read and understood the <a target="_blank" href="' + obj.consentForm +
        '">consent form</a>, that you are willing to participate in this experiment, and that you agree that the data you provide by participating can be used in scientific publications (no identifying information will be used). Sometimes it is necessary to share the data elicited from you &mdash; including sound files &mdash; with other researchers for scientific purposes (for replication purposes). That is the only reason for which we will share data and we will only share data with other researchers and only if it is for non-commercial use. Identifying information will <span style="font-weight:bold;">never</span> be shared (your MTurk ID will be replaced with an arbitrary alphanumeric code).</div>'
    //Record random string as identifier
    this.randomID = randomString(16, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
    this.sandboxmode = checkSandbox(this.urlparams);
    this.previewMode = checkPreview(this.urlparams);
}


Experiment.prototype = {
    init: function() {
        this.blockn = 0;
        //TODO: detect really old browsers and exclude them    
        
        //Check if participant has already done the experiment based on cookies
        if (readCookie(this.cookie)) {
            $("#instructions").hide();
            $("#failMessage").show();
            return false;
        }
        $("#instructions").show();
        
        //Load up the post-experiment survey(s)
        $('form#mturk_form')
            .append($('<div id="endForm" class="survey"></div>')
                    .load(this.survey+' #endForm > *'));

        //Append demographic survey 
        $('form#mturk_form')
            .append($('<div id="rsrb" class="survey">')
                    .load('surveys/rsrb_survey.html #rsrb > *'));

        //Record all url param fields
        for (param in this.urlparams) {
            $('<input>').attr({
                type: 'hidden',
                id: param,
                name: param,
                value: this.urlparams[param]
            }).appendTo('form#mturk_form');
        }

        //Record other fields
        $("#assignmentId").val(this.urlparams['assignmentId']);
        $("#randomID").val(this.randomID);
        $("#userAgent").val(navigator.userAgent);
    },

    //Unmodified
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
            block.randomID = this.randomID;
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


        //If url parameter has mode=test block has showInTest:false, don't add the block
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

    //unmodified
    nextBlock: function() {
        // pull out block object holder, but don't increment block counter yet
        var this_block = this.blocks[this.blockn];
        if (typeof(this_block) === 'undefined') {
            // no more blocks, so finish up
            this.wrapup();
        } else {
            // check for preview mode, and stop if not ready.
            if (this.previewMode && !this_block.onPreview) {
                $("#continue").hide();
                $("#instructions").html('<h3>End of preview </h3><p>You must accept this HIT before continuing</p>').show();
                return false;
            }
            if (readCookie(this.cookie)) {
                $("#instructions").hide();
                $("#failMessage").show();
                return false;
            }
            
            // if the block is given as a function, evaluate that function to create real block
            if (typeof this_block.block === 'function') {
                // functions should take a callback as first argument.
                this_block.blockfcn = this_block.block;
                // ... and return a block object.
                this_block.block = this_block.blockfcn(this_block.block.onEndedBlock);
            }

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
    // //Unmodified
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
                               this_block.block.run();
                           });
        } else {
            // ...otherwise, just run the block.
            this_block.block.run();
        }
    },


    wrapup: function(why) {
        //Create cookie to show experiment is finished, but only do it if we're not in test mode
        var isTest = this.urlparams['mode'];
        if (this.urlparams['mode'] != 'test' && this.cookie != null) {
            createCookie(this.cookie, 'COMPLETED', 100);
        }
    
        //Unmodified 
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


