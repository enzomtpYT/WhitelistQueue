
const express = require("express")
const bodyParser = require("body-parser")
const request = require("request")
const fs = require("fs")
const path = require("path")
const cors = require("cors")
const app = express()
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 14,
});

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors({}));

const randomId = require('random-id');

var varibles = process.env
var cookie = varibles['COOKIE']
var hasprotection = varibles['HAS_PROTECTION'] === 'true'
var verifiedcodes = {}
var userId = ''
var queue = []
var assetqueue = []

function GenerateSecureServerCode() {
    var secureid = ""
    while (true) {
        var iddd = randomId(50,'aA0')
        var idsecure = true
        for (var attributename4 in verifiedcodes) {
            if (verifiedcodes[attributename4] === iddd) {
                idsecure = false
                break
            }
        }
        if (idsecure === true) {
            secureid = iddd
            break
        }
    }
    return secureid
}

function RobloxRequest(url,method,callback,istokenrequired) {
    if (istokenrequired === true) {
        request({
            headers: {
                Referer: `https://www.roblox.com`,
                Origin: 'https://www.roblox.com',
                Cookie: `.ROBLOSECURITY=${cookie}; path=/; domain=.roblox.com;`
            },
            url: `https://auth.roblox.com/v2/logout`,
            method: 'POST'
        }, function(err,res) {
            if (res.headers['x-csrf-token']) {
                request({
                    headers: {
                        Referer: `https://www.roblox.com`,
                        Origin: 'https://www.roblox.com',
                        Cookie: `.ROBLOSECURITY=${cookie}; path=/; domain=.roblox.com;`,
                        'Content-Type': 'application/json; charset=utf-8',
                        'X-CSRF-TOKEN': res.headers['x-csrf-token']
                    },
                    url: url,
                    body: JSON.stringify({"expectedCurrency":1,"expectedPrice":0,"expectedSellerId":0}),
                    method: method
                }, callback)
            }
        })
    } else {
        request({
            headers: {
                Referer: `https://www.roblox.com`,
                Origin: 'https://www.roblox.com',
                Cookie: `.ROBLOSECURITY=${cookie}; path=/; domain=.roblox.com;`,
            },
            url: url,
            method: method
        }, callback)
    }
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

RobloxRequest(`https://www.roblox.com/mobileapi/userinfo`, 'GET', function(err,res2,body) {
    if (IsJsonString(body) === true) {
        if (res2.statusCode === 200) {
            body = JSON.parse(body)
            userId = body.UserID
            console.log('WhitelistQueue successfully started up! User Id: ' + userId)
            } else {
            console.error('Your .ROBLOSECURITY cookie is INCORRECT')
        }
    } else {
        console.error('Your .ROBLOSECURITY cookie is INCORRECT')
    }
})

if (hasprotection === true) {
    app.post('/generatenewcode', function (req, res) {
        if (
            req.body.jobid === undefined ||
            req.body.jobid === '' ||
            req.body.jobid === null

        ) {
            return res.json({ success: false, msg: 'Value undefined' });
        };
        if (verifiedcodes[req.body.jobid] != undefined) {
            return res.json({ success: false, msg: 'Code Already Taken' });
        }
        RobloxRequest(
            `https://assetgame.roblox.com/Game/PlaceLauncher.ashx?request=RequestGameJob&placeId=${varibles['PLACE_ID']}&gameId=${req.body.jobid}`,
            'POST',
        function(err,res2,body) {
            if (IsJsonString(body) === true) {
                body = JSON.parse(body)
                if (body.status === 2 || body.status === 6) {
                    var code = GenerateSecureServerCode()
                    verifiedcodes[req.body.jobid] = code
                    res.json({ success: true, msg: code });
                    } else {
                    res.json({ success: false, msg: 'Invalid Job Id' });
                }
            } else {
                res.json({ success: false, msg: 'Unknown Error!' });
            }
        })
    })
}

app.get('/', function (req, res) {
    if (userId != '') {
        res.sendFile(__dirname + '/index.html')
    } else {
        res.sendFile(__dirname + '/error.html')
    }
})

app.post('/addtoqueue',limiter, function (req, res) {

    if (userId === '') {
        return res.json({ success: false, msg: 'Invalid userid' });
    }

    if (
        req.body.assetid === undefined ||
        req.body.assetid === '' ||
        req.body.assetid === null

    ) {
        return res.json({ success: false, msg: 'Value undefined' });
    };
    if (hasprotection === true) {
        if (
            req.body.secretcode === undefined ||
            req.body.secretcode === '' ||
            req.body.secretcode === null
    
        ) {
            return res.json({ success: false, msg: 'Value undefined' });
        };
        var codeexists = false
        for (var attributename in verifiedcodes) {
            if (verifiedcodes[attributename] === req.body.secretcode) {
                codeexists = true
            }
        }
        if (codeexists === false) {
            return res.json({ success: false, msg: 'Secret code invalid' });
        }
    }

    if(queue.length >= 15){
        return res.json({ success: false, msg: 'Queue is full!' });
    }

    if(assetqueue.indexOf(req.body.assetid) !== -1){
        return res.json({ success: false, msg: 'Already in queue!' });
    }

    RobloxRequest(`https://api.roblox.com/marketplace/productinfo?assetId=${req.body.assetid}`, 'GET', function(err,res2,body) {
        if (IsJsonString(body) === true) {
            body = JSON.parse(body)
            if (res2.statusCode === 200) {
                if (body.AssetTypeId === 10) {
                    if (body.IsPublicDomain === true) {
                        RobloxRequest(`https://inventory.roblox.com/v1/users/${userId}/items/Asset/${req.body.assetid}`, 'GET', function(err,res10,body10) {
                            if (IsJsonString(body10) === true) {
                                body10 = JSON.parse(body10)
                                if (res10.statusCode === 200) {
                                    if (body10.data.length === 0) {
                                        queue.push(body.ProductId);
                                        assetqueue.push(req.body.assetid)
                                        console.log('Added ' + req.body.assetid + ' to queue; Position ' + queue.length + '!')
                                        res.json({ success: true, msg: queue.length });
                                        } else {
                                        res.json({ success: false, msg: 'Item Already Owned!' });
                                        }
                                } else {
                                    res.json({ success: false, msg: 'Unknown Error!' });
                                }
                            } else {
                                res.json({ success: false, msg: 'Unknown Error!' });
                            }
                        })
                    } else {
                        res.json({ success: false, msg: 'Not For Sale!' });
                    }
                } else {
                    res.json({ success: false, msg: 'Not A Model!' });
                }
            } else {
                res.json({ success: false, msg: 'Invalid!' });
            }
        } else {
            res.json({ success: false, msg: 'Unknown Error!' });
        }
    })
})

app.get('/getuserid', function (req, res) {
    return res.status(200).send(userId.toString())
})

app.listen(process.env.PORT || 3000, () => {
});


async function test() {
    while (true) {
        await new Promise(r => setTimeout(r, varibles['QUEUE_TIME']));
        queue.forEach(async function(item) {
            RobloxRequest(`https://economy.roblox.com/v1/purchases/products/` + item, 'POST', function(err,res2,body) {
                if (IsJsonString(body) === true) {
                    body = JSON.parse(body)
                    if (res2.statusCode === 200) {
                        if (body.purchased === true) {
                            console.log('Whitelisted: ' + item + '!')
                            queue.pop(item)
                        }
                    }
                } 
            },true)
            await new Promise(r => setTimeout(r, 2000));
        })
    }
}

test()