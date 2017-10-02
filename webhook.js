/*this action is triggered by Facebook Messenger for authenticaton purposes
Receives a challenge and a pre-defined token to verify. If successful, returns the challenge.

Default Parameters:
webhook_token

*/

function main(params) {
    challenge = params.uri.slice(params.uri.indexOf('hub.challenge='),params.uri.length)
    if (params.uri.indexOf(params.webhook_token) != -1 ) {
          return {'challenge': challenge.slice(challenge.indexOf('=')+1, challenge.indexOf('&hub'))}
    }
      return {'error': "000"}
}
