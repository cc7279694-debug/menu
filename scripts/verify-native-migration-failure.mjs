// Deliberately failed upgrade in a separate test database. Never touches recipio.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { device } from "./android-webview.mjs";
const [adbPath, serial] = process.argv.slice(2);
const d=device(adbPath,serial);
const database=`acceptance_probe_${Date.now()}`;
try {
  await d.coldStart();
  const result=await d.evaluate(`(async()=>{
    const p=window.Capacitor.Plugins.CapacitorSQLite;
    const database=${JSON.stringify(database)};
    await p.addUpgradeStatement({database,upgrade:[{toVersion:1,statements:["CREATE TABLE retained(id INTEGER PRIMARY KEY,title TEXT);"]}]});
    await p.createConnection({database,version:1,encrypted:false,mode:'no-encryption',readonly:false});
    await p.open({database});
    await p.run({database,statement:"INSERT INTO retained VALUES(?,?)",values:[1,'迁移失败不得丢失'],transaction:true});
    const before=await p.query({database,statement:'SELECT * FROM retained',values:[]});
    await p.closeConnection({database,readonly:false});
    await p.addUpgradeStatement({database,upgrade:[{toVersion:2,statements:["ALTER TABLE retained ADD COLUMN notes TEXT;","INVALID MIGRATION STATEMENT"]}]});
    await p.createConnection({database,version:2,encrypted:false,mode:'no-encryption',readonly:false});
    let failure=null;try{await p.open({database});}catch(e){failure=e.message;}
    await p.closeConnection({database,readonly:false});
    await p.createConnection({database,version:1,encrypted:false,mode:'no-encryption',readonly:false});
    await p.open({database});
    const rows=await p.query({database,statement:'SELECT * FROM retained',values:[]});
    const version=await p.query({database,statement:'PRAGMA user_version',values:[]});
    await p.closeConnection({database,readonly:false});
    return {database,failure,before:before.values,rows:rows.values,version:version.values};
  })()`);
  assert(result.failure,"Failed native upgrade must reject");
  writeFileSync(resolve("artifacts/android-daily/migration-failure.json"),JSON.stringify({success:false,...result},null,2));
  assert.deepEqual(result.before,[{id:1,title:"迁移失败不得丢失"}],"Fixture must contain a row before upgrade");
  assert.deepEqual(result.rows,[{id:1,title:"迁移失败不得丢失"}]);
  assert.equal(result.version[0].user_version,1);
  writeFileSync(resolve("artifacts/android-daily/migration-failure.json"),JSON.stringify({success:true,...result},null,2));
  console.log("PASS: real Android plugin rejects invalid isolated upgrade and restores v1 row without clearing data");
} finally {d.close();}
