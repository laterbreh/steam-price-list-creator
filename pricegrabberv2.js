var request = require('request');
var cheerio = require('cheerio');
var sleep = require('sleep');
var fs = require('fs');
var url = require('url');
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
var AppId = 0;
var FinishedArray = [];
var counter = 0;
rl.question('Enter the AppID of the game you would like to get prices for: ', function (appentry) {
    AppId = appentry;
    request('http://api.steampowered.com/ISteamApps/GetAppList/v2', function (err, response, body) {
        body = JSON.parse(body);
        //console.log(body.applist.apps);
        for (x = 0; x < body.applist.apps.length; x++) {
            if (body.applist.apps[x].appid == AppId) {
                var result = body.applist.apps[x].name;
                break;
            }
        }
        rl.question(result + ' is this the game you want? (Y/N)', function (confirmation) {
            if (confirmation == 'Y' || confirmation == 'y') {
                console.log('Ok, lets begin.');
                rl.close();
                main();
            } else {
                console.log('User said No. Exiting...');
                rl.close();
                process.exit(1);
            }
        });
    });

});
function main() {
    console.log('Starting scrape for AppID: ' + AppId);
    request('http://steamcommunity.com/market/search/render/?query=&start=0&count=100000&search_descriptions=0&sort_column=quantity&sort_dir=desc&appid=' + AppId, function (err, response, body) {
        if (!err && response.statusCode == 200) {
            var data = JSON.parse(body.trim());
            data = data.total_count;
            console.log('There are: ' + data + ' marketplace entries. Adjusting parameters to create an items list...');
            console.log('...');
            getItemNames(data, function () {
                fs.writeFile(AppId.toString() + '.json', JSON.stringify(FinishedArray, null, 2), function (err) {
                    console.log('Done');
                    console.log('There were ' + data + ' Prices to get.');
                    console.log('We saved: ' + FinishedArray.length);
                });
            });
        } else {
            console.log('Blocked, waiting...');
            sleep.sleep(5);
            main();
        }
    });
}
function getItemNames(count, callback) {
    //console.log(count + ' Items names remaining to be requested.');
    var totalcount = count;
    var entriesleft = count;
    var start = 0;
    loop();
    function loop() {
        request('http://steamcommunity.com/market/search/render/?query=&start=' + start + '&count=100000&search_descriptions=0&sort_column=quantity&sort_dir=desc&appid=' + AppId, function (err, response, body) {
            if (!err && response.statusCode == 200) {
                var data = JSON.parse(body.trim());
                var cleandata = data.results_html;
                for (i = 0; i < 100; i++) {
                    try {
                        var $ = cheerio.load(cleandata);
                        var part = '#resultlink_' + i;
                        var path = url.parse($(part).prop('href')).path;
                        var name = path.split('/').pop();
                        var code = $(part).html();
                        var $ = cheerio.load(code);
                        var price = $('span.normal_price').not('span.market_table_value').text();
                        if (price.charAt(0) === '$') {
                            price = price.substr(1);
                        }
                        var itemtosave = {
                            name: decodeURIComponent(name),
                            price: price
                        };
                        FinishedArray.push(itemtosave);
                        console.log('Saved: ' + JSON.stringify(itemtosave));
                    } catch (e) {

                    }

                }
                start = start + 100;
                if (start >= entriesleft) {
                    callback();
                } else {
                    console.log('Getting the next 100...');
                    console.log('Done: ' + ((start / totalcount).toFixed(2) * 100) + '%');
                    sleep.sleep(2);
                    loop();
                }
            } else {
                console.log('Blocked. Lets wait 5 seconds then try again.');
                sleep.sleep(5);
                loop();
            }
        });
    }
}
