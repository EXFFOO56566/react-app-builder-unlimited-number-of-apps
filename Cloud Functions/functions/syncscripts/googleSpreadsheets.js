/**
 googleSpreadSheetSync
	— connect to firebase to get list of sheets
googleSpreadSheetGetLastUpdate
	— get sheet last update time
googleSpreadSheetGetData
	— get complete spreadsheet data using googleSpreadSheetGetDataForSheet
googleSpreadSheetGetDataForSheet
    — get data for single sheet
    
 */
const functions = require('firebase-functions');
var qs = require("querystring");
var http = require("https");
var md5 = require('md5');

// The Firebase Admin SDK to access the Firebase Realtime Database.
const admin = require('firebase-admin');

var GoogleSpreadSheets = require('./../googleSpreadSheets/provider');;


//Consts
const googleSpreadsheetsIDSLocation="saasraab/googleSpreadSheet"

//Dataholder
var sitesToProcess=[];

/**
 * googleSpreadSheetSync
 * Main entry points, starts getting list of sheets from firebase
 */
exports.googleSpreadSheetSync=functions.https.onRequest((req, res) => {
    sitesToProcess=[];
    admin.database().ref(googleSpreadsheetsIDSLocation).once('value').then(function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
		   var childData = childSnapshot.val();
		   sitesToProcess.push(childData);
		});
		multiSiteFetcher(res);
    });

    }
);

/**
 * Loop over the SpreadSheets, Siter
 * @param {Response} res 
 */
function multiSiteFetcher(res){
	if(sitesToProcess.length>0){
        var siteToWorkWith=sitesToProcess.pop();
        GoogleSpreadSheets.shouldWeDoASync(siteToWorkWith.id,siteToWorkWith.last_update,function(id){
            //Document should be updated
            updateData(siteToWorkWith,res)
        },function(id,message){
            //Document is already updated or there is an error
            res.write("<br /><br /><br />================Google Spreadsheet ID: "+id+"   "+message+"  ================<br /><br />");
            multiSiteFetcher(res);
        })
		
	}else{
		res.write("<br /><br />All sites has been updated. Nice once")
		res.end();
	}
	
}

/**
 * updateData for single site
 * @param {Object} req 
 * @param {Response} res 
 */
function updateData(req,res){

	var googleSpreadSheetID=req.id;
	var app_slug=req.app_slug
	var last_update=req.last_update;

	res.write("<br /><br /><br />================ Retriving data for Google Spreadsheet ID: "+googleSpreadSheetID+"================");
	res.write("<br />App slug: "+app_slug);
    res.write("<br />Last update: "+last_update);
    GoogleSpreadSheets.spreadsheetGetData(googleSpreadSheetID,function(data){
        res.write(JSON.stringify(data));
        syncCollections(app_slug,data,res,multiSiteFetcher)
    })

    
}

/**
 * Converst string to lowercase and withous special characters
 * @param {Srting} theString 
 */
function createAlias(theString){
  return (theString.replace(/[^a-zA-Z ]/g, "")).toLowerCase();
}

/**
 * Function to save categories
 * @param {String} app_slug App slug
 * @param {Object} data The fetched data
 * @param {Response} res HTTP Response
 * @param {Function} callback 
 */
function syncCollections(app_slug, data, res, callback){
    var collections=data.categories;
    var batch = admin.firestore().batch();
    var index=0;
    collections.forEach(currentItem => {
        index++;
        var singleColleciton = {
            title: currentItem.categoryname,
            description: currentItem.description,
            image: currentItem.imagelink
            };
        batch.set(admin.firestore().collection(app_slug+"_"+currentItem.collectionname).doc(createAlias(currentItem.categoryname)), singleColleciton);
    });

    // Commit the batch
    batch.commit().then(function() {
        res.write("<br />Saving categories was succesfull for app slug: "+app_slug);

        //Find the sections to be synced
        var tabsNamesToFetch=JSON.parse(JSON.stringify(data.sections.sectionname));

        //Start syncing items
        syncItems(app_slug,data,res,callback,tabsNamesToFetch);
    })
    .catch(function(error) {
        res.write("<br />Error writing document: "+error);
        res.write("<br />Collection fetched, but error on save for slug: "+app_slug);
        callback(res);
        
    });
}

