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
var count = config.itemsPerQuery;

//Output files
var badURLWStream = fs.createWriteStream(badURLOutput, {flags: 'w+'});
var noURLWStream = fs.createWriteStream(noURLOutput, {flags: 'w+'});

badURLWStream.write("Item ID, Item Name, Image Path\n");
noURLWStream.write("Item ID, Item Name\n");

// Item Queries
console.log("Validating Image Paths for Census Items.");

var lastReturned = 0;
var start = 0;

var itemsToProcess = 0;
var itemsProcessed = 0;

var countURL = "http://census.daybreakgames.com/s:" + serviceID + "/count/ps2:v2/item";

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
        console.log("Checking " + itemsToProcess + " Items.");
        QueryItems();
    })
});

function QueryItems()
{
    //Perform Census Query for Items.
    var url = "http://census.daybreakgames.com/s:" + serviceID + "/get/ps2:v2/item?c:start=" + start + "&c:limit=" + count;

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

            for(var i=0; i<data.item_list.length; i++)
            {
                var item = data.item_list[i];

                if(item.image_path == undefined || item.image_path == null)
                {
                    //This item does not have a defined image path. Add to No URL CSV.
                    if(item.name != undefined)
                    {
                        console.log("Item " + item.name.en + " (Item ID: " + item.item_id + ") does not have an image path!");
                        noURLWStream.write(item.item_id + "," + item.name.en + "\n");
                    }
                    else
                    {
                        console.log("Unknown Item (Item ID: " + item.item_id + ") does not have an image path!");
                        noURLWStream.write(item.item_id + "," + "\n");
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
    var url = "http://census.daybreakgames.com" + item.image_path;
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
                console.log("Item " + item.name.en + " (Item ID: " + item.item_id + ") references a missing image!");
                badURLWStream.write(item.item_id + "," + item.name.en + "," + item.image_path + "\n");
            }

            else
            {
                console.log("Unknown Item (Item ID: " + item.item_id + ") references a missing image!");
                badURLWStream.write(item.item_id + ",," + item.image_path + "\n");
            }
        }

        ItemProcessed();
    });
}

function ItemProcessed()
{
    itemsProcessed++;

    var itemsRemaining = itemsToProcess - itemsProcessed;

    console.log("Items Remaining: " + itemsRemaining);

    //Get the next chunk of items when we have finished processing the current list.
    if(itemsProcessed - start == config.itemsPerQuery)
    {
        start += lastReturned;
        if(lastReturned == config.itemsPerQuery)
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

    console.log("Item Validation Complete");
}