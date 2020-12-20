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

//
// This method Gets URL Parameters (GUP)
//
function gup( name )
{
  var regexS = "[\\?&]"+name+"=([^&#]*)";
  var regex = new RegExp( regexS );
  var tmpURL = window.location.href;
  var results = regex.exec( tmpURL );
  if( results == null )
    return "";
  else
    return results[1];
}

// Get URL Parameters as Object (GUPO)
function gupo() {
    var urlParams = {};
    var e,
    a = /\+/g,  // Regex for replacing addition symbol with a space
    r = /([^&=]+)=?([^&]*)/g,
    d = function (s) { return decodeURIComponent(s.replace(a, " ")); },
    q = window.location.search.substring(1);
    
    while (e = r.exec(q))
        urlParams[d(e[1])] = d(e[2]);

    return urlParams;
}

/*Check for the state of the experiment*/
function checkPreview(params) {
    if (params['assignmentId'] == "ASSIGNMENT_ID_NOT_AVAILABLE") {
        return true;
    } else {
        return false;
    }
}

function checkSandbox(params) {
    if (document.referrer && ( document.referrer.indexOf('workersandbox') != -1) ) {
        $("#mturk_form").attr("action", "https://workersandbox.mturk.com/mturk/externalSubmit");
        return true;
    } else {
        return false;
    }
}

function checkDebug(params) {
    if (params['debug']) {
        $("#buttons").show();
        $("#mturk_form").addClass('debug').show().children().show();
        $("#comments").hide();
        
        // some debugging shortcuts:
        $("#buttons").append("<input type='button' value='short blocks' " +
                             "onclick='expTrials=[4,8];'" +
                             "></button>");
        $("#buttons").append("<input type='button' value='skip calibration' " +
                             "onclick='generateFakeData();" + 
                             "$(document).trigger(\"endCalibrationBlock\");'" +
                             "></button>");
        return true;
    } else {
        return false;
    }

}

function getURLParamList(urlparams) {
    var urlparamlist = [];
    for (param in urlparams) {
        if (!(param in ['debug', 'assignmnetId'])) {
            urlparamlist.push(urlparams[param]);
        }
    }
    return urlparamlist;
}

// function to run through RSRB demographic and audio/comments forms and then submit
var mturk_end_surveys_and_submit = function() {
    $("#instructions").hide();
    $('.question_section').not("[style='display:none']" ).show();
    $('.question_section > *').not("[style='display:none']" ).show();
    $('#endForm').show();
    //to cycle through post questions 
    var visibleBox;
    var currentId;
    visibleBox = $('#endForm .question_section:visible');
    currentId = visibleBox.attr("id");

    $('input').click(function() {
        var nextToShow=$(visibleBox).next('.question_section:hidden');                       
        if ($(this).attr('class') == 'moveOn') {
            if (nextToShow.length > 0) {
                visibleBox.hide();
                nextToShow.show();
                visibleBox = nextToShow;
                currentId = visibleBox.attr("id");
            } else {
                $('#mturk_form #endForm').hide();
                $('#mturk_form #rsrb').show();
                $('#mturk_form #rsrb *').show();
                continueButton(function() {
                      $('#mturk_form #rsrb').hide();
                      $("#mturk_form").submit();
                 });
            }
        }
    });
}
