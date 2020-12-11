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

//
// This method decodes the query parameters that were URL-encoded
//
function decode(strToDecode)
{
  var encoded = strToDecode;
  return unescape(encoded.replace(/\+/g,  " "));
}

////////////////////////////////////////////////////////////////////////////////
// Some handlers for specific URL parameters
// global variable for resp keys map
var respKeyMap;

function setRespKeys(params, categories) {
    // default to B/D categories
    if (typeof categories === 'undefined') {
        categories = ['B', 'D'];
    }
    
    if (params['respKeys']) {
        //var keys = gup('respKeys');
        var keys = params['respKeys'];
        // value should be of the form Bkey,Dkey
        if (/^[A-Z],[A-Z]$/.exec(keys.toUpperCase()) && keys[0] != keys[2]) {
            keys = keys.toUpperCase().split(',');
            respKeyMap = {};
            respKeyMap[keys[0]] = categories[0];
            $("#bKey").html(keys[0]);
            respKeyMap[keys[1]] = categories[1];
            $("#dKey").html(keys[1]);
            if (console) {console.log('Setting response key map to ' + keys[0] + '-->' + categories[0] +
                                      ', ' + keys[1] + '-->' + categories[1]);}
        } else {
            $("#errors").val($("#errors").val() + "badRespKeys");
            if(console) {console.log("bad response key parameter: " + gup('respKeys'));}
        }
    }
}

var previewMode;
function checkPreview(params) {
    if (params['assignmentId'] == "ASSIGNMENT_ID_NOT_AVAILABLE") {
        previewMode = true;
        return true;
    } else {
        return false;
    }
}

var sandboxMode;
function checkSandbox(params) {
    if (document.referrer && ( document.referrer.indexOf('workersandbox') != -1) ) {
        $("#mturk_form").attr("action", "https://workersandbox.mturk.com/mturk/externalSubmit");
        sandboxMode = true;
        return true;
    } else {
        return false;
    }
}

var debugMode;
function checkDebug(params) {
    if (params['debug']) {
        debugMode = true;
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

// boilerplate:
// UR logo
var logoDiv = '<div id="logo"><img src="logo.png" /></div>';

// consent and consent form
// NOW MOVED TO EXPERIMENT CONTROL
var consentFormDiv = '<div id="consent">By accepting this HIT, you confirm that you have read and understood the <a target="_blank" href="http://www.hlp.rochester.edu/consent/RSRB45955_Consent_2014-02-10.pdf">consent form</a>, that you are willing to participate in this experiment, and that you agree that the data you provide by participating can be used in scientific publications (no identifying information will be used). Sometimes it is necessary to share the data elicited from you &mdash; including sound files &mdash; with other researchers for scientific purposes (for replication purposes). That is the only reason for which we will share data and we will only share data with other researchers and only if it is for non-commercial use. Identifying information will <span style="font-weight:bold;">never</span> be shared (your MTurk ID will be replaced with an arbitrary alphanumeric code).</div>';

// technical difficulty
var techDiffDiv = '<p id="techdifd">Sometimes it can happen that technical difficulties cause experimental scripts to freeze so that you will not be able to submit a HIT. We are trying our best to avoid these problems. Should they nevertheless occur, we urge you to contact us.</p>';

// follow-up and blog link
var blogLinkDiv = '<div id="blogLink">If you are interested in hearing how the experiments you are participating in help us to understand the human brain, feel free to subscribe to our <a href="http://hlplab.wordpress.com/">lab blog</a> on which we announce new findings. Note that typically about one year passes before an experiment is published.</div>';


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
                      //Log the results for them
                      $('#mturk_form #rsrb').hide();
//                      var header = "partOfExp, trialNumber, soundFile, word, keyCode, response, rtStart, rtEnd, rt <br>"; 
  //                    var myAns = $("#trainingResp").val().replace(';','<br>');
    //                  $('#live-answers').html(header + myAns);
                      $("#mturk_form").submit();
                 });
            }
        }
    });
}
// python style string formatting.  Replace {0} with first argument, {1} with second, etc.
// DEPRECATED HERE: use version in utilities.js
String.prototype.format = function() {
  if (console) console.log('mturk_helpers::format() is DEPRECATED: use version in utilities.js');
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number]
      : match
    ;
  });
};
