//Is is SaaS
exports.isSaaS=false;

//Google Cloud Location
exports.cloudFunctionsArea='us-central1';

//Is testing
exports.isTesting=false;

//Is Server - when you have the script on server
exports.isServer=false;

//SMTP
//SMTP Settings - You can use your gmail accout
exports.SMTP={
    "serverName":"smtp.gmail.com",
    "username":"",
    "password":"",
    "port":465
}

//Email Subjects
exports.subject="You app {appName} is ready";


//Email text
exports.mailText='<p>Hello {userName}!<br />. You can download your {appName} android app apk file on the following <a href="{androidAppLink}">link</a>.  Follow the provided instruction to make your iPhone app.</p>'

