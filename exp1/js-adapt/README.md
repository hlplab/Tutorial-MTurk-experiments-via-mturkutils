# J'Adapt read-me

This is the core set of javascript files for j'adapt, a paradigm for running phonetic adaptation experiments over the internet, in subjects' web browsers.

# How to implement your own paradigm

This code is designed to be flexible and extensible with a bit of Javascript hacking.  Here are a couple of use cases for implementing your own studies

## Labeling task 

**Design** You want to collect 2AFC (possibly nAFC, but hasn't been tested) responses to some audio or video stimuli.

Clone the [demo repository](https://bitbucket.org/dkleinschmidt/mtadapt-demo), and use `expt_template.js` as a skeleton.  Put your stimuli in a subdirectory, and create a `StimuliFileList` object based on the names of the files (as described below).  

If your stimuli filenames are rather repetitive and you feel like writing a few javascript functions, you can specify a `Stimuli` object based on a function that turns a file index (starting at 0) into the corresponding filename string.  See below or `stimuli.js` for some examples.

# Block interfaces

## Specifying stimuli

To specify your stimuli, use a `Stimuli` or `StimuliFileList` object.  The only difference between them is that for a `StimuliFileList` object, you need only provide a list of filenames, the type of the associated media, and (optionally) a prefix (useful for externally hosted files or to save you typing in the local path prefix over and over again).  Each takes a json object as input, described below.  These objects are then passed as input to experimental blocks.

### File formats and browser support

This code uses HTML5 `<audio>` and `<video>` elements to present audio and video stimuli.  I did this because I didn't want to mess around with Flash players, and because standars-based browsers are *the future*.  While the `Stimuli*` objects are designed to abstract away from the actual mess, there's still two technicalities that you do need to worry about.  

1. While it's unlikely to be a problem nowadays, support for these elements requires a good, up-to-date, standards based browser.  The `Experiment` object will check whether or not HTML5 media elements are supported at all, and will can point people towards download pages for up-to-date version of browsers.

2. At this point, there is no single audio or video format which is universally supported.  You'll thus need to **encode all your stimuli in (at least) two different formats**.  I've used webM and mp4 for videos, and wav, ogg, and mp3 (in that order of precedence) for audio.  The `Experiment.init()` code will, with the help of [Modernizr](http://modernizr.com/), automagically check what format the browser supports and load the appropriate versions of all the stimuli, and if you prefer to use different formats, you can edit that bit.  There's a [handy guide](https://developer.mozilla.org/en-US/docs/HTML/Supported_media_formats) on MDN which is an up-to-date list of which formats are compatible with which browsers.  

Nevertheless, you need to encode your stimuli in each of the formats you decide to use. Tools like `ffmpeg` make it possible to script this, but can be a pain to learn/use.  I encourage anyone who's a wizard at these things to contribute better tools!

### Stimuli objects

The format for `Stimuli` input is

* `filenameFormatter`: function which takes stimulus index number (starting at 0) and filename prefix as first and second arguments, and returns the corresponding filename.  For instance, for a "beach"-"peach" VOT continuum that starts at -30ms and goes in 10ms increments with filenames `BEACH-30.wav` etc., you could use the formatter function

        :::javascript
        var beachVOTFormatter = function(n, prefix) {
            return(prefix + 'BEACH' + (10*n - 30));
        };

    Note that the filename formatter should *not* put a suffix on stimulus files, because there isn't a single format that's universally supported.  The experiment code will determine which format to use and append the appropriate suffix.

* `catchFilenameFormatter`: (optional) same as `filenameFormatter` but for catch trials (which need different response).  If you just have one file, give a function which always returns that name.
* `continuum`: an array of "x" values for each stimulus.  The length of this array defines the number of stimuli, and the actual values are used in `CalibrationBlocks` to estimate category boundaries.
* `maxAmbigRange`: array with two continuum values, `[low, high]` which define inclusive interval for category boundaries (only used in `CalibrationBlock`, in order to exclude people with weird or random responses).
* `calibReps`: (soon to be deprecated) Either a single integer, or an array with the same length as `continuum`, which specifies the default number of repetitions for each stimulus in `LabelingBlocks` and `CalibrationBlocks` (but can be overridden in those blocks, which is probably a safer bet).
* `prefix`: (optional) path to prepend to file names.  Can be used to specify a full URL for externally hosted files (like `https://www.myfilehosting.com/directory/with/files/`, or a relative path for stimuli in a subdirectory (like `mystimuli1/`)
* `mediaType`: 'audio' or 'video'.

Because everyone loves examples, here are the Stimuli objects used in the adaptation demo (`expt_vroomen_replication.js`) and their filename formatters: 

    :::javascript
    var mediaFilenameFormatter_An = function(n, prefix) {
        return(prefix + 'A' + (n+1));
    };

    var mediaFilenameFormatter_AnCatch = function(n, prefix) {
        return(prefix + 'a' + (n+1) + 'C');
    };

    var stimuli_vroomen = new Stimuli({
        prefix: 'http://www.hlp.rochester.edu/mturk/mtadapt/videos/',
        continuum: [1,2,3,4,5,6,7,8,9],
        maxAmbigRange: [4, 6],
        calibReps: [6, 8, 14, 14, 14, 14, 14, 8, 6],
        mediaType: 'audio',
        filenameFormatter: mediaFilenameFormatter_An,
        catchFilenameFormatter: mediaFilenameFormatter_AnCatch
    });

    // Audio continuum dubbed over /b/ videos
    var stimuli_vroomen_vb = new Stimuli({
        prefix: 'http://www.hlp.rochester.edu/mturk/mtadapt/videos/Vb',
        continuum: [1,2,3,4,5,6,7,8,9],
        maxAmbigRange: [4, 6],
        calibReps: [6, 8, 14, 14, 14, 14, 14, 8, 6],
        mediaType: 'video',
        filenameFormatter: mediaFilenameFormatter_An,
        catchFilenameFormatter: mediaFilenameFormatter_AnCatch
    });


### StimuliFileList objects

The format for `StimuliFileList` input is simpler: 

* `filenames`: an array of filenames (as strings),
* `prefix`: (optional) string path which is appended to each filename
* `mediaType`: 'audio' or 'video'

You can also provide any of the things that you would for a normal `Stimuli` object, except for the filename formatter functions (because the whole point of passing an array of filenames is to avoid having to write the formatter function).  Here's an example that produces basically the same thing as those above: 

    :::javascript
    var stimuli_fn_list_vroomen = new StimuliFileList(
        {
            prefix: 'http://www.hlp.rochester.edu/mturk/mtadapt/videos/',
            continuum: [1,2,3,4,5,6,7,8,9],
            maxAmbigRange: [4,6],
            mediaType: 'audio',
            filenames: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9']
        }
    );

## Experiment control and instructions blocks

### InstructionsBlock

Very simple: show text and a button to advance to the next block.

    var ib = new(InstructionsBlock('This is an experiment, you know that though'));


### InstructionSubsectionsBlock

This shows information (text, images, etc.) in an interactive way, organized into subsections.  Each subsection starts off collapsed (just headline visible), and each has a button or checkbox to advance to the next subsection.  Checkboxes must all be checked to advance to the next block.

Input is specified as a JSON object, with fields 

- `title`: overall title for instructions (always shown)
- `mainInstructions`: general instructions (always shown)
- `subsections`: an array of JSON objects specifying each subsection.
 
Each subsection is also a JSON object, with fields

- `title`: the headline for the subsection (always shown)
- `content`: the actual body of the subsection, which will be hidden until the subject advances to this subsection.  Can be a string (which will be wrapped in `<p></p>`), an array of strings (each of which will be wrapped in `<p></p>`, or an array of `{subtitle: 'text', content: 'text'}` objects, which can be used for further divisions within the subsection.  
- `checkboxText` (optional): Text label for a confirmation checkbox.  If omitted, no checkbox will be shown and there will be a button to advance to the next section.

Because everyone likes examples: 

    :::javascript
    var instructions = new InstructionsSubsectionsBlock(
        {
            logoImg: 'logo.png',
            title: 'the title of the instructions!',
            mainInstructions: 'Here\'s some text describing the instructions that should always appear',
            subsections: [
                {
                    title: 'section 1', 
                    contentHTML: '<h4>subheader</h4> <p>here\'s what is up w/ section one</p>', 
                    checkboxText: 'make sure you click this'
                },
                {
                    title: 'section 2!',
                    content: 'and this is some stuff about section 2'
                },
                {
                    title: 'yet another section',
                    content: ['here\'s a paragraph.', 'here is another paragraph!'],
                    checkboxText: 'here click again'
                },
                {
                    title: 'I heard you like subsections',
                    content: [{subtitle: 'so I put some subsections', content: 'in your subsections!'},
                              'just for kicks, a naked paragraph!',
                              {subtitle: 'like this one', content: 'says some stuff'}],
                    checkboxText: 'click here if you got all that'
                },
                {
                    title: 'Is anyone still reading?',
                    content: 'comes after everything else so probably not that important',
                    finallyInfo: true
                }
            ]
        }
    );

## SoundcheckBlock 

This block type implements a quick sound check.  You pass it a list of pairs of filenames and correct answers, and it shows a little play button with a text box for each one.  Subjects need to get all of them correct in order to advance.

The constructor function takes a parameters object as input: 

    :::javascript
    sc = new SoundcheckBlock(
        {
            instructions: '<h3>Sound check</h3>' +
                '<p>Listen to each word below, and type them into the boxes.</p>',
            items: [
                {
                    filename: 'stimuli/cabbage',
                    answer: 'cabbage'
                },
                {
                    filename: 'stimuli/lemonade',
                    answer: 'lemonade'
                }
            ]
        }
    );

The `instructions` parameter is optional; there's a sensible default built in.  Note that you need to leave the filename extensions (like `.wav`) off the filenames since these are set automatically based on browser compatibility (see Stimuli section above).  See `expt_template.js` in the [demo repository](https://bitbucket.org/dkleinschmidt/mtadapt-demo) for an example.
