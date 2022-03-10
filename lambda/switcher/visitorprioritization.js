/*
 * A flag indicating whether the origin is ready to accept traffic.
 * Unlike Lambda@Edge, CloudFront Functions doesn't support network call.
 * So if you want to change this value, you need to modify then re-deploy
 * this function.
 */
var originAcceptingTraffic = true;

/*
 * The origin hit rate (a value between 0 and 1) specifies a percentage of
 * users that go directly to the origin, while the rest go to
 * a "waiting room." Premium users always go to the origin.  if you want to
 * change this value, you need to modify then re-deploy this function.
 */
var originHitRate = 1.0;

/*
 * Waiting Room Redirect URL
 */

var FullClose = `https://FullCLOSE SITE` // Change the redirect URL to your choice

function handler(event) {
    var request = event.request;
    var uri = event.request.uri;
    var cookies = event.request.cookies;
    var premiumUserCookieValue = 'some-secret-cookie-value';


    if(!originAcceptingTraffic) {
        console.log("Origin is not accepting any traffic. " +
                    "All requests go to the Full close waiting room.");
        var response = {
                 statusCode: 302,
                 statusDescription: 'Found',
                 headers:
                         { "location": { "value": FullClose } }
                     }
        return response;
    }

    // Check Whether Cookie is available or not.
    // in this sample it checks premium-user-cookie. This name is case
    // sensitive, so if you use upper charactor, please modify name parameter.
    if(cookies.hasOwnProperty("premium-user-cookie") && cookies["premium-user-cookie"].value === premiumUserCookieValue){
        console.log(`Verified Premium user cookie, this request goes to Origin cause it has Cookie with a valid secret value of "${premiumUserCookieValue}".`);
        return request;
      }

    // Lotterly to check go to origin
    if (Math.random() >= originHitRate) {
        console.log("An unlucky user goes to the waiting room.");
        request.uri = '/waitingroom.html';
        return request;
    }
    console.log("A lucky user goes to the origin.");
    return request;
};