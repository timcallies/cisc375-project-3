// Built-in Node.js modules
var fs = require('fs')
var path = require('path')
var bodyParser = require('body-parser');

// NPM modules
var express = require('express');
var sqlite3 = require('sqlite3');
var js2xmlparser = require("js2xmlparser");


// Initialize the server
var app = express();
var port = 8000;
var server = app.listen(port);
console.log("Server running on port "+port);
app.use(bodyParser.urlencoded({extended: true}));

// Open the database
var db_filename = path.join(__dirname, 'stpaul_crime.sqlite3');
var db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
        //addIncident(5,"2019-11-14","00:00:00",404,"Robbery",2,2,"SUMMIT AVE");
    }
});


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
                
                if (format === "json" || format === null) {
                    resolve(JSON.stringify(output));
                }
                else if (format === "xml") {
                    resolve(js2xmlparser.parse("codes", output));
                }
                else {
                    reject("Format was not correct");
                }
            }
        });
    });
}

function getNeighborhoodFromDB(id, format) {
    return new Promise((resolve, reject) => {
        let sql = "SELECT * FROM Neighborhoods";
        if(code != null) {
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
                
                if (format === "json" || format === null) {
                    resolve(JSON.stringify(output));
                }
                else if (format === "xml") {
                    resolve(js2xmlparser.parse("neighborhoods", output));
                }
                else {
                    reject("Format was not correct");
                }
            }
        });
    });
}

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

            console.log("sql");
        
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
                    
                    if (format === "json" || format === null) {
                        resolve(JSON.stringify(output));
                    }
                    else if (format === "xml") {
                        resolve(js2xmlparser.parse("incidents", output));
                    }
                    else {
                        reject("Format was not correct");
                    }
                }
            });
        });
    }

function addIncident(case_number, date, time, code, incident, police_grid,
    neighborhood_number, block) {
    return new Promise((resolve, reject) => {
        let sql = `
            INSERT INTO Incidents (case_number,date_time,code,incident,police_grid,neighborhood_number,block)
            VALUES ('${case_number}','${date+"T"+time}',${code},'${incident}',${police_grid},${neighborhood_number},'${block}');
        `;
		
		


        db.run(sql, (err) => {
        });
        
    });
}