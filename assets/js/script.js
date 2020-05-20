

use_mic = 1 //0: use mic, 1: use file
num_ceps = 13
num_steps = 120
// setup init variables
var DEFAULT_MFCC_VALUE = new Array(num_ceps) //13
var FEATURE_NAME_MFCC = 'mfcc'
var FEATURE_NAME_RMS = 'rms'
var CEPS_NODES = [8, 7, 2, 1, 0, 0, 1, 1, 1, 2, 2, 4, 4]

var THRESHOLD_RMS = 0.002 // threshold on rms value
var MFCC_HISTORY_MAX_LENGTH = 60    //more or equal to num_steps

var cur_mfcc = DEFAULT_MFCC_VALUE
var cur_rms = 0
var silence = true
//var mfcc_history = []
var mfcc_norm_history = []

var nodes_input_history = []

//var bufferSize = 512  //Buffer size must be a power of 2, e.g. 64 or 512
//sampleRate = 44100   //Auto-detect
window_len = 0.025
//bufferSize = sampleRate*window_len


var BOX_WIDTH = 25
var BOX_HEIGHT = 16

var MAX_TABLE_HISTORY = 500
var cep_history = []
var cep_min = []
var cep_max = []
//var cep_var = []
var cep_n = []
var cep_w = []
rows = 3

row_heads = ["Cum-Min", "Cum-Max", "Norm"]

/*
<audio
        controls
        loop
        crossorigin="anonymous"
        id="audio_file"
        src="03a01Wa.wav"
        >
        </audio>
*/


classes = 5;
var class_probs = new Array (0.0,0.0,0.0,0.0,0.0);
var class_names = ["Angry", "Happy", "Neutral", "Sad", "Quite"];
new_load = 0;

var tf_model;

async function prediction_engine()
{   
    
    tf_model =  await tf.loadLayersModel('assets/js/keras/model.json');
    console.log("TF model loaded")
}

async function process_out_array(arr)
{
    for(var i = 0; i < arr.length; i++)
    {
        for(var c = 0; c < classes; c++)
        {
            class_probs[c] = class_probs[c] + parseFloat(arr[i][c]);
        }
    }
    max_mood = 4;
    for(var c = 0; c < classes; c++)
    {
        if(class_probs[c] > class_probs[max_mood])
        max_mood = c;
    }
    document.getElementById("mood").innerHTML = class_names[max_mood];
    //console.log(class_probs);
}

async function prediction()
{   
    if (new_load == 1) 
    {   
        console.log("Predicting")
        new_load = 2;   
        //tns = tf.tensor3d([nodes_input_history]);

        const prediction = tf.tidy(() => {
            const result = tf_model.predict(tf.tensor3d([nodes_input_history]));
            return result;
          });
        const values = prediction.arraySync();
        prediction.dispose();
        const arr = Array.from(values);
        //prediction.print();
        
        process_out_array(arr);
        new_load = 0;
        //console.log(values);
        //console.log(arr);
    }
}

function add_one_hot_step(ceps_norm_arr)
{
    
    sum_nodes = CEPS_NODES.reduce((a, b) => a + b, 0)
    all_nodes =  [];
    nodes_idx = 0;

    for(var i = 0; i < num_ceps; i++)
    {
        this_cep_hot_array = new Array(CEPS_NODES[i]);
        for (var h = 0; h < CEPS_NODES[i]; h++)
        {
            this_cep_hot_array[h] = 0;
        }
        //This part uses the parameters generated by training modules.
        //This should be similar to training (python) module:

        if((CEPS_NODES[i] >= 1) && (ceps_norm_arr[i] > 0))
        {
            

            this_cep_val = ceps_norm_arr[i]*CEPS_NODES[i]       // -1 bcz this is index, index starts from 0
            this_cep_val = parseInt(Math.floor(this_cep_val)) - 1
            if(this_cep_val >= CEPS_NODES[i])
            {
                alert("ERROR55659 " + this_cep_val.toString() + " "+  CEPS_NODES[i].toString() );
            }
            else if(this_cep_val >= 0)
            {
                //console.log(this_cep_val)
                this_cep_hot_array[this_cep_val] = 1
            }
            else if(this_cep_val < 0)
            {
                //console.log(this_cep_val.toString() + " " + CEPS_NODES[i].toString() +  " " + ceps_norm_arr[i].toString() )
                //this_cep_hot_array[this_cep_val] = 1
            }
        }

        for (var h = 0; h < CEPS_NODES[i]; h++)
        {
            all_nodes[nodes_idx] = this_cep_hot_array[h]
            nodes_idx++;
            
        }
    }
    
    //console.log(all_nodes.length.toString() + " " + sum_nodes.toString())
    nodes_input_history.push(all_nodes)
    
    if(nodes_input_history.length > num_steps)
    {
        nodes_input_history.splice(0,1);
        if(new_load==0)
        {
            new_load = 1;
            prediction();
        }
    }
    
    //console.log(nodes_input_history)
}

