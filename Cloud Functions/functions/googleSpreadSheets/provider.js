var request = require('request');
const googleAPI='https://spreadsheets.google.com/feeds/list/';

/**
 * Function to check if we need to do syn on the file
 * @param {Number} id id of the google sheet
 * @param {String} documentLastUpdate update time
 * @param {Function} scallback Succesfull callback
 * @param {Function} ecallback Error Callback
 */
function shouldWeDoASync(id,documentLastUpdate,scallback,ecallback){
    url = googleAPI + id + '/1/public/values?alt=json';
    request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var data = JSON.parse(response.body);
            if(data&&data.feed&&data.feed.updated){
                if(documentLastUpdate!=data.feed.updated.$t){
                    //Ok, we have an update
                    scallback(id);
                }else{
                    ecallback(id,"No need for sync. Document not updated since last update");
                }
            }else{
                ecallback(id,"Incorrect data structure");
            }
        }else{
            console.log(url);
            console.log(JSON.stringify(response));
            console.log(error);
            ecallback(id,"Incorrect response");
        }
    });
}
exports.shouldWeDoASync=shouldWeDoASync;

/**
 * Function to get all the data, later calls getRestOfTheData to compleete the process
 * @param {Number} spreadSheetID Google sheet id
 * @param {Functioni} allDataCallback Receives all the data from all the sheets
 */
function spreadsheetGetData(spreadSheetID,allDataCallback){
    //Get the initial - "Sections" sheet
    spreadsheetGetDataFromSingleSheet(1,spreadSheetID,function(sectionsData){
        //Get the "Categories" data
        spreadsheetGetDataFromSingleSheet(2,spreadSheetID,function(categoriesData){
            var tabsToFetch=JSON.parse(JSON.stringify(sectionsData.columns.taborder));
            var tabsNamesToFetch=JSON.parse(JSON.stringify(sectionsData.columns.sectionname));
            console.log("---- tabsToFetch ----");
            console.log(JSON.stringify(tabsToFetch))
            var dataSoFar={
                sections:sectionsData.columns,
                categories:categoriesData.rows,
                sectionsData:{}
            }
            //allDataCallback(dataSoFar);
            getRestOfTheData(spreadSheetID,dataSoFar,allDataCallback,tabsToFetch,tabsNamesToFetch);
        })
    })
        //Then, get all the other sections
}
exports.spreadsheetGetData=spreadsheetGetData;

/**
 * Converst string to lowercase and withous special characters
 * @param {Srting} theString 
 */
function createAlias(theString){
  return (theString.replace(/[^a-zA-Z ]/g, "")).toLowerCase();
}

/**
 * Functioin to retrive data for single sheet
 * @param {Number} sheetIndex Google spreashhet sheet index 1 , 2, 3, 4
 * @param {Number} spreadSheetID Google sheet number
 * @param {Function} callback Callback function that receives the data
 */
function spreadsheetGetDataFromSingleSheet(sheetIndex,spreadSheetID,callback){
    url = googleAPI + spreadSheetID +'/'+ sheetIndex +'/public/values?alt=json';
    var showColumns=true;
    var showRows=true;
    var query = '';
    var useIntegers = true
    request(url, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var data = JSON.parse(response.body);
            var responseObj = {};
            var rows = [];
            var columns = {};
        if (data && data.feed && data.feed.entry) {
            for (var i = 0; i < data.feed.entry.length; i++) {
              var entry = data.feed.entry[i];
              var keys = Object.keys(entry);
              var newRow = {};
              var queried = false;
              for (var j = 0; j < keys.length; j++) {
                var gsxCheck = keys[j].indexOf('gsx$');
                if (gsxCheck > -1) {
                  var key = keys[j];
                  var name = key.substring(4);
                  var content = entry[key];
                  var value = content.$t;
                  if (value.toLowerCase().indexOf(query.toLowerCase()) > -1) {
                    queried = true;
                  }
                  if (useIntegers === true && !isNaN(value)) {
                    value = Number(value);
                  }
                  newRow[name] = value;
                  if (queried === true) {
                    if (!columns.hasOwnProperty(name)) {
                      columns[name] = [];
                      columns[name].push(value);
                    } else {
                      columns[name].push(value);
                    }
                  }
                }
              }
              if (queried === true) {
                rows.push(newRow);
              }
            }
            if (showColumns === true) {
              responseObj['columns'] = columns;
            }
            if (showRows === true) {
              responseObj['rows'] = rows;
            }
            callback(responseObj);
          } else {
            callback({columns:null});
          }
    }else{
        callback({columns:null});
    }});
}

/**
 * 
 * @param {Number} spreadSheetID Google spreashhet sheet index 1 , 2, 3, 4
 * @param {Object} dataSoFar The builder object so far
 * @param {Function} allDataCallback Receives all the data from all the sheets
 * @param {Array} tabsToFetch Array of sheets to fetch
 */
function getRestOfTheData(spreadSheetID,dataSoFar,allDataCallback,tabsToFetch,tabsNamesToFetch){
    if(tabsToFetch.length==0){
        allDataCallback(dataSoFar);
    }else{
        var indexToFetch=tabsToFetch.pop();
        var tabName=createAlias(tabsNamesToFetch.pop());
        spreadsheetGetDataFromSingleSheet(indexToFetch,spreadSheetID,function(runtimeData){
            dataSoFar.sectionsData[tabName]=(runtimeData.rows);
            getRestOfTheData(spreadSheetID,dataSoFar,allDataCallback,tabsToFetch,tabsNamesToFetch);
        });
    }
}



