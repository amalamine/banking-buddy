/*
/memorize is triggered by /process upon receiving input from Watson Conversation and resolving any pending actions
stores the returned context in a Cloudant db to be referenced at the next instance of the conversation

the output is passed to /memorize as follows:
{
"userid": userid,
"text": output received from conversation,
"quick_replies": optional quick replies to be sent,
"attachment": optional attachment to be sent
}

Default Parameters
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
    "_rev",
    "_id"
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
            console.log("fetching _rev for user")
            console.log(response.docs[0]._rev)
            response = {
                "_id": response.docs[0]._id,
                '_rev': response.docs[0]._rev,
                'userid': message.userid,
                'context': message.context};
            console.log("doc:")
            console.log(response)
            console.log("directing to update")
            resolve(insert(cloudantDb, response, message))
        }
        else {
            console.log("no user with this id")
            reject("No user with this id")
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
      console.log("attempting update")
    cloudantDb.insert(doc, function(error, response) {
      if (!error) {
        console.log("success", response);
        var parameters = {
                'userid': message.userid,
                'text': message.text,
                'quick_replies': message.context.quick_replies,
                'attachment': message.attachment
        }
            resolve(parameters);
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