function tableCreate()
{
    for(var i = 0; i < num_ceps; i++)
    {
        cep_history[i] = [];
        cep_min[i] = 0;
        cep_max[i] = 0;
        //cep_var[i] = 0;
        cep_n[i] = 0;
        //cep_w[i] = 0;
    }
    
    tbl  = document.getElementById('mfcc_table');
    //tbl.style.width  = '100px';
    //tbl.style.border = '1px solid black';

    //Head
    row_head = "MFCC#";
    var tr = document.createElement('tr');
    var th = document.createElement('th');
    th.appendChild(document.createTextNode(row_head))
    tr.appendChild(th)
    for(var i = 0; i < num_ceps; i++)
    {   
        var td = document.createElement('td');
        td.id = row_head + i.toString();
        td.appendChild(document.createTextNode(i.toString()))
        tr.appendChild(td)
    }
    tbl.appendChild(tr)

    //Contents
    for(var vr = 0; vr < rows; vr++)
    {
        
        var tr = document.createElement('tr');
        var th = document.createElement('th');
        th.appendChild(document.createTextNode(row_heads[vr]))
        tr.appendChild(th)
        for(var i = 0; i < num_ceps; i++)
        {
            var td = document.createElement('td');
            td.id = row_heads[vr] + i.toString();
            td.appendChild(document.createTextNode('0'))
            tr.appendChild(td)
        }
        tbl.appendChild(tr)
    }

    
}
tableCreate();


function arrayMin(arr) {
    return arr.reduce(function (p, v) {
      return ( p < v ? p : v );
    });
  }
  
  function arrayMax(arr) {
    return arr.reduce(function (p, v) {
      return ( p > v ? p : v );
    });
  }

current_idx = 0;
function update_table(mfcc_array)
{
    cep_n = new Array(num_ceps);
    for(var i = 0; i < num_ceps; i++)
    {
        this_val = parseInt(mfcc_array[i]);
        if (this_val < 0)
        {
            this_val = 0;
        }
        else
        {
            //tbl_cell  = document.getElementById(row_heads[3] + i.toString());
            //tbl_cell.innerHTML = this_val.toString();
        }
        cep_history[i].push(this_val);
        current_idx++;
        if(current_idx >= MAX_TABLE_HISTORY)
        {
             cep_history[i].splice(0,1);
             current_idx--;
        }
        //console.log(cep_history[i].length);
        
        new_min = arrayMin(cep_history[i])
        if(new_min < cep_min[i])
        {
            cep_min[i] = new_min;
            document.getElementById(row_heads[0] + i.toString()).innerHTML = cep_min[i].toString();
        }

        new_max = arrayMax(cep_history[i])
        if(new_max > cep_max[i])
        {
            cep_max[i] = new_max;
            document.getElementById(row_heads[1] + i.toString()).innerHTML = cep_max[i].toString();
        }

        //variance is not used other than in table.
        //cep_var[i] = parseInt(get_variance(cep_history[i])/10)
        //document.getElementById(row_heads[3] + i.toString()).innerHTML = cep_var[i].toString();

        //Normalize each cep using the commulative min, max.
        cep_n[i] = (this_val - cep_min[i])/cep_max[i]
        document.getElementById(row_heads[2] + i.toString()).innerHTML = parseInt(cep_n[i]*100).toString();
    }
    mfcc_norm_history.push(cep_n)
    //console.log(cep_n)
    // only store the last n 
    if(mfcc_norm_history.length > MFCC_HISTORY_MAX_LENGTH)
        mfcc_norm_history.splice(0,1);
    add_one_hot_step(cep_n);
    clear ()
    background ( 0, 0, 0 )
    plot(mfcc_norm_history) //used normalized mfccs to set color weights in spectrogram
}


    


function get_variance(arr)
{
    var len = 0;
    var sum=0;
    for(var i=0;i<arr.length;i++)
    {
        //alert(arr);
        if (arr[i] == ""){}
        else if (isNaN(arr[i]))
        {
            alert(arr[i] + " is not number, Variance Calculation failed!");
            return 0;
        }
        else
        {
            len = len + 1;
            sum = sum + parseFloat(arr[i]);
        }
    }
    var v = 0;
    if (len > 1)
    {
        var mean = sum / len;
        for(var i=0;i<arr.length;i++)
        {
            if (arr[i] == ""){}
            else { v = v + (arr[i] - mean) * (arr[i] - mean); }
        }
        return v / len;
    }
    else { return 0; }
}



function 
/* get new audio 
context object */
createAudioCtx()
{
    let AudioContext = window.AudioContext || window.webkitAudioContext;
    
    return new AudioContext();
}







function
/* create microphone
audio input source from 
audio context */
createMicSrcFrom(audioCtx)
{
    /* get microphone access */
    return new Promise((resolve, reject)=>{
        /* only audio */
        let constraints = {audio:true, video:false}

        navigator.mediaDevices.getUserMedia(constraints)
        .then((stream)=>{
            /* create source from
            microphone input stream */
            let src = audioCtx.createMediaStreamSource(stream)
            resolve(src)
        }).catch((err)=>{reject(err)})
    })
}

