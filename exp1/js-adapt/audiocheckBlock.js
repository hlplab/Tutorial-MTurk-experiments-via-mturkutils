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
 */

// Block to carry out a sound check by playing one or more sound files and checking
// transcriptions.  Takes input of the form { items:
// [ 
//   { 
//     filename: 'sound1',
//     answer: 'cabbage',
//   },
//   { 
//     filename: 'sound2',
//     answer: 'flower', 
//   }
// ]
//

// set by Experiment.init() (in experimentControl2.js).
var audSuffix;

function AudiocheckBlock(params) {
    if (typeof(params['instructions']) !== 'undefined') {
        this.instructions = params['instructions'];        
    }
    
    if (typeof(params['items']) !== 'undefined') {
        this.items = params['items'];
    }
}

AudiocheckBlock.prototype = {
    parentDiv: '#textContainer',
    items: undefined,
    instructions: '<h3>Sound check</h3>' + 
        '<p>You should complete this experiment in a quiet environment without any distractions, using headphones (preferred) or speakers set to the highest comfortable volume.</p>' +
        '<p>To ensure that your audio is working properly, you must complete the following sound test. Click on the button to play a nonsense word, and select the sound that <strong>best</strong> matches the word you heard. You may hear the same sound more than once.</p>',
    init: function() {
        var _self = this;
        // create DOM elements (container div, instructions div, and items list)
        $('<div></div>')
            .attr('id', 'soundcheck')
            .appendTo(this.parentDiv);
        $('<div></div>')
            .attr('id', 'soundcheckInstructions')
            .html(this.instructions)
            .appendTo('#soundcheck');
        $('<ol></ol>').attr('id', 'soundcheckItems').appendTo('#soundcheck');
        // add validation checkbox for easy validation checking
        $('<input type="checkbox" />')
            .css('display', 'none')
            .addClass('validation')
            .attr('id', 'soundcheckValidationFlag')
            .appendTo('#soundcheck');
        $('<div></div>')
            .addClass('allCorrectAns')
            .appendTo('#soundcheck')
        // for each item, create list item
        var count = 1;
        $.map(this.items, function(item) {
                  //to creat groups so that only one radio button can be checked
                  var tmp_class= 'tmpclass' + Math.floor(Math.random() * 1000000);
                  var itemLI = $('<li class="soundcheckItem"></li>').attr('item', item.answer);
                  var playButton = $('<input type="button" class="soundcheckPlay" value="&#9658;"></input><br><br>');
                  //var answerText = $('<input type="text" class="soundcheckAnswer"></input>');
                  var answerButtons = $('<input type="radio" name='+tmp_class+' value="ABA" class="soundcheckAnswer">ABA</input>' +
                                        '<input type="radio" name='+tmp_class+' value="ACHO" class="soundcheckAnswer">ACHO</input>'+
                                        '<input type="radio" name='+tmp_class+' value="ADA" class="soundcheckAnswer">ADA</input>'+
                                        '<input type="radio" name='+tmp_class+' value="AGO" class="soundcheckAnswer">AGO</input>'+
                                        '<input type="radio" name='+tmp_class+' value="AKI" class="soundcheckAnswer">AKI</input><br>'+
                                        '<input type="radio" name='+tmp_class+' value="ANO" class="soundcheckAnswer">ANO</input>'+
                                        '<input type="radio" name='+tmp_class+' value="ALU" class="soundcheckAnswer">ALU</input>'+
                                        '<input type="radio" name='+tmp_class+' value="ASI" class="soundcheckAnswer">ASI</input>'+
                                        '<input type="radio" name='+tmp_class+' value="ASHI" class="soundcheckAnswer">ASHI</input>'+
                                        '<input type="radio" name='+tmp_class+' value="ALU" class="soundcheckAnswer">AWU</input>');
                  var wordAudio = $('<audio></audio>')
                      .attr('src', item.filename+audSuffix)
                      .addClass('soundcheckAudio');
                  $(itemLI)
                      .append(playButton)
                      .append(answerButtons)
                      .append(wordAudio)
                      .appendTo($('#soundcheckItems'))
                  if (count > 1) {
                    $(itemLI).hide()
                  }
                  count = count + 1;
              });

        // explicitly preload audio so they will play more than once.
        $('audio.soundcheckAudio').each(function() {this.load();});
        
        // listen for button clicks and play sound
        $('input.soundcheckPlay')
            .click(function() {
                       $(this).siblings('audio.soundcheckAudio')[0].play();
                   });

        // validate responses
        $('input.soundcheckAnswer')
            .on('change', function() {
                    // get correct answer.
                    var correctAns = $(this).parent().attr('item');
                    correctAns = correctAns.replace(/[0-9]/g, '');
                    $(this).parent().hide();
                    $(this).parent().next().slideDown();
                    // check for match
                    if ($(this).val().toLowerCase() == correctAns) {
                        $(this).parent().addClass('correct');
                    } else {
                        $(this).parent().removeClass('correct');
                    }
                    //count up number of checked buttons
                    var numItems = $('#soundcheckItems').children().length;
                    if ($('.soundcheckAnswer:checked').length === numItems) {
                        $('#soundcheckValidationFlag').prop('checked', true);
                    }
                    else {
                        $('#soundcheckValidationFlag').prop('checked', false);
                    }
                    //see if they got the answers correct
                    if ($('.soundcheckItem.correct').length === numItems) {
                        $('.allCorrectAns').addClass('true');
                    } else {
                        $('.allCorrectAns').removeClass('true');
                    }

                });
        // return top-level div to allow chaining/embedding
        return($('#soundcheck'));

    },
    check: function() {
    },
    endBlock: function() {
        $('div#soundcheck').hide();
        this.onEndedBlock();
    },
    run: function() {
        this.init();
        var _self = this;
        continueButton(function() {_self.endBlock();},
                       function() {return(_self.check());});
                       //function() {return(_self.check());});
    }
};

function createCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name,"",-1);
}
