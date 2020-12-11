/*
 * Author: Xin Xie
 *
 *    Copyright 2016 Xin Xie
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
 */

var _curBlock;

var vidSuffix, audSuffix;

var respDelim = ';';
// response categories

// global variable for computing the size for each increment of the progress bar (see progressBar.js)
var pbIncrementSize;

// Experiment object to control everything
var e;
var isTest = false;

$(document).ready(function() {

    // create an experiment object with the necessary RSRB metadata
    e = new Experiment(
        {
            rsrbProtocolNumber: 'RSRB00045955',
            consentForm: 'https://www.hlp.rochester.edu/consent/RSRB45955_Consent_2019-02-10.pdf',
            survey: 'surveys/priming_survey.html' //Post-experiment survey that will show up at the very end of the experiment
        }
    );
    e.init();

    ///////////////////////////////////////////////////////////
    // parse relevant URL parameters
    e.sandboxmode = checkSandbox(e.urlparams);
    e.previewMode = checkPreview(e.urlparams);
//    e.previewMode = true;
    e.debugMode = checkDebug(e.urlparams);

    // e.urlparams is a dictionary (key-value mapping) of all the url params.
    // you can use these to control any aspect of your experiment you wish on a HIT-by-HIT
    // basis using the .question and .input files (see hits/vroomen-replication.* for examples)

    ////////////////////////////////////////////////////////////
    // Create and add blocks of experiment.

    ////////////////////////////////////////////////////////////////////////
    // Instructions

    var condition = e.urlparams['condition'];
    var speaker = e.urlparams['speaker'];
    var block = e.urlparams['block'];
   // var TrL = e.urlparams['TrL'];    //which training list A or B
    var TeL = e.urlparams['TeL']; //which test list for test block 1 & 2: 1,2,3,4,5,6
    var order = e.urlparams['order'];    //two reversed orders of items within a list
    var visual = e.urlparams['visual'];    //two visual orders (whether the target word appears as visual1 or visual2)
    var isTest = e.urlparams['test']; // Should tell us which probes are being use for test and training

        var instructions = new InstructionsSubsectionsBlock(
            {
                logoImg: 'img/logo.png',
                title: 'Play the game: What do you hear?',
                mainInstructions: ['Thanks for your interest in our study!  This HIT is a psychology experiment about how people understand speech. You will listen to speech sounds and you will also see visual objects or text. You will have to make a decision about what you hear and/or what you see.',
                                   'The following items will inform you about the study and its requirements. Please read through each of them carefully. You can click the headings below to expand or close each section.',
                                   '<span style="font-weight:bold;">Do not take this experiment more than once! </span>'],
                buttonInstructions: 'I confirm that I meet the eligibility and computer requirements, that I have read and understood the instructions and the consent form, and that I want to start the experiment.',
                beginMessage: 'Click here to begin the experiment',
                exptInstructions: true, // true means that this instruction block is the Experiment Instruction at the beginning of the experiment, not instruction for a section
                subsections: [
                    {
                        title: 'Eligibility requirements',
                        content: ['<span style="font-weight:bold;">This experiment will take about 20 to 30 minutes and you will be paid $3.00.</span>',
                        'You must be between the<span style="font-weight:bold;"> age of 18 to 45</span>. You must be a native speaker of American English to participate. This means that you must have grown up and <span style="font-weight:bold;">spent at least the first 7 years of your life in the United States speaking English primarily.</span>',
                        'You must have <span style="font-weight:bold;">normal hearing</span> and normal or corrected to normal vision.',
                                 ],
                        checkboxText: 'I have read and understand the requirements.'
                    },
                    
                    {
                        title: 'A quiet environment and good headphones',
                        content: ['<font color="red"><span style="font-weight:bold;">You must do this experiment by yourself.  It is of critical importance that you are in a quiet room free of any of distractions and wear headphones.<span style="font-weight:bold;"></font>', 'Please maximize the browser window to eliminate distractions. This experiment requires that your browser support javascript.',
                                 ],
                        checkboxText: 'I have read and understand the requirements.'
                    },
                    {
                        title: 'Adjust the volume of your headphones',
                        content: ['This section will help set your volume to a comfortable listening level. Press each green button to play a sentence.',
                        'Feel free to replay the sounds as many times as you need and adjust the volume until you can clearly hear all words.',
                        'Once a comfortable level of volume is achieved, keep it that way. <font color="red"><span style="font-weight:bold;">Do not change your volume at any point throughout the entire experiment, even when you struggle to understand some sounds</span></font>. <span style="font-weight:bold;">Sometimes the speech is embedded in noise</span>. We want to know how those speech sounds can be understood under that condition.', 
                        'When you are done with volume adjustment, <span style="font-weight:bold;">type out the last word of each sentence</span> in the boxes below.',    
                                  function() {
                                      var soundcheck = new SoundcheckBlock(
                                          {
                                              items: [
                                                  {
                                                      filename: 'stimuli_soundcheck/talker_Eng_F_049/sswr_5SNR/S011',
                                                      answer: 'ground'
                                                  },
                                                  {
                                                      filename: 'stimuli_soundcheck/talker_Eng_F_049/sswr_5SNR/S013',
                                                      answer: 'fish'
                                                  }
                                              ],
                                              instructions: '',
                                          }
                                      );
                                      return(soundcheck.init());
                                  }]
                    },
					{
						title: 'Informed consent',
						content: e.consentFormDiv,
						checkboxText: 'I consent to participating in this experiment'
					},
					{
						title: 'Further (optional) information',
						content: ['Sometimes it can happen that technical difficulties cause experimental scripts to freeze so that you will not be able to submit a HIT. We are trying our best to avoid these problems. Should they nevertheless occur, we urge you to <a href="mailto:hlplab@gmail.com">contact us</a>, and include the HIT ID number and your worker ID.',
								  'If you are interested in hearing how the experiments you are participating in help us to understand the human brain, feel free to subscribe to our <a href="http://hlplab.wordpress.com/">lab blog</a> where we announce new findings. Note that typically about one year passes before an experiment is published.'],
						finallyInfo: true
					}
				]
            });
            
    e.addBlock({block: instructions,
                onPreview: true,
                showInTest: false //showInTest: when urlparam for mode=test, don't add the block
    });  // onPreview = true for blocks that can be viewed BEFORE the worker accepts a HIT. To get an idea of what this means, try to go through the HIT without accepting it and see how far you get


    if (e.previewMode) {
        e.nextBlock();
    }
    
    /*Rest of the experiment here*/
   else {
        //INSTURCTIONS FOR TRAINING BLOCK
        var instructions_1 = new InstructionsSubsectionsBlock(
            {
                instrImg: '',
                instrStyle: 'logo2',
                title: '', //here we can have a title for Part 1
                mainInstructions: ['READ THE FOLLOWING INSTRUCTIONS CAREFULLY', 
                				   'In this experiment, you will hear words in English and make decisions about them. The person speaking might change throughout the experiment.', 
                                   "Let's start with some practice to familiarize you with the task. In this practice, you will hear a series of words. <span style='font-weight:bold;'>Your job is to type out the word you hear. Hit ENTER to submit a typed response.</span><br>",
                                   "<p>We want to know how well you understand the speaker. This may be easy or hard for you. After your response, you will receive feedback about your accuracy and the sound will be replayed once.</p>",     
                                   '<font color="red">It is critical that you focus on the tasks throughout this experiment without any distraction (visual or auditory)-- stay in a quiet room by yourself. </font>',
                  ],
                buttonInstructions: 'START',
                beginMessage: 'Click here to begin the practice',
                exptInstructions: false,

            });
            
    e.addBlock({block: instructions_1,
                onPreview: true,
                showInTest: true //showInTest: when urlparam for mode=test, don't add the block
    });  // onPreview = true for blocks that can be viewed BEFORE the worker accepts a HIT. To get an idea of what this means, try to go through the HIT without accepting it and see how far you get

      //EXAMPLE BLOCK
      var sampleStim = new ExtendedStimuliFileList(
            {
                prefix: "stimuli/example_baseline/scaled/5SNR/words_sswn_5SNR/",
                mediaType: 'audio',
                filenames: ['b6_chip','b1_grill','p4_bark','b5_beans','b3_wax','p5_dart','p1_lamp','p6_rent','p2_pole','p3_jail','b4_lid'], //sentence is not in usable stimulus list; speaker is not either
                probes1: ['chin','grill','bark','bins','wax','dark','lump','cent','pole','jail','lead'],
                probes2: ['chip','will','bard','beans','max','dart','lamp','rent','pull','tail','lid'],
                subtitles: ['chip','grill','bark','beans','wax','dart','lamp','rent','pole','jail','lid'],
                correctKeys: ['right','left','left','right','left','right','right','right','left','left','right']
            }
        );
        var sampleBlock = new TranscriptionBlock_fb({stimuli: sampleStim,
                             blockRandomizationMethod: "dont_randomize",
                             trialInstructions: "What do you hear? Type it out",
                             reps: 1,
                             //respKeys: {'Q': 'left', 'P': 'right'}, //{'A': 'left', 'L': 'right'},
                             //categories: ['left', 'right'], // ['left', 'right']
                             feedback: true,
                             fixationTime: 500,
                             ITI:2750, // this interval is used to present feedback if any
                             mediaType: 'audio',
                             namespace: 'sample'});                        
         e.addBlock(
             {
                  block: sampleBlock,
                  instructions:'<font color="red">It is important that you keep your volume at the same level throughout the experiment.</font>',
                  onPreview: false,
             });
        
        //REST OF EXP
        var testPrefix;
        var trainingPrefix;
        var stimListFile;
        if (condition === "testRun") {
            trainingPrefix = "stimuli/all_sound_files/E14/";
            test1Prefix = "stimuli/all_sound_files/M4/";
            test2Prefix = "stimuli/all_sound_files/M4/";
            trainingList = "lists/Training_List"+TeL+".txt";
            test1List = "lists/Test1_List"+TeL+".txt";
            test2List = "lists/Test2_List"+TeL+".txt";
        }
        if (condition === "experimental" & speaker === "M4") {
            trainingPrefix = "stimuli/all_sound_files/M4/";
            test1Prefix = "stimuli/all_sound_files/M4/";
            test2Prefix = "stimuli/all_sound_files/M4/";
            trainingList = "lists/Training/order"+order+"_visual"+visual+"_"+condition+"_"+speaker+".txt";
            test1List = "lists/Test1/"+speaker+"/order"+order+"_visual"+visual+"_block"+block+"_test1"+".txt";
            test2List = "lists/Test2/"+speaker+"/order"+order+"_visual"+visual+"_block"+block+"_test2"+".txt";
        }
        if (condition === "control" & speaker === "M4") {
            trainingPrefix = "stimuli/all_sound_files/E14/";
            test1Prefix = "stimuli/all_sound_files/M4/";
            test2Prefix = "stimuli/all_sound_files/M4/";
            trainingList = "lists/Training/order"+order+"_visual"+visual+"_"+condition+"_"+"E14"+".txt";
            test1List = "lists/Test1/"+speaker+"/order"+order+"_visual"+visual+"_block"+block+"_test1"+".txt";
            test2List = "lists/Test2/"+speaker+"/order"+order+"_visual"+visual+"_block"+block+"_test2"+".txt";
        }
        
        if (condition === "experimental" & speaker === "M15") {
            trainingPrefix = "stimuli/all_sound_files/M15/";
            test1Prefix = "stimuli/all_sound_files/M15/";
            test2Prefix = "stimuli/all_sound_files/M15/";
            trainingList = "lists/Training/order"+order+"_visual"+visual+"_"+condition+"_"+speaker+".txt";
            test1List = "lists/Test1/"+speaker+"/order"+order+"_visual"+visual+"_block"+block+"_test1"+".txt";
            test2List = "lists/Test2/"+speaker+"/order"+order+"_visual"+visual+"_block"+block+"_test2"+".txt";
        }
        if (condition === "control" & speaker === "M15") {
            trainingPrefix = "stimuli/all_sound_files/E14/";
            test1Prefix = "stimuli/all_sound_files/M15/";
            test2Prefix = "stimuli/all_sound_files/M15/";
            trainingList = "lists/Training/order"+order+"_visual"+visual+"_"+condition+"_"+"E14"+".txt";
            test1List = "lists/Test1/"+speaker+"/order"+order+"_visual"+visual+"_block"+block+"_test1"+".txt";
            test2List = "lists/Test2/"+speaker+"/order"+order+"_visual"+visual+"_block"+block+"_test2"+".txt";
        }
        
///TRAINING BLOCK
        Papa.parse(trainingList, {
            download: true,
            header: true,
            delimiter: '|',
            skipEmptyLines: true,
            complete: function(results) {
                console.log(trainingList);
                var trainingStim = new ExtendedStimuliFileList(
                    {
                        prefix: trainingPrefix,
                        mediaType: 'audio',
                        filenames: getFromPapa(results, 'Filename'),
                        probes1: getFromPapa(results, 'Visual1'),
                        probes2: getFromPapa(results, 'Visual2'),
                       // targets: getFromPapa(results, 'Target'),
                        subtitles: getFromPapa(results, 'Target'),
                        correctKeys: getFromPapa(results,'CorrectAnswer')
                    }
                );
            
             var trainingBlock = new TranscriptionBlock_fb({stimuli: trainingStim,
                             blockRandomizationMethod: "dont_randomize",
                             //trialInstructions: "Which word do you hear?",
                             Instructions: "Type out what you hear",
                             reps: 1,
                             //respKeys: {'Q': 'left', 'P': 'right'}, //{71: 'B', 72: 'D'},
                             //categories: ['left', 'right'], // ['B', 'D']
                             feedback: true,
                             mediaType: 'audio',
                             fixationTime: 500,
                             ITI:2750, // this interval is used to present feedback if any 
                             namespace: 'training'});                                
            e.addBlock(
                  {
                      block: trainingBlock,
                      instructions:["<p>We will now start the actual experiment. This part takes about 10-15 mins to finish. </p>",
                      "<p>Your task is the same as during the practice, but you will now hear a new talker.</p>", 
                      "<p><font color='blue'>Same as before, you will receive feedback. The feedback is intended to help you understand the speaker better. You will be asked to identify speech from this speaker or another speaker in a following test.</font></p>",  
                      "<p><font color='red'>It is critical that you keep your headphones on and do not change the volume level throughout this experiment.</font></p>",
                      ],
                      onPreview: false,
                  });

 
        
            ///INSTRUCTIONS FOR TEST BLOCK        
    var instructions_2 = new InstructionsSubsectionsBlock(
            {
                instrImg: '',
                instrStyle: 'logo2',
                title: 'Test time', //We can have a title for Part 2 here
                mainInstructions: ['Great job!',
                				   "During this part, the task remains the same, but <span style='font-weight:bold;'>no feedback will be provided</span>. We will measure how well you understand the speech without feedback. The experiment will continue immediately after your response. <span style='font-weight:bold;'>Each word will be played only once.</span> <br><br>"
                                                                    
                  ],
                buttonInstructions: 'START',
                beginMessage: 'Click here when you are ready to continue',
                exptInstructions: false
            });
    
            
        e.addBlock({block: instructions_2,
                onPreview: true,
                showInTest: true //showInTest: when urlparam for mode=test, don't add the block
    });  // onPreview = true for blocks that can be viewed BEFORE the worker accepts a HIT. To get an idea of what this means, try to go through the HIT without accepting it and see how far you get

              ///TEST BLOCK 1
        Papa.parse(test1List, {
            download: true,
            header: true,
            delimiter: '|',
            skipEmptyLines: true,
            complete: function(results) {
                console.log(test1List);
                var test1Stim = new ExtendedStimuliFileList(
                    {
                        prefix: test1Prefix,
                        mediaType: 'audio',
                        trialtypes: getFromPapa(results, 'TrialType'),
                       // wordtypes: getFromPapa(results, 'WordType'),
                        filenames: getFromPapa(results, 'Filename'),
                        primes: getFromPapa(results, 'Prime'),
                        probes1: getFromPapa(results, 'Visual1'),
                        probes2: getFromPapa(results, 'Visual2'),
                       // targets: getFromPapa(results, 'Target'),
                        subtitles: getFromPapa(results, 'Target'),
                        correctKeys: getFromPapa(results,'CorrectAnswer')
                    }
                );
   
             var test1Block = new TranscriptionBlock_fb({stimuli: test1Stim,
                             blockRandomizationMethod: "shuffle",
                             trialInstructions: "Which word do you hear?",
                             reps: 1,
                            // respKeys: {'Q': 'left', 'P': 'right'}, 
                            // categories: ['left', 'right'], 
                             feedback: false,
                             fixationTime: 500,
                             ITI:1000, // this interval is used to present feedback if any
                             mediaType: 'audio',
                             namespace: 'test1'});                                
            e.addBlock(
                  {
                      block: test1Block,
                      instructions:"<p><font color='red'>It is critical that you keep your headphones on and do not change the volume level throughout this experiment.</font></p>",
                      onPreview: false,
                      
                  });
                  
                  ///TEST BLOCK 2
                    
                    Papa.parse(test2List, {
                        download: true,
                        header: true,
                        delimiter: '|',
                        skipEmptyLines: true,
                        complete: function(results) {
                            var test2Stim = new ExtendedStimuliFileList(
                                {
                                    prefix: test2Prefix,
                                    mediaType: 'audio',
                                    trialtypes: getFromPapa(results, 'TrialType'),
                                  //  wordtypes: getFromPapa(results, 'WordType'),
                                    filenames: getFromPapa(results, 'Filename'),
                                    primes: getFromPapa(results, 'Prime'),
                                    probes1: getFromPapa(results, 'Visual1'),
                                    probes2: getFromPapa(results, 'Visual2'),
                                    subtitles: getFromPapa(results, 'Target'),
                                    correctKeys: getFromPapa(results,'CorrectAnswer')
                                }
                            );

                       
                         var test2Block = new TranscriptionBlock_fb({stimuli: test2Stim,
                             blockRandomizationMethod: "shuffle",
                             trialInstructions: "Which word do you hear?",
                             reps: 1,
                            // respKeys: {'Q': 'left', 'P': 'right'}, 
                            // categories: ['left', 'right'], 
                             feedback: false,
                             fixationTime: 500,
                             ITI:1000, // this interval is used to present feedback if any
                             mediaType: 'audio',
                             namespace: 'test2'});                                  
                        e.addBlock(
                              {
                                  block: test2Block,
                                  instructions:["<p>You are almost done! Just a few more trials to go.</p>",
                                                "<font color='red'>Remember to keep your volume at the same level it was previously.",
                                                ],
                                  onPreview: false,
                              }
                                );
                                

                            $("#continue").hide();
                            e.nextBlock();

                        }
                    }); 

                    }
                }); 
             }
        }); 

    }
});  
