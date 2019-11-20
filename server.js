// Built-in Node.js modules
var fs = require('fs')
var path = require('path')

// NPM modules
var express = require('express');
var sqlite3 = require('sqlite3');
var js2xmlparser = require("js2xmlparser");
var bodyParser = require('body-parser');

// Initialize the server
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
var port = 8000;
var server = app.listen(port);
console.log("Server running on port "+port);

// Open the database
var db_filename = path.join(__dirname, 'stpaul_crime.sqlite3');
var db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
    }
});

//Request to get the codes from the DB
app.get("/codes", (req,res) => {
    getCodesFromDB(req.query.code, req.query.format).then((data) => {
        if(req.query.format == 'xml') {
            res.writeHead(200, {'Content-Type': 'application/xml'});
        }
        else {
            res.writeHead(200, {'Content-Type': 'application/json'});
        }
        res.write(data);
        res.end();
    }).catch((err) => {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.write(err);
        res.end();
    })
});

//Function to get the codes from the DB
function getCodesFromDB(code, format) {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM Codes";
        if(code != null) {
            sql = sql + " WHERE code in (" +code+")"
        }
    
        db.all(sql, (err, data) => {
            if(err) {
                reject(err);
            }
            else {
                let output = {};
                for (thisCode of data) {
                    let thisCodeId = "C" + thisCode.code;
                    output[thisCodeId] = thisCode['incident_type'];
                }
                
                if (format == "json" || format == null) {
                    resolve(JSON.stringify(output));
                }
                else if (format == "xml") {
                    resolve(js2xmlparser.parse("codes", output));
                }
                else {
                    reject("Format was not correct");
                }
            }
        });
    });
}

//Request to get the neighborhoods from the DB
app.get("/neighborhoods", (req,res) => {
    getNeighborhoodFromDB(req.query.id, req.query.format).then((data) => {
        if(req.query.format == 'xml') {
            res.writeHead(200, {'Content-Type': 'application/xml'});
        }
        else {
            res.writeHead(200, {'Content-Type': 'application/json'});
        }
        res.write(data);
        res.end();
    }).catch((err) => {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.write(err);
        res.end();
    })
});

//Function to get the neighborhood from the DB
function getNeighborhoodFromDB(id, format) {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM Neighborhoods";
        if(id != null) {
            sql = sql + " WHERE neighborhood_number in (" +id+")"
        }
    
        db.all(sql, (err, data) => {
            if(err) {
                reject(err);
            }
            else {
                let output = {};
                for (thisNeighborhood of data) {
                    let thisNeighborhoodId = "N" + thisNeighborhood['neighborhood_number'];
                    output[thisNeighborhoodId] = thisNeighborhood['neighborhood_name'];
                }
                
                if (format == "json" || format == null) {
                    resolve(JSON.stringify(output));
                }
                else if (format == "xml") {
                    resolve(js2xmlparser.parse("neighborhoods", output));
                }
                else {
                    reject("Format was not correct");
                }
            }
        });
    });
}


//Request to get the incidents from the DB
app.get("/incidents", (req,res) => {
    getIncidentsFromDB(req.query.start_date, req.query.end_date, req.query.code, req.query.grid, req.query.neighborhood, req.query.limit, req.query.format).then((data) => {
        if(req.query.format == 'xml') {
            res.writeHead(200, {'Content-Type': 'application/xml'});
        }
        else {
            res.writeHead(200, {'Content-Type': 'application/json'});
        }
        res.write(data);
        res.end();
    }).catch((err) => {
        res.writeHead(500, {'Content-Type': 'text/plain'});
        res.write(err);
        res.end();
    })
});

