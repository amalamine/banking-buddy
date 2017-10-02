/*
/listen is an action triggered by messages received through Facebook Messenger
takes in Messenger's input and outputs a JSON file containing the user's id, input text, and any attachments sent
listen also retrieves the user's personal informaton and appends them to context

/listen acts as a trigger for a sequence of actions leading up to sending a response back to the user

Default Parameters:
messenger_page_token

*/
function main(params) {
    const request = require('request-promise')
    if (params){
        console.log('RECEIVED:')
        console.log(JSON.stringify(params))
        console.log('RECEIVED:')
        console.log(params.entry[0].messaging[0])

        //get user's name
        const reqPromise = request({
            method: 'GET',
            url: 'https://graph.facebook.com/v2.6/' + params.entry[0].messaging[0].sender.id + "?fields=first_name,last_name,locale,gender&access_token=" + params.messenger_page_token
        })
        console.log("sending request")
        return reqPromise
            .then (function(res){
                console.log(res)
                res = JSON.parse(res)
                if (params.entry[0].messaging[0].message.attachments){
                    return {
                    'userid': params.entry[0].messaging[0].sender.id,
                    'text': params.entry[0].messaging[0].message.text,
                    'attachment': params.entry[0].messaging[0].message.attachments[0],
                    'persona': {
                        'first_name': res.first_name,
                        'last_name': res.last_name,
                        'gender': res.gender,
                        'preferred_lang': res.locale
                    }
                    }
                }
                else {
                    return {
                    'userid': params.entry[0].messaging[0].sender.id,
                    'text': params.entry[0].messaging[0].message.text,
                    'persona': {
                        'first_name': res.first_name,
                        'last_name': res.last_name,
                        'gender': res.gender,
                        'preferred_lang': res.locale
                    }
                    }
                }
            })
            .catch ( err => ({ error: 'There was an error getting user information:' + JSON.stringify(err)}))
    }
    return {'error': "no input"}
}
