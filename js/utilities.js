/*Read and create cookies*/
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

//Generates a random String of a given length using the provided characters.
function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
        return result;
}


/*Get the relevant column that matched the column header*/
function getFromPapa(parsed, columnHeader) {
    var colVals = [];
    for (var i=0; i < parsed.data.length; i++) {
        colVals.push(parsed.data[i][columnHeader]);
    }
    return colVals;
}

/* Randomize order of stimuli */

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [rev. #1]
//  shuffle the input array
var shuffle = function(v){
    for(var j, x, i = v.length; i; j = parseInt(Math.random() * i), x = v[--i], v[i] = v[j], v[j] = x);
    return v;
};
// function to pseduo-randomize stimuli lists.  takes either vector of repetitions for
// each item, or (scalar) number of repetitions for each item and the length of the continuum.
function pseudoRandomOrder(reps, n, method) {
    // if reps is specified as a constant, convert to an array
    if (typeof(reps) === "number" || reps.length == 1) {
        if (typeof(n) !== "undefined") {
            reps = (function(N) {var x=[]; for (var i=0; i<N; i++) {x[i] = reps;}; return(x);})(n);
        } else {
            throw "Must provide either vector of repetitions or number of stimuli";
        }
    }

    // method of pseudorandomization
    if (typeof(method) === 'undefined') {
        throw "Must provide a method for randomization. Else specfify 'dont_randomize' as your randomization method";
    } 
    
    //If we want to shuffle completely (no regard for blocks)
    if (method == 'shuffle') {
        // if specifying "shuffle", do a full randomization.
        return randomOrder(reps, n);
    }

    // pseudo-random order for stimuli: create blocks with one of
    // each stimulus, shuffle within each block and shuffle order
    // of blocks (only necessary because of non-uniform repetitions)
    var repsRem = reps.slice(0);
    var block = [];
    var blocks = [];
    do {
        block = [];
        for (var i=0; i<repsRem.length; i++) {
            if (repsRem[i] > 0) {
                block.push(i);
                repsRem[i]--;
            }
        }
        if (method == 'dont_randomize') { 
            blocks.push(block);
        } else {
            // randomize order of stimuli in THIS block
            blocks.push(shuffle(block));
        }
    } while (block.length > 0);
    


    // DON'T RANDOMIZE order of blocks, so that extreme stimuli are guaranteed
    // to be more common early on
    // ...and concatenate each shuffled block to list of trials
    var stims = [];
    switch(method) {
    case 'extreme_early':
        for (var i=0; i<blocks.length; i++) {
            stims = stims.concat(blocks[i]);
        }
        break;
    case 'extreme_late':
        for (var i=blocks.length; i>0; i--) {
            stims = stims.concat(blocks[i-1]);
        }
        break;
    case 'shuffle_blocks':
        blocks = shuffle(blocks);
        for (var i=0; i<blocks.length; i++) {
            stims = stims.concat(blocks[i]);
        }
        break;
    case 'dont_randomize':
        for (var i=0; i<blocks.length; i++) {
            stims = stims.concat(blocks[i]);
        }
        break;
    default:
        if (console) {console.log('ERROR: bad randomization method: ' + method);}
        throw('bad randomization method: ' + method);
    }

    return(stims);
}

// function to create a truly random (shuffled) item order, either from an array
// of repetition numbers or from a uniform number of repetitions and number of items n.
function randomOrder(reps, n) {
    // if reps is specified as a constant, convert to an array
    if (typeof(reps) === "number" || reps.length == 1) {
        if (typeof(n) !== "undefined") {
            reps = (function(N) {var x=[]; for (var i=0; i<N; i++) {x[i] = reps;}; return(x);})(n);
        } else {
            throw "Must provide either vector of repetitions or number of stimuli";
        }
    }

    var itemOrder = [];
    for (var i=0; i<reps.length; i++) {
        for (var j=0; j<reps[i]; j++) {
            itemOrder.push(i);
        }
    }

    return shuffle(itemOrder);
}

// python style string formatting.  Replace {0} with first argument, {1} with second, etc.
String.prototype.format = function() {
  var args = arguments;
  return this.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number]
      : match
    ;
  });
};

function isValidKey(evt) {
        var charCode = (evt.which) ? evt.which : event.keyCode;
        var s = String.fromCharCode(charCode);
        if (s === '"' || s === "'" || s === '\n' || s === '\t' || s === "\r") {
            return false;
        }
        return true;
}
function randomString(length, chars) {
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
        return result;
}
