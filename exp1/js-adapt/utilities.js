//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [rev. #1]
//  shuffle the input array
var shuffle = function(v){
    for(var j, x, i = v.length; i; j = parseInt(Math.random() * i), x = v[--i], v[i] = v[j], v[j] = x);
    return v;
};


// repeat x, n times
function repeat(x, n) {
    if (typeof(n) !== "number") {
        throw "Number of reps must be numeric";
    } else {
        var y=Array(n);
        for (var i=0; i<n; i++) {
            y[i] = x;
        }
        return(y);
    }
}

// repeat Array x until length is n, slicing long arrays to make them length n
function repeatToLength(x, n) {
    // put x in an array if it's naked
    x = [].concat(x);
    var y = x;
    while (y.length < n) {
        y = y.concat(x);
    }
    return(y.slice(0,n));
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
        // default to extreme_early
        method = 'extreme_early';
    } else if (method == 'shuffle') {
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
    case 'randomize_each_of_two':
        var totalLength = blocks.length;
        var lengthOneBlock = totalLength / 2.0;
        for (var i=0; i<lengthOneBlock; i++) {
            blocks = shuffle(blocks);
            stims = stims.concat(blocks[i]);
        }
        break;
    default:
        if (console) {console.log('ERROR: bad randomization method: ' + method);}
        throw('bad randomization method: ' + method);
    }

    return(stims);
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
function sanitizeString(str){
    str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim,"");
    return str.trim();
}
var MAP = { '<': '&lt&',
            '>': '&gt&',
            '"': '&quot&',
            ',': '&comma&',
            ';': '&semicol&',
            '\|': '&pipe&',
            '\n':'',
            '\t':'',
            '\r':'',
            "'": '&apos&'};

function escapeHTML(s, forAttribute) {
    return s.replace(forAttribute ? /[<>'"\n\t\r\|;,]/g : /[<>'"\n\t\r\|;,]/g, function(c) {
        return MAP[c];
    });
}

function isValidKey(evt) {
        var charCode = (evt.which) ? evt.which : event.keyCode;
        var s = String.fromCharCode(charCode);
        if (s === '"' || s === "'" || s === '\n' || s === '\t' || s === "\r") {
            return false;
        }
        return true;
}

function getFromPapa(parsed, columnHeader) {
    var colVals = [];
    for (var i=0; i < parsed.data.length; i++) {
        colVals.push(parsed.data[i][columnHeader]);
    }
    return colVals;
}
var levDist = function(s, t) {
    var d = []; //2d matrix
        // Step 1
        var n = s.length;
        var m = t.length;

        if (n == 0) return m;
        if (m == 0) return n;

        //Create an array of arrays in javascript (a descending loop is quicker)
        for (var i = n; i >= 0; i--) d[i] = [];

        // Step 2
        for (var i = n; i >= 0; i--) d[i][0] = i;
        for (var j = m; j >= 0; j--) d[0][j] = j;

        // Step 3
        for (var i = 1; i <= n; i++) {
            var s_i = s.charAt(i - 1);

            // Step 4
            for (var j = 1; j <= m; j++) {

                //Check the jagged ld total so far
                if (i == j && d[i][j] > 4) return n;

                var t_j = t.charAt(j - 1);
                var cost = (s_i == t_j) ? 0 : 1; // Step 5

                //Calculate the minimum
                var mi = d[i - 1][j] + 1;
                var b = d[i][j - 1] + 1;
                var c = d[i - 1][j - 1] + cost;

                if (b < mi) mi = b;
                if (c < mi) mi = c;

                d[i][j] = mi; // Step 6

                //Damerau transposition
                if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
                    d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
                }
            }
        }

        // Step 7
        return d[n][m];
}
