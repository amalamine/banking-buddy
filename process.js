/*
/process is triggered by /preprocess after processing any attachments sent by the user and receiving's Watson Conversation's response
this action resolves any pending actions sent by Watson Conversation, including:
- fetching service information
- fetching branch or atm location
- logging complaints to cloudant db
- logging applications (leads) to cloudant db

the output is passed to /memorize as follows:
{
"userid": userid,
"text": output received from conversation,
"context": updated context
}

Default Parameters
cloudant_url

*/

var http = require('http');
var request = require('request');
var watson = require('watson-developer-cloud');

function main(params){
    var promise = new Promise(function (resolve, reject){
    if (params.context.action){
      console.log("resolving action")
      if (params.context.action=="list_services_by_type" || params.context.action=="get_service_info" || params.context.action=="find_nearest_location"){
        console.log("initiating Cloudant call")
        var cloudantOrError = getCloudantAccount(params);
        if (typeof cloudantOrError !== 'object') {
          reject(cloudantOrError);
        }
        var cloudant = cloudantOrError;
        var dbName = params.context.source;
        var query = {
          "selector": params.context.selector,
          "fields": params.context.fields,
          "sort": [
            {
              "_id": "asc"
            }
          ]
        }
        console.log(query)
        console.log(dbName)
        if(!dbName) {
          reject('dbname is required.');
        }
        if(!query) {
          reject('query field is required.');
        }
        var cloudantDb = cloudant.use(dbName);
          cloudantDb.find(query, function(error, response) {
            if (!error) {
              console.log('success', response);
              if (response.docs!=null){
                resolve(response.docs)
              }
              else {
                var query = {
                  "selector": params.context.selector,
                  "fields": ["contact_method", "phone_no", "website_url"],
                  "sort": [
                    {
                      "_id": "asc"
                    }
                  ]
                }
                cloudantDb.find(query, function(error, response) {
                  if (!error) {
                    console.log('success', response);
                    resolve(response.docs)
                  }
                  else {
                    console.log('error', error);
                    reject(error);
                  }
                });
              }
            }
            else {
              console.log('error', error);
              reject(error);
            }
          });
      }
      else if (params.context.action=="log_complaint"){
          console.log("initiating Cloudant call")
            var cloudantOrError = getCloudantAccount(params);
            if (typeof cloudantOrError !== 'object') {
              reject(cloudantOrError);
            }
            var cloudant = cloudantOrError;
            var dbName = params.context.target;
            var cloudantDb = cloudant.use(dbName);
        cloudantDb.insert({'fb_userid': params.userid, 'user_profile': params.context.persona}, function(error, response) {
          if (!error) {
            console.log("success", response);
                response = {
                    'userid': params.userid,
                    'text': params.text,
                    'context': params.context };
                resolve(response);
          } else {
            console.log("error", error);
            reject(error);
          }
        });
      }
      else if (params.context.action=="log_application"){
          console.log("initiating Cloudant call")
            var cloudantOrError = getCloudantAccount(params);
            if (typeof cloudantOrError !== 'object') {
              reject(cloudantOrError);
            }
            var cloudant = cloudantOrError;
            var dbName = params.context.target;
            var cloudantDb = cloudant.use(dbName);
        cloudantDb.insert({'fb_userid': params.userid, 'user_profile': params.context.persona, 'service': params.context.service}, function(error, response) {
          if (!error) {
            console.log("success", response);
                response = {
                    'userid': params.userid,
                    'text': params.text,
                    'context': params.context };
                resolve(response);
          } else {
            console.log("error", error);
            reject(error);
          }
        });
      }
    }
    else {
      console.log("no action found")
      var payload = {
              "userid": params.userid,
              "context": params.context,
              "text": params.text,
              "quick_replies": params.context.quick_replies
            }
      resolve(payload)
    }
    })
    return promise
    .then(function(a) {
        console.log('response' + a);
        console.log(JSON.stringify(a))
        return new Promise(function(resolve, reject) {
          if (params.context.action == "list_services_by_type")
          {
              console.log("listing actions by type")
            var elements = []
              for (i=0; i<a.length; i++){
                elements[i] = {
                  "title": a[i].name,
                  "image_url": a[i].image_url,
                  "default_action": {
                    "type": "web_url",
                    "url": a[i].website_url
                  },
                  "buttons": [
                    {
                      "type": "web_url",
                      "title": "Read more",
                      "url":  a[i].website_url
                    },
                    {
                      "type": "phone_number",
                      "title": "Call respresentative",
                      "payload": a[i].phone_no
                    }
                    ]
                }
              }
            var payload = {
              "userid": params.userid,
              "context": params.context,
              "text": params.text,
              "quick_replies": params.context.quick_replies,
              "attachment": {
                "type":"template",
                "payload":{
                  "template_type":"generic",
                  "elements": elements
                }
            }
            }
          resolve(payload)
        }
        else if (params.context.action=="get_service_info") {
          switch(params.context.fields[0]) {
            case "description":
                 var payload = {
                  "userid": params.userid,
                  "context": params.context,
                  "text": params.text,
                  "quick_replies": params.context.quick_replies,
                  "attachment": {
                  "type":"template",
                  "payload":{
                    "template_type":"button",
                    "text":a[0].description,
                    "buttons":[
                      {
                        "type":"web_url",
                        "url":a[0].website_url,
                        "title":"Read more"
                      },
                      {
                        "type":"phone_number",
                        "payload":a[0].phone_no,
                        "title":"Call Representative"
                      }
                    ]
                  }
                }
                }
                resolve(payload)
                break;
            case "benefits":
                if (typeof a[0].benefits == "string"){
                    var payload = {
                      "userid": params.userid,
                      "context": params.context,
                      "text": params.text,
                      "quick_replies": params.context.quick_replies,
                      "attachment": {
                      "type":"template",
                      "payload":{
                        "template_type":"button",
                        "text":a[0].benefits,
                        "buttons":[
                          {
                            "type":"web_url",
                            "url":a[0].website_url,
                            "title":"Read more"
                          },
                          {
                            "type":"phone_number",
                            "payload":a[0].phone_no,
                            "title":"Call Representative"
                          }
                        ]
                      }
                    }
                    }
                }
                else {
                    var elements = []
                    console.log("length of array " + a[0].benefits.length)
                    for (i=0; (i < 4 && i < a[0].benefits.length); i++){
                        elements[i] = {
                            "title": a[0].benefits[i],
                            "subtitle": " "
                          }
                    }
                    var payload = {
                      "userid": params.userid,
                      "context": params.context,
                      "text": params.text,
                      "quick_replies": params.context.quick_replies,
                      "attachment": {
                      "type": "template",
                      "payload": {
                        "template_type": "list",
                        "top_element_style": "compact",
                        "elements": elements,
                         "buttons": [
                          {
                            "title": "View More",
                            "type": "web_url",
                            "url": a[0].website_url
                          }
                        ]
                      }
                    }
                    }
                }
                resolve(payload)
                break;
            case "required_docs":
                if (a[0].required_docs!=""){
                    var elements = []
                    for (i=0; i < a[0].required_docs.length && i < 4; i++){
                        elements[i] = {
                            "title": a[0].required_docs[i],
                            "subtitle": " "
                          }
                    }
                    var payload = {
                      "userid": params.userid,
                      "context": params.context,
                      "text": params.text,
                      "quick_replies": params.context.quick_replies,
                      "attachment": {
                      "type": "template",
                      "payload": {
                        "template_type": "list",
                        "top_element_style": "compact",
                        "elements": elements,
                         "buttons": [
                          {
                            "title": "View More",
                            "type": "web_url",
                            "url": a[0].website_url
                          }
                        ]
                      }
                    }
                    }
                }
                else {
                    var payload = {
                  "userid": params.userid,
                  "context": params.context,
                  "text": "I don't have the answer to that. " + a[0].contact_method,
                  "quick_replies": params.context.quick_replies
                }
                }
                resolve(payload)
                break;
            case "limit":
                if (a[0].limit!=""){
                    var payload = {
                  "userid": params.userid,
                  "context": params.context,
                  "text": a[0].limit,
                  "quick_replies": params.context.quick_replies
                }
                }
                else {
                    var payload = {
                  "userid": params.userid,
                  "context": params.context,
                  "text": "I don't have the answer to that. " + a[0].contact_method,
                  "quick_replies": params.context.quick_replies
                }
                }
                resolve(payload)
                break;
            case "contact_method":
                var payload = {
                  "userid": params.userid,
                  "context": params.context,
                  "text": a[0].contact_method,
                  "quick_replies": params.context.quick_replies
                }
                resolve(payload)
                break;
            case "apply_url":
                if (a[0].apply_url==""){
                    var payload = {
                  "userid": params.userid,
                  "context": params.context,
                  "text": a[0].contact_method,
                  "quick_replies": params.context.quick_replies
                }
                }
                else {
                    var payload = {
                  "userid": params.userid,
                  "context": params.context,
                  "text": params.text,
                  "quick_replies": params.context.quick_replies,
                  "attachment": {
                  "type":"template",
                  "payload":{
                    "template_type":"button",
                    "text":"You can apply online or " + a[0].contact_method,
                    "buttons":[
                      {
                        "type":"web_url",
                        "url":a[0].apply_url,
                        "title":"Apply"
                      }
                    ]
                  }
                }
                }
                }
                resolve(payload)
                break;
            case "opening_hours":
                if (a[0].opening_hours!=""){
                    var payload = {
                  "userid": params.userid,
                  "context": params.context,
                  "text": a[0].opening_hours,
                  "quick_replies": params.context.quick_replies
                }
                }
                else {
                    var payload = {
                  "userid": params.userid,
                  "context": params.context,
                  "text": params.context.fallback,
                  "quick_replies": params.context.quick_replies
                }
                }
                resolve(payload)
                break;
            default:
                var payload = {
                  "userid": params.userid,
                  "context": params.context,
                  "text": params.context.fallback
                }
                resolve(payload)
                break;
          }
        }
        else if (params.context.action=="find_nearest_location"){
            var min = 99999
            var index = 0;
            for (i=0; i<a.length; i++){
                var distance = Math.sqrt(Math.pow((a[i].lat-params.context.coordinates.lat),2)+Math.pow((a[i].long-params.context.coordinates.long),2))
                console.log("Distance " + distance)
                if (min>distance){
                    min = distance
                    index = i
                }
                console.log(distance)
            }
            console.log(index)
            params.context.location_name = a[index].name
            params.context.quick_replies = [
                    {
                        "content_type":"text",
                        "title": "Opening Hours",
                        "payload": "USER_DEFINED_PAYLOAD"
                    }
                ]
          var payload = {
                  "userid": params.userid,
                  "context": params.context,
                  "text": "",
                  "action": "",
                  "source": "",
                  "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": {
                            "element": {
                                "title": a[index].name,
                                "image_url": a[index].image_url,
                                "default_action": {
                                    "type": "web_url",
                                    "url": a[index].map_url
                                  },
                                  "buttons": [
                                    {
                                      "type": "web_url",
                                      "title": "Get directions",
                                      "url":  a[index].map_url
                                    }
                                    ]
                            }
                        }
                    }
                }
          }
                resolve(payload)
        }
        else {
          resolve(params)
        }
      })
      .catch(function(a) { console.log('process: ', a); });
    })
}
function getCloudantAccount(params) {
  // full cloudant URL - Cloudant NPM package has issues creating valid URLs
  // when the username contains dashes (common in Bluemix scenarios)
  var cloudantUrl = params.cloudant_url

  return require('cloudant')({
    url: cloudantUrl
  });
}
module.exports.main = main;