/**
 * Check if valid JSON
 * @param {String} str 
 */
function IsJsonString(str) {
    console.log("Srting to validate:"+str);
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

/**
 * 
 * @param {Object} singleItem 
 * @param {Response} res 
 */
function convertObjectStringToObjectInObject(singleItem,res){
    Object.keys(singleItem).map((key)=>{
        if(key.indexOf("object-")==0&&IsJsonString(singleItem[key])){
            //We have declare it as object
            console.log("<br />TO CONV: "+singleItem[key]);
            var elementAsObject=JSON.parse(singleItem[key]);
            singleItem[key]=null;
            singleItem[key.replace("object-","")]=elementAsObject;
        }
    })
    return singleItem;
}


/**
 * 
 * @param {Object} singleItem 
 * @param {Response} res 
 */
function convertCollectionsStringToCollections(singleItem,saveLocation,batch){
    Object.keys(singleItem).map((key)=>{
        if(key.indexOf("collection-")==0&&IsJsonString(singleItem[key])){
            //We have declare it as object
            console.log("<br />TO CONV to COLLe: "+singleItem[key]);
            var elementAsObject=JSON.parse(singleItem[key]);
            singleItem[key]=null;
            
            var colName=key.replace("collection-","");
            var docId="1";
            var colDoc=colName.split("_");
            if(colDoc.length>1){
                colName=colDoc[0];
                docId=colDoc[1]+"";
            }
            console.log(colName);
            console.log(docId);
            batch.set(admin.firestore().collection(saveLocation).doc(createAlias(singleItem.title)).collection(colName).doc(docId), elementAsObject);
        }
    })
}

/**
 * 
 * @param {String} app_slug 
 * @param {Object} data 
 * @param {Response} res 
 * @param {Function} callback 
 * @param {Array} sectionsToSync 
 */
function syncItems(app_slug, data, res, callback,sectionsToSync){
    if(sectionsToSync.length==0){
        callback(res);
    }else{
        //Create batch
        var batch = admin.firestore().batch();

        //Find the section to work with
        var sectionToWorkWith=createAlias(sectionsToSync.pop());
        res.write("<br />sectionToWorkWith: "+sectionToWorkWith);

        //Find the data to work with
        var dataItems=data.sectionsData[sectionToWorkWith];
        res.write("<br />dataItems: "+JSON.stringify(dataItems)+"<br />");

        //Iterate over all the items and create insertable rows
        dataItems.forEach(currentItem => {
            var singleItem=currentItem;
            //TODO
             
            // Create image link
            singleItem.image=singleItem.imagelink;
            
            // Convert object to objects
            convertObjectStringToObjectInObject(singleItem);

             // Convert Arrays to arrays - uses objects
             

             // Create collections
             convertCollectionsStringToCollections(singleItem,app_slug+"_"+sectionToWorkWith,batch)

             // Reference to the category
            //Colection name
            if(currentItem.collectionkey){
                var categoryCollectionName=app_slug+"_"+currentItem.collectionreference;
                res.write("<br />categoryCollectionName:"+categoryCollectionName+"/"+createAlias(currentItem.category));
                res.write("<br />save in:"+app_slug+"_"+sectionToWorkWith+"/"+currentItem.collectionkey);
                singleItem[currentItem.collectionkey]=admin.firestore().collection(categoryCollectionName).doc(createAlias(currentItem.category));
                //batch.set(admin.firestore().collection(app_slug+"_"+sectionToWorkWith).doc(currentItem.collectionkey), admin.firestore().collection(categoryCollectionName).doc(createAlias(currentItem.category)));
             }
             
             

            //Save in batch  
            batch.set(admin.firestore().collection(app_slug+"_"+sectionToWorkWith).doc(createAlias(currentItem.title)), singleItem);

            
       });

       // Commit the batch
        batch.commit().then(function() {
            res.write("<br />Saving item was succesfull for app slug: "+app_slug+" and section name "+sectionToWorkWith);
            syncItems(app_slug,data,res,callback,sectionsToSync);
        })
        .catch(function(error) {
            res.write("<br />Error writing document: "+error);
            res.write("<br />Item fetched, but error on save for slug: "+app_slug+" and section name "+sectionToWorkWith);
            callback(res);
        });
    }

}
