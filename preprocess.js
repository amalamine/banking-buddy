/*
/preprocess is triggered by /remember upon fetching the user's previously stored context or newly created record
pre-processess the input received from Facebook Messenger then sends it to Watson Covnersation
pre-processing includes:
- classifying images sent by the user using Watson Visual Recognition
- transcribing audio send by the user using Speech to text
- translation location pins sent by the user and appending coordinates to context

once processed, the input is sent to Watson conversation
- images are sent as text in the following format: "ADMINVISUAL" with context variables visual.score and visual.class
- audio is sent as regular text input
- images are sent as text in the following format: "ADMINVISUAL" with context variables coordinates.lat and coordinates.long

Watson Conversation handles the input accordingly, and sends back text output along with the updated context
the output is passed to /process as follows:
{
"userid": userid,
"text": output received from conversation,
"context": updated context
}

Default Parameters
visual_apikey
conversation_username
conversation_password
conversation_workspace
audio_url

*/

var http = require('http');
var request = require('request');
const promiseReq = require('request-promise')
var watson = require('watson-developer-cloud');

function main(params){
    var preprocess = new Promise(function (resolve, reject){
        if (params.attachment){
            console.log("pre-processing attachment")
        if (params.attachment.type=="image"){
        console.log("image")
        // if (params.attachment.payload.sticker_id)
        // {
        //   console.log("it's a sticker")
        //   params.text = "ADMINVISUAL sticker"
        //   params.context.visual = {
        //               "type": "sticker"
        //             }
        // }
        // else {
            //CLASSIFY IMAGE
            var visual = new watson.VisualRecognitionV3({
                api_key: params.visual_apikey,
                version_date: '2015-05-19'
                });

            var input = {
                url: params.attachment.payload.url
            };
                visual.classify(input, function(err, res) {
                  if (err) {
                    console.log(err);
                    reject(err)
                  }
                  else {
                    console.log(JSON.stringify(res, null, 2));
                    var payload = {
                        "userid": params.userid,
                        "text": "ADMINVISUAL " + res.images[0].classifiers[0].classes[0].score + ":" + res.images[0].classifiers[0].classes[0].class,
                        "context": {"visual": {
                        "type": "image",
                        "score": res.images[0].classifiers[0].classes[0].score,
                        "class": res.images[0].classifiers[0].classes[0].class
                    }}
                    }
                    resolve(payload)
                  }

                });
        // }
    }
    else if (params.attachment.type=="audio"){
        console.log("audio")
        var transcribe = promiseReq({
            method: 'POST',
            url: params.audio_url,
            json: {"url": params.attachment.payload.url}
        })
        return transcribe
        .then(function(res){
            console.log(res)
            var payload = {
                "userid": params.userid,
                "context": params.context,
                "text": res.response.result.text
            }
            resolve(payload)
        })
        .catch(function(err){
            reject(err)
        })
    }
    else if (params.attachment.type=="location"){
        console.log("location")
        params.context.coordinates = {
                        lat: params.attachment.payload.coordinates.lat,
                        long: params.attachment.payload.coordinates.long
                        }
            var payload = {
                        "userid": params.userid,
                        "text": "ADMINLOCATION",
                        "context": params.context
                        // "context":
                        // {"coordinates": {
                        // "lat": params.attachment.payload.coordinates.lat,
                        // "long": params.attachment.payload.coordinates.long
                        // }
                        // }
                    }
                    resolve(payload)
    }
    }
    else {
        console.log("no attachment found")
        resolve(params)
    }
    })
    return preprocess
    .then(function(a) {
        console.log('preprocess ' + JSON.stringify(a));
        return new Promise(function(resolve, reject) {
            var conversation = watson.conversation({
                url: "https://gateway.watsonplatform.net/conversation/api",
                username: params.conversation_username,
                password: params.conversation_password,
                version: 'v1',
                version_date: '2017-05-26'
            });
            if (params.context.selector){
                params.context.selector = {};
            }
            if (params.context.fields){
                params.context.fields = []
            }
              conversation.message({
                  workspace_id: params.conversation_workspace,
                  input: {'text': a.text},
                  context: a.context
                  },  function(err, response) {
                  if (err){
                    console.log('error:', err);
                    reject(err);
                  }
                  else {
                      console.log(JSON.stringify(response, null, 2));
                      resolve(response);
                  }
              });
      })
      .then(function(b) {
          console.log('process' + JSON.stringify(params));
          return {
              'userid': params.userid,
              'text': b.output.text[0],
              'context': b.context
          }
      })
      .catch(function(b) { console.log('process: ', b); });

    })
    .catch(function(a) { console.log('preprocess: ', a); });
}

module.exports.main = main;
