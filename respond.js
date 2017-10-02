/*
/respond is an action triggered by /memorize
takes in final output, quick replies and attachment and sends them to FB Messenger as a response

/respond acts as the last link in the sequence; it triggers no subsequent actions

Default Parameters
messenger_page_token

*/

function main(params) {
    const request = require('request-promise')
    if (params.attachment && params.quick_replies){
        var json = {
                  "recipient":{
                    "id": params.userid
                  },
                  "message":{
                    "attachment": params.attachment,
                    "quick_replies": params.quick_replies
                  }
                }

    }
    else if (params.attachment){
        var json = {
                  "recipient":{
                    "id": params.userid
                  },
                  "message":{
                    "attachment": params.attachment
                  }
                }
    }
    else if (params.quick_replies){
        var json = {
                  "recipient":{
                    "id": params.userid
                  },
                  "message":{
                    "text": params.text,
                    "quick_replies": params.quick_replies
                  }
                }
    }
    else {
        var json = {
                  "recipient":{
                    "id": params.userid
                  },
                  "message":{
                    "text": params.text
                  }
                }
    }
    console.log("formed JSON")
    const reqPromise = request({ method: 'POST',
    //add page access token here
        url: 'https://graph.facebook.com/v2.6/me/messages?access_token=' + params.messenger_page_token,
        json: json
    })
    console.log("sending request")
    return reqPromise
        .then ( res => ({ result: 'message successfully sent'} ))
        .catch ( err => ({ error: 'There was an error sending message:' + JSON.stringify(err)}))
}
