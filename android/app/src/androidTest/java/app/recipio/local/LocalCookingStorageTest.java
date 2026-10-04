package app.recipio.local;

import static org.junit.Assert.*;
import android.content.Context;
import android.content.ContextWrapper;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.*;
import java.lang.reflect.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;

/** Isolated generated databases only. Never resets the installed application's database. */
@RunWith(AndroidJUnit4.class)
public class LocalCookingStorageTest {
    private File root, file;
    private SQLiteDatabase db;
    @Before public void setup()throws Exception {
        Context target=InstrumentationRegistry.getInstrumentation().getTargetContext();
        root=new File(target.getCacheDir(),"cooking-tests-"+UUID.randomUUID());assertTrue(root.mkdir());
        file=new File(root,"fixture.db");db=SQLiteDatabase.openOrCreateDatabase(file,null);db.setForeignKeyConstraintsEnabled(true);
        db.execSQL("CREATE TABLE recipes(id TEXT PRIMARY KEY NOT NULL,title TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT,total_minutes INTEGER,servings REAL,calories_per_serving REAL,cover_path TEXT,notes TEXT NOT NULL DEFAULT '')");
        db.execSQL("CREATE TABLE recipe_ingredients(recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,position INTEGER,name TEXT,amount TEXT,PRIMARY KEY(recipe_id,position))");
        db.execSQL("CREATE TABLE recipe_steps(recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,position INTEGER,instruction TEXT,image_path TEXT,PRIMARY KEY(recipe_id,position))");
        db.execSQL("CREATE TABLE recipe_preparations(recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,position INTEGER,instruction TEXT,minutes INTEGER,timing_text TEXT,PRIMARY KEY(recipe_id,position))");
        db.execSQL("CREATE TABLE recipe_key_tips(recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,position INTEGER,instruction TEXT,step_number INTEGER,PRIMARY KEY(recipe_id,position))");
        db.execSQL("CREATE TABLE recipe_changes(id TEXT PRIMARY KEY,recipe_id TEXT REFERENCES recipes(id) ON DELETE CASCADE,changed_at TEXT,before_json TEXT,after_json TEXT)");
        db.execSQL("CREATE TABLE backup_restore_state(id INTEGER PRIMARY KEY CHECK(id=1),operation_id TEXT NOT NULL,generation_id TEXT NOT NULL,data_sha256 TEXT NOT NULL,committed_at TEXT NOT NULL)");
        db.execSQL("INSERT INTO recipes VALUES('old','啤酒鸭 🍚','2026-10-01T00:00:00.000Z','2026-10-02T00:00:00.000Z',NULL,30,2,200,NULL,'第一行\n第二行')");
        db.execSQL("INSERT INTO recipe_ingredients VALUES('old',0,'糖','30g')");db.execSQL("INSERT INTO recipe_steps VALUES('old',0,'焖煮',NULL)");
        db.execSQL("INSERT INTO recipe_preparations VALUES('old',0,'腌制',20,'提前')");db.execSQL("INSERT INTO recipe_key_tips VALUES('old',0,'小火',1)");
        db.execSQL("INSERT INTO recipe_changes VALUES('change','old','2026-10-02T00:00:00.000Z','{\"coverPath\":null,\"steps\":[]}','{\"coverPath\":null,\"steps\":[]}')");
        db.execSQL("INSERT INTO backup_restore_state VALUES(1,?,?,?,'2026-10-02T00:00:00.000Z')",new Object[]{UUID.randomUUID().toString(),UUID.randomUUID().toString(),"a".repeat(64)});db.setVersion(3);
    }
    @After public void cleanup()throws Exception {if(db!=null&&db.isOpen())db.close();LocalBackupArchive.deleteOwnedTree(root);}
    private JSONArray migration()throws Exception {
        try(InputStream input=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("cooking-migrations.json")){
            ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] buffer=new byte[4096];int n;while((n=input.read(buffer))!=-1)bytes.write(buffer,0,n);
            return new JSONArray(bytes.toString(StandardCharsets.UTF_8.name()));
        }
    }
    private void migrate(boolean fail)throws Exception {
        db.beginTransaction();try{JSONArray statements=migration();for(int i=0;i<statements.length();i++)db.execSQL(statements.getString(i));db.setVersion(4);
            if(fail)db.execSQL("INSERT INTO intentionally_missing_table VALUES(1)");db.setTransactionSuccessful();}finally{db.endTransaction();}
    }
    private List<String> snapshot(){
        List<String> rows=new ArrayList<>();for(String table:new String[]{"recipes","recipe_ingredients","recipe_steps","recipe_preparations","recipe_key_tips","recipe_changes","backup_restore_state"}){
            try(Cursor c=db.rawQuery("SELECT * FROM "+table+" ORDER BY 1,2",null)){while(c.moveToNext()){JSONArray row=new JSONArray();for(int i=0;i<c.getColumnCount();i++)row.put(c.isNull(i)?JSONObject.NULL:c.getString(i));rows.add(table+row);}}
        }return rows;
    }
    private long count(String table){try(Cursor c=db.rawQuery("SELECT COUNT(*) FROM "+table,null)){assertTrue(c.moveToFirst());return c.getLong(0);}}
    @Test public void realSqliteIncrementalMigrationRetainsAllOldFieldsAndMetadata()throws Exception {
        List<String> before=snapshot();migrate(false);assertEquals(4,db.getVersion());assertEquals(before,snapshot());assertEquals(0,count("cooking_records"));
        try(Cursor c=db.rawQuery("PRAGMA foreign_key_check",null)){assertEquals(0,c.getCount());}
    }
    @Test public void failedMigrationRollsBackSchemaVersionAndData()throws Exception {
        List<String> before=snapshot();assertThrows(android.database.SQLException.class,()->migrate(true));assertEquals(3,db.getVersion());assertEquals(before,snapshot());
        try(Cursor c=db.rawQuery("SELECT name FROM sqlite_master WHERE name='cooking_records'",null)){assertEquals(0,c.getCount());}
    }
    @Test public void constraintsAndCascadeAreRealNativeSqlite()throws Exception {
        migrate(false);assertThrows(android.database.SQLException.class,()->db.execSQL("INSERT INTO cooking_records VALUES('bad','missing','2026-10-04T00:00:00.000Z',NULL,NULL,NULL)"));
        assertThrows(android.database.SQLException.class,()->db.execSQL("INSERT INTO cooking_records VALUES('bad','old','2026-10-04T00:00:00.000Z',NULL,'not-valid',NULL)"));
        db.execSQL("INSERT INTO cooking_records VALUES('record','old','2026-10-04T00:00:00.000Z',NULL,NULL,NULL)");assertEquals(1,count("cooking_records"));
        db.execSQL("DELETE FROM recipes WHERE id='old'");assertEquals(0,count("cooking_records"));assertEquals(0,count("recipe_changes"));
    }
    private Set<String> actualPluginReferences()throws Exception {
        Context target=InstrumentationRegistry.getInstrumentation().getTargetContext();Context isolated=new ContextWrapper(target){
            @Override public File getFilesDir(){return root;}
            @Override public File getDatabasePath(String ignored){return file;}
        };
        LocalBackupPlugin plugin=new LocalBackupPlugin(){@Override public Context getContext(){return isolated;}};
        Method read=LocalBackupPlugin.class.getDeclaredMethod("facts");read.setAccessible(true);Object facts=read.invoke(plugin);
        Field field=facts.getClass().getDeclaredField("references");field.setAccessible(true);Object value=field.get(facts);assertTrue(value instanceof Set);
        Set<String> result=new HashSet<>();for(Object path:(Set<?>)value){assertTrue(path instanceof String);result.add((String)path);}return result;
    }
    @Test public void startupCleanupPreservesCookingOnlyGenerationDuringRecipeUndo()throws Exception {
        migrate(false);db.execSQL("DELETE FROM backup_restore_state");db.execSQL("UPDATE recipes SET deleted_at='2026-10-04T00:00:00.000Z'");
        LocalBackupSession session=LocalBackupSession.create(root,"restore");String generation=UUID.randomUUID().toString(),hash="b".repeat(64);
        session.registerGeneration(generation,hash);session.journal("staged",generation,hash);
        File directory=new File(root,"images/generation-"+generation);assertTrue(directory.mkdirs());String path="images/generation-"+generation+"/"+hash+".png";
        File image=new File(root,path);Files.write(image.toPath(),new byte[]{1,2,3});
        db.execSQL("INSERT INTO cooking_records VALUES('photo','old','2026-10-04T00:00:00.000Z',?,NULL,NULL)",new Object[]{path});
        Set<String> refs=actualPluginReferences();assertTrue(refs.contains(path));session.cleanup(refs,null,false);assertTrue(image.isFile());assertArrayEquals(new byte[]{1,2,3},Files.readAllBytes(image.toPath()));
    }
    @Test public void nativeReferenceAuditIncludesCurrentStepHistoryAndSharedCookingPhoto()throws Exception {
        migrate(false);String shared="images/"+UUID.randomUUID()+".png",step="images/"+UUID.randomUUID()+".png",old="images/"+UUID.randomUUID()+".png";
        db.execSQL("UPDATE recipes SET cover_path=?",new Object[]{shared});db.execSQL("UPDATE recipe_steps SET image_path=?",new Object[]{step});
        db.execSQL("UPDATE recipe_changes SET before_json=?",new Object[]{new JSONObject().put("coverPath",old).put("steps",new JSONArray()).toString()});
        db.execSQL("INSERT INTO cooking_records VALUES('photo','old','2026-10-04T00:00:00.000Z',?,NULL,NULL)",new Object[]{shared});
        assertEquals(new HashSet<>(Arrays.asList(shared,step,old)),actualPluginReferences());
    }
}
