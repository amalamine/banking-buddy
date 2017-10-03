var fs = require('fs'),
    cloudconvert = new (require('cloudconvert'))(YOUR_API_KEY);
var request = require('request-promise')


function main(params){
var url = params.url
var filename = url.substring(url.indexOf("audioclip-"), url.indexOf(".mp4?oh"))
filename = filename + ".flac"
console.log(filename)
var promise = new Promise(function(resolve, reject){
  var process = cloudconvert.convert({
        "inputformat": "mp4",
        "outputformat": "flac",
        "input": "download",
        "file": url,
        "wait": true,
        "output": {
            "googlecloud": {
                "projectid": YOUR_PROJECTID,
                "bucket": YOUR_BUCKET_NAME,
                "credentials": {
                    "type": "service_account",
                    "project_id": YOUR_PROJECT_ID,
                    "private_key_id": YOUR_PRIVATE_KEY_ID,
                    "private_key": YOUR_PRIVATE_KEY,
                    "client_email": YOUR_CLIENT_EMAIL,
                    "client_id": YOUR_CLIEND_ID,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://accounts.google.com/o/oauth2/token",
                    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
                    "client_x509_cert_url": YOUR_CERT_URL
                }
            }
        },
        "save": true
    })
    setTimeout(function(){
      resolve(process)
    }, 4000)

})
return promise
.then(function(){
  console.log("converted file")
  return new request({
    method: 'POST',
    url: 'https://speech.googleapis.com/v1/speech:recognize?key=' + params.gc_speech_apikey,
    json: {
      config: {
          encoding: 'FLAC',
          sampleRateHertz: 8000,
          languageCode: 'en-US'
        },
      audio: {
            uri: params.gc_storagebucketurl + filename
        }
    }
  })
  .then(function(b){
    // console.log(JSON.stringify(b))
    console.log("transcribed file")
    const transcription = b.results[0].alternatives[0].transcript
    console.log(transcription)
    return({"text": transcription})
    // console.log(`Transcription: ${transcription}`);
  })
})
.catch(function(err){
  console.log(JSON.stringify(err))
})
}
module.exports.main = main;
