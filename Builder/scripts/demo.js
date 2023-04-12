const replace = require('replace-in-file');
var changes=[{
    files: './src/config/app.js',
    from: /defaultExport.isDemo=false/g,
    to: 'defaultExport.isDemo=true',
},{
    files: './src/config/app.js',
    from: /allowRegistration":false/g,
    to: 'allowRegistration":true',
},{
    files: './src/config/app.js',
    from: /defaultExport.isSaaS=false/g,
    to: 'defaultExport.isSaaS=true',
},{
    files: './src/config/app.js',
    from: 'licenseCode=""',
    to: 'licenseCode="6018e8ff-2120-4136-b721-7a10561f10mk"',
},{
    files: './src/config/app.js',
    from: /AllowGoogleAuth":true/g,
    to: 'AllowGoogleAuth":false',
},{
    files: './src/config/app.js',
    from: '"appName": "React app builder",',
    to: '"appName": "[DEMO] React app builder",',
}]
changes.map((options)=>{
    try {
        const results = replace.sync(options);
        console.log('Replacement results:', results);
      }
      catch (error) {
        console.error('Error occurred:', error);
      }
})