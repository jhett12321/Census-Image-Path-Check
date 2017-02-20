var config = {}

//Used in log files, and results. Should be a singular representation of the endpoint. E.g. "Item" for the Items endpoint.
config.endpointItemDisplayName = "Directive Tree";

//The Census Endpoint, and the named root element holding the endpoint items.
config.endpoint = "/ps2:v2/directive_tree";
config.endpointWrapper = "directive_tree_list";

//Field Keys. Used for output.
config.itemIDField = "directive_tree_id";
config.itemNameField = "name.en";
config.imagePathField = "image_path";

//The base path for images.
config.basePath = "http://census.daybreakgames.com";

//A Census Service ID is required due to the amount of requests: http://census.daybreakgames.com/#service-id
config.dbgServiceID = "example";

//The result CSV files.
config.badURLOutput = "./badURLs.csv";
config.noURLOutput = "./missingURLs.csv";

//The amount of items per census query. Reduce this if you are encountering Census Issues.
config.listItemsPerQuery = 1000;

module.exports = config;