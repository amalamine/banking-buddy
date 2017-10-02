/*
/remember is triggered by /listen upon receiving input from Facebook Messenger
checks the package's Cloudant database for any previously stored context for the same sender
if none, creates a record with the userid and empty context

Default Parameters:
cloudant_url
db_name

*/

function main(message) {
  var cloudantOrError = getCloudantAccount(message);
  if (typeof cloudantOrError !== 'object') {
    return Promise.reject(cloudantOrError);
  }
  var cloudant = cloudantOrError;
  var dbName = message.db_name;
  var query = {
  "selector": {
    "userid": message.userid
  },
  "fields": [
    "context"
  ],
  "sort": [
    {
      "_id": "asc"
    }
  ]
};

  if(!dbName) {
    return Promise.reject('dbname is required.');
  }
  if(!query) {
    return Promise.reject('query field is required.');
  }
  var cloudantDb = cloudant.use(dbName);

  return queryIndex(cloudantDb, query, message)
}

function queryIndex(cloudantDb, query, message) {
  return new Promise(function(resolve, reject) {
    cloudantDb.find(query, function(error, response) {
      if (!error) {
        console.log('success', response);
        console.log('here ', response.docs[0])
        if (response.docs[0]){
            console.log("fetching existing user")
            console.log(response)
           if (message.attachment){
            var new_context = response.docs[0].context
            new_context.persona = message.persona
            response = {
                'userid': message.userid,
                'text': message.text,
                'attachment': message.attachment,
                'context': new_context};
            resolve(response);
            }
            else {
                var new_context = response.docs[0].context
                new_context.persona = message.persona
                response = {
                    'userid': message.userid,
                    'text': message.text,
                    'context': new_context};
                resolve(response);
            }
        }
        else {
            console.log("inserting new user")
            resolve(insert(cloudantDb, query, message))
        }
      }
      else {
        console.log('error', error);
        reject(error);
      }
    });
  })
}

function insert(cloudantDb, doc, message) {
  return new Promise(function(resolve, reject) {
    cloudantDb.insert({'userid': message.userid, 'context': {}}, function(error, response) {
      if (!error) {
        console.log("success", response);
        if (message.attachment){
            response = {
                'userid': message.userid,
                'text': message.text,
                'attachment': message.attachment,
                'context': {
                    'persona': message.persona
                }};
            resolve(response);
        }
        else {
            response = {
                'userid': message.userid,
                'text': message.text,
                'context': {
                    'persona': message.persona
                }};
            resolve(response);
        }
      } else {
        console.log("error", error);
        reject(error);
      }
    });
  });
}

function getCloudantAccount(message) {
  // full cloudant URL - Cloudant NPM package has issues creating valid URLs
  // when the username contains dashes (common in Bluemix scenarios)
  var cloudantUrl = message.cloudant_url

  return require('cloudant')({
    url: cloudantUrl
  });
}