//Function to get the incidents from the DB
function getIncidentsFromDB(start_date, end_date, code, grid, neighborhood,
    limit, format) {
        return new Promise((resolve, reject) => {
            let sql = "SELECT * FROM Incidents";
            let conditions = [];

            //Check all of the conditions
            if(code != null) {
                conditions.push(`code IN (${code})`);
            }
            if(grid != null) {
                conditions.push(`police_grid IN (${grid})`);
            }
            if(start_date != null) {
                conditions.push(`date_time >= date('${start_date}')`)
            }
            if(end_date != null) {
                conditions.push(`date_time <= date('${end_date}')`)
            }
            if(neighborhood != null) {
                conditions.push(`neighborhood_number IN (${neighborhood})`)
            }

            //Add the conditions to the sql string
            if(conditions.length > 0) {
                sql = sql+" WHERE "+conditions.join(" AND ");
            }

            //Add the limit
            if(limit == null) {
                limit = 10000;
            }
            sql = sql + " LIMIT "+limit;

        
            db.all(sql, (err, data) => {
                if(err) {
                    reject(err);
                }
                else {
                    let output = {};
                    for (thisIncident of data) {
                        let thisIncidentId = "I" + thisIncident["case_number"];
                        output[thisIncidentId] = {
                            "date": (thisIncident["date_time"]).split("T")[0],
                            "time": (thisIncident["date_time"]).split("T")[1],
                            "code": thisIncident["code"],
                            "incident": thisIncident["incident"],
                            "police_grid": thisIncident["police_grid"],
                            "neighborhood_number": thisIncident["neighborhood_number"],
                            "block": thisIncident["block"]
                        };
                    }
                    
                    if (format == "json" || format == undefined) {
                        resolve(JSON.stringify(output));
                    }
                    else if (format == "xml") {
                        resolve(js2xmlparser.parse("incidents", output));
                    }
                    else {
                        reject("Format should be json or xml");
                    }
                }
            });
        });
    }

// curl -X PUT "http://localhost:8000/new-incident?case_number=30&date=2018-11-11&time=11:11:11.111&incident=Nothing&code=40&police_grid=20&neighborhood_number=30&block=Here"
app.put("/new-incident", (req,res) => {
    addIncident(req.query.case_number, req.query.date, req.query.time, req.query.code, req.query.incident, req.query.police_grid,
        req.query.neighborhood_number, req.query.block).then((data)=>{
            res.writeHead(200);
            res.end();
        }).catch((err)=>{
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.write(err);
            res.send();
        });
});

function addIncident(case_number, date, time, code, incident, police_grid,
    neighborhood_number, block) {
    return new Promise((resolve, reject) => {
        if(!validateInt(case_number)) {
            reject("Case number should be an int.");
            return;
        }
        if(!validateInt(code)) {
            reject("Code should be an int.");
            return;
        }
        if(!validateDate(date)) {
            reject("Date should be in the format YYYY-MM-DD");
            return;
        }
        if(!validateTime(time)) {
            reject("Time should be in the format HH:MM:SS.000");
            return;
        }
        if(!validateString(incident)) {
            reject("Incident should contain a value without any ' characters.");
            return;
        }
        if(!validateString(block)) {
            reject("Block should contain a value without any ' characters.");
            return;
        }
        if(!validateInt(police_grid)) {
            reject("Police grid should be an int.");
            return;
        }
        if(!validateInt(neighborhood_number)) {
            reject("Neighborhood number should be an int.");
            return;
        }

        let sql = `
        INSERT INTO Incidents (case_number,date_time,code,incident,police_grid,neighborhood_number,block)
        VALUES ('${case_number}','${date+"T"+time}',${code},'${incident}',${police_grid},${neighborhood_number},'${block}');
        `;
        db.run(sql, (err) => {
            if(err) {
                reject("Incident already exists in database");
            }
            else{
                resolve();
            }
        });


        
    });
}

function validateInt(str){
    if(str == undefined)
        return false;
    str = str.toString();
    return str.match(/^\d+$/);
}

function validateDate(str){
    if(str == undefined)
        return false;
    return str.match(/^\d{4}-\d{2}-\d{2}$/);
}

function validateTime(str){
    if(str == undefined)
        return false;
    return str.match(/^\d{2}:\d{2}:\d{2}(\.\d+)?/);
}

function validateString(str) {
    if(str == undefined)
        return false;
    return str.match(/^[^']*$/);
}