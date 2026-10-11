package app.recipio.captureprobesource;
import org.junit.Test;
import static org.junit.Assert.*;
public class RecipeScenesTest {
    @Test public void sixScenesAdvanceEveryTwentySecondsAndLoop(){
        for(int i=0;i<6;i++)assertEquals(i,RecipeScenes.index(i*20000));
        assertEquals(5,RecipeScenes.index(119999));assertEquals(0,RecipeScenes.index(120000));
    }
    @Test public void negativeClockCannotSelectInvalidScene(){assertEquals(0,RecipeScenes.index(-1));}
    @Test public void sceneContentActuallyContainsQuantitiesAndHeatTime(){
        assertTrue(RecipeScenes.lines(0)[1].contains("200克"));
        assertTrue(RecipeScenes.lines(4)[1].contains("小火"));
        assertTrue(RecipeScenes.lines(4)[2].contains("5分钟"));
    }
}