function set_buffer_size(sampleRate, window_len)
{
    bufferSize = window_len*sampleRate;
    if(bufferSize > 2048)
        bufferSize = 2048;
    else if(bufferSize > 1024)
        bufferSize = 1024;   
    else if(bufferSize > 512)
        bufferSize = 512; 
    else if(bufferSize > 256)
        bufferSize = 256;
    else if(bufferSize > 128)
        bufferSize = 128;
    else
        bufferSize = 64;  
    return bufferSize
}

document.querySelector('button').addEventListener('click', function() 
{
    if(use_mic==1)
    {
        
        by_mic()
        document.getElementById('button').style.visibility = 'hidden';
        prediction_engine();
        
    }
    else{
        alert("Error: Microphone inaccessible")
    }
  });

  
function
/* call given function
on new microphone analyser
data */
onMicDataCall(features, callback)
{
    return new Promise((resolve, reject)=>{
        let audioCtx = createAudioCtx()

        createMicSrcFrom(audioCtx)
        .then((src) => {
            sampleRate = audioCtx.sampleRate;
            bufferSize = set_buffer_size(sampleRate, window_len)
            //alert(audioCtx.sampleRate);
            let analyzer = Meyda.createMeydaAnalyzer({
                'audioContext': audioCtx,
                'source':src,
                'bufferSize':bufferSize,
                'featureExtractors':features,
                'numberOfMFCCCoefficients': num_ceps,
                'melBands': 64,
                'sampleRate': sampleRate,
                'windowingFunction': 'hanning',
                'callback':callback
            })
            resolve(analyzer)
        }).catch((err)=>{
            reject(err)
        })
    })
    
}


function 
onFilePlayCall(features, callback)
{
    const audioContext = new AudioContext();

    // Select the Audio Element from the DOM
    const htmlAudioElement = document.getElementById("audio_file");
    // Create an "Audio Node" from the Audio Element
    const source = audioContext.createMediaElementSource(htmlAudioElement);
    
    
    // Connect the Audio Node to your speakers. Now that the audio lives in the
    // Audio Context, you have to explicitly connect it to the speakers in order to
    // hear it
    source.connect(audioContext.destination);
    sampleRate = audioContext.sampleRate;
    bufferSize = set_buffer_size(sampleRate, window_len)
    
    //alert(bufferSize)

    return new Promise((resolve, reject)=>{

        if (typeof Meyda === "undefined")
        {
            console.log("Meyda could not be found! Have you included it?");
            reject("Meyda could not be found! Have you included it?")
        }
        else
        {
            let analyzer = Meyda.createMeydaAnalyzer({
                "audioContext": audioContext,
                "source": source,
                'bufferSize':bufferSize,
                'featureExtractors':features,
                'numberOfMFCCCoefficients': num_ceps,
                'melBands': 64,
                'sampleRate': sampleRate,
                'windowingFunction': 'hanning',
                'callback':callback
            })
            resolve(analyzer);
            //analyzer.start();
        }
        })

}


function setup() 
{
    // canvas setup
    createCanvas(BOX_WIDTH * MFCC_HISTORY_MAX_LENGTH, BOX_HEIGHT * cur_mfcc.length)
    background(255, 230, 150)

    if(use_mic==0)
    {
    by_file();
    prediction_engine();
    }
}

function by_mic()
{ 
    onMicDataCall([FEATURE_NAME_MFCC, FEATURE_NAME_RMS], show)
    .then((meydaAnalyzer) => {
        meydaAnalyzer.start()
    }).catch((err)=>{
        alert(err)
    })
}

function by_file()
{
    try {
        meydaAnalyzer = onFilePlayCall([FEATURE_NAME_MFCC, FEATURE_NAME_RMS], show).then((meydaAnalyzer) => {
            meydaAnalyzer.start()
        }).catch((err)=>{
            alert(err)
        })
    }
    catch (err) {
        alert(err)
    }
}


function show(features)
{
    // update spectral data size
    cur_mfcc = features[FEATURE_NAME_MFCC]
    cur_rms = features[FEATURE_NAME_RMS]
}



function draw () 
{
    

    /* append new mfcc values */
    if ( cur_rms > THRESHOLD_RMS ) 
    {
        update_table(cur_mfcc);
        silence = false;
    }
    else
    {
        // push an empty mfcc value 
        // to signify end of utterance
        if ( silence == false )
        {
            update_table(cur_mfcc);
            silence = true;
        }
    }


    
}


let plot = (data) => {
    for(let i = 0; i < data.length; i++ ) 
    {
        for(let j = 0; j < data [i].length; j++ )
        {
            let color_strength = data[i][j]*255

            // setting color
            if ( data [i] [j] >= 0 )
                fill ( 255, color_strength, 0 )
            else
                fill( 255, 0, 0 )
            
            noStroke();
            
            // drawing the rectangle
            rect(i * BOX_WIDTH, j * BOX_HEIGHT, BOX_WIDTH, BOX_HEIGHT)
        }
    }
}

    