/*Simplest form of the instruction block.
 * Shows some instructions, and then has the continue button appear after some delay (ms).
 * If no delay is provided, then the continue button will show immediately
 */
function InstructionsBlock(obj) {
    this.instructions = obj.instructions;
    this.continueDelay = obj.continueDelay === 'undefined'? 0 : obj.continueDelay;
    this.onEndedBlock = function() {return this;};
                  
}

InstructionsBlock.prototype = {
    run: function() {
        $("#instructions").html(this.instructions).show();
        var _self = this;
        setTimeout(function(){
            continueButton(function() {
                   $("#instructions").hide();
                   _self.onEndedBlock()
                });
        }, _self.continueDelay);
    }
};


/* Main page instructions: show instructions with subsections which open and close
 * argument instrObj should be an object with two fields:
 * instrObj.title, text to be shown as a (sticky) title
 * instrObj.mainInstructions, HTML/text that will always appear (sticky)
 * instrObj.subsections, an array with the subsections.
     each subjects must have fields for the content of the instructions, and the title
     can also have "checkbox text"
     can have "optional" flag
*/
function InstructionsSubsectionsBlock(instrObj) {
    this.title = typeof(instrObj.title) === 'undefined' ? 'Experiment instructions' : instrObj.title;
    this.mainInstructions = instrObj.mainInstructions;
    this.subsections = instrObj.subsections;
    this.logoImg = instrObj.logoImg;
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

        // add subsections
        // first add contianing unordered list
        var instList = $("<ul></ul>")
            .addClass('instructionlist')
            .appendTo('#instructions');

        // add final div w/ end instructions button
        var finalLi = $("<li></li>").addClass('instructionlistitem').attr('id', 'endInstructions')
            .append('<h3>Begin the experiment</h3>')
            .append($('<div></div>')
                    .addClass('listcontent')
                    .append('<p>Once you press Start, these instructions will disappear, so make sure you understand them fully before you start</p>')
                    .append('<button type="button" id="endinstr">I confirm that I meet the eligibility and computer requirements, that I have read and understood the instructions and the consent form, and that I want to start the experiment.</button>'))
            .appendTo(instList);

        // iterate over subsections, parsing, formatting, and adding each
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
                       if (uncheckedItems.length) {
                           alert('Please read and check the necessary items before you continue.');
                           $(uncheckedItems).parents('.listcontent').show();
                       } else {
                           if (checkPreview(gupo())) {
                                alert('End of preview. You must accept this HIT before continuing.');
                                return;
                           }
                           else {
                                _self.onEndedBlock();
                           }
                       }
                   });

    }
}
