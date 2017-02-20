//Modules
var http = require('http');
var request = require('request');
var progress = require('progress');
var url = require('url');
var fs = require('fs');

//Config
var config = require('./config.js');
var serviceID = config.dbgServiceID;

var badURLOutput = config.badURLOutput;
var noURLOutput = config.noURLOutput;
var count = config.listItemsPerQuery;

//Output files
var badURLWStream = fs.createWriteStream(badURLOutput, {flags: 'w+'});
var noURLWStream = fs.createWriteStream(noURLOutput, {flags: 'w+'});

badURLWStream.write(config.endpointItemDisplayName + " ID, " + config.endpointItemDisplayName + " Name, Image Path\n");
noURLWStream.write(config.endpointItemDisplayName + " ID, " + config.endpointItemDisplayName + " Name\n");

// Item Queries
console.log("Validating Image Paths for Census endpoint: " + config.endpoint);

var lastReturned = 0;
var start = 0;

var itemsToProcess = 0;
var itemsProcessed = 0;

var countURL = "http://census.daybreakgames.com/s:" + serviceID + "/count" + config.endpoint;

http.get(countURL, function(res)
{
    var body = '';
    res.on('data', function(chunk)
    {
       body += chunk;
    });

    res.on('end', function()
    {
        var data = null;

        //Try parsing the returned data as JSON. If it fails, then something went wrong with the request.
        try
        {
            data = JSON.parse(body);
        }
        catch(error)
        {
            console.log("A census query failed. Dataset may not be complete.");
        }

        itemsToProcess = data.count;
        console.log("Validating " + itemsToProcess + " Image paths.");
        QueryItems();
    })
});

function QueryItems()
{
    //Perform Census Query on endpoint items.
    var url = "http://census.daybreakgames.com/s:" + serviceID + "/get/" + config.endpoint + "?c:start=" + start + "&c:limit=" + count;

    http.get(url, function(res)
    {
        var body = '';
        res.on('data', function(chunk)
        {
            body += chunk;
        });

        res.on('end', function()
        {
            var data = null;

            //Try parsing the returned data as JSON. If it fails, then something went wrong with the request.
            try
            {
                data = JSON.parse(body);
            }
            catch(error)
            {
                console.log("A census query failed. Dataset may not be complete.")
            }

            lastReturned = data.returned;

            for(var i=0; i<data[config.endpointWrapper].length; i++)
            {
                var item = data[config.endpointWrapper][i];

                if(item[config.imagePathField] == undefined || item[config.imagePathField] == null)
                {
                    //This item does not have a defined image path. Add to No URL CSV.
                    if(item.name != undefined)
                    {
                        var itemName = config.itemNameField.split('.').reduce(index, item);

                        console.log(config.endpointItemDisplayName + " " + itemName + " (" + config.endpointItemDisplayName + " ID: " + item[config.itemIDField] + ") does not have an image path!");
                        noURLWStream.write(item[config.itemIDField] + "," + itemName + "\n");
                    }
                    else
                    {
                        console.log("Unknown " + config.endpointItemDisplayName + " (" + config.endpointItemDisplayName + " ID: " + item[config.itemIDField] + ") does not have an image path!");
                        noURLWStream.write(item[config.itemIDField] + "," + "\n");
                    }

                    ItemProcessed();
                    continue;
                }

                //This item has an image path. Check to see if it is valid, or 404's.
                QueryImagePath(item);
            }
        })
    });
}

function QueryImagePath(item)
{
    var url = config.basePath + item[config.imagePathField];
    request(url, {method: 'HEAD'}, function(err, res, body)
    {
        if(err)
        {
            QueryImagePath(item);
            return;
        }

        if(res.statusCode != 200)
        {
            //This item references a image path that does not exist.
            if(item.name != undefined)
            {
                var itemName = config.itemNameField.split('.').reduce(index, item);

                console.log(config.endpointItemDisplayName + " " + itemName + " (" + config.endpointItemDisplayName + " ID: " + item[config.itemIDField] + ") references a missing image!");
                badURLWStream.write(item[config.itemIDField] + "," + itemName + "," + item[config.imagePathField] + "\n");
            }

            else
            {
                console.log("Unknown " + config.endpointItemDisplayName + " (" + config.endpointItemDisplayName + " ID: " + item[config.itemIDField] + ") references a missing image!");
                badURLWStream.write(item[config.itemIDField] + ",," + item[config.imagePathField] + "\n");
            }
        }

        ItemProcessed();
    });
}

function ItemProcessed()
{
    itemsProcessed++;

    var itemsRemaining = itemsToProcess - itemsProcessed;

    console.log(config.endpointItemDisplayName +"s Remaining: " + itemsRemaining);

    //Get the next chunk of items when we have finished processing the current list.
    if(itemsProcessed - start == config.listItemsPerQuery)
    {
        start += lastReturned;
        if(lastReturned == config.listItemsPerQuery)
        {
            QueryItems();
        }
    }

    if(itemsRemaining <= 0)
    {
        ProcessingComplete();
    }
}

function ProcessingComplete()
{
    noURLWStream.end();
    badURLWStream.end();

    console.log(config.endpointItemDisplayName + " Validation Complete");
}

function index(obj,i)
{
    return obj[i]
}