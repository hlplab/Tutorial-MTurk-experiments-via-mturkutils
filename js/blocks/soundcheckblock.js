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

function SoundcheckBlock(params) {
    if (typeof(params['instructions']) !== 'undefined') {
        this.instructions = params['instructions'];        
    }
    
    if (typeof(params['items']) !== 'undefined') {
        this.items = params['items'];
    }
}

SoundcheckBlock.prototype = {
    parentDiv: '#textContainer',
    items: undefined,
    instructions: '<h3>Sound check</h3>' + 
        '<p>You should complete this experiment in a quiet environment without any distractions, using headphones (preferred) or speakers set to the highest comfortable volume.</p>' +
        '<p>To ensure that your audio is working properly, you must complete the following sound test. Click on each button below to play a word, and type the words in the boxes provided. You can play the soundfiles as many times as you need to to set your volume to the right level. If you enter one of the words incorrectly, you will be prompted to retry until you have entered them correctly.</p>',
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
        // for each item, create list item
        $.map(this.items, function(item) {
                  var itemLI = $('<li class="soundcheckItem"></li>').attr('item', item.answer);
                  var playButton = $('<input type="button" class="soundcheckPlay" value="&#9658;"></input>');
                  var answerText = $('<input type="text" class="soundcheckAnswer"></input>');
                  var wordAudio = $('<audio></audio>')
                      .attr('src', item.filename)
                      .addClass('soundcheckAudio');
                  $(itemLI)
                      .append(playButton)
                      .append(answerText)
                      .append(wordAudio)
                      .appendTo($('#soundcheckItems'));
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
            .on('input', function() {
                    // get correct answer.
                    var correctAns = $(this).parent().attr('item');
                    // check for match
                    if ($(this).val().toLowerCase() == correctAns) {
                        $(this).addClass('correct');
                    } else {
                        $(this).removeClass('correct');
                    }
                    // check validation box if all correct
                    // (0 is false-y and >0 is truth-y, so negating length of
                    // incorrect items gives an "all okay" truth value)
                    $('#soundcheckValidationFlag')
                        .prop('checked', 
                              (! $('input.soundcheckAnswer:not(.correct)').length));
                })
            .on('change', function() {
                    // change triggers after focus is changed (I think)
                    // mark incorrect ones RED after change if they are wrong
                    if (! $(this).hasClass('correct')) {
                        $(this).addClass('fixme');
                    }
                })
            .on('focus', function() {
                    // remove read "fix me" background on focus
                    $(this).removeClass('fixme');
                });

        // return top-level div to allow chaining/embedding
        return($('#soundcheck'));

    },
    check: function() {
        // make sure all are correct (look for ones without "correct" class)
        if ($('input.soundcheckAnswer:not(.correct)').addClass('fixme').length) {
            return(false);   
        } else {
            return(true);
        }
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
    }
};
