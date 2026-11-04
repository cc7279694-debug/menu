package app.recipio.local;

import static org.junit.Assert.*;
import java.lang.reflect.*;
import java.util.*;
import org.junit.Test;

/** These first tests compile without the new implementation so RED is an assertion, not javac. */
public class AiLongImagePlanTest {
    private List<?> plan(int width,int height,int slots)throws Exception {
        Class<?> type;
        try{type=Class.forName("app.recipio.local.AiLongImagePlan");}
        catch(ClassNotFoundException missing){throw new AssertionError("Missing bounded original-image segment planner",missing);}
        Method method=type.getDeclaredMethod("create",int.class,int.class,int.class);method.setAccessible(true);
        try{return (List<?>)method.invoke(null,width,height,slots);}
        catch(InvocationTargetException e){if(e.getCause() instanceof Exception)throw (Exception)e.getCause();throw e;}
    }
    private int value(Object region,String field)throws Exception {Field f=region.getClass().getDeclaredField(field);f.setAccessible(true);return f.getInt(region);}
    @Test public void ordinaryAnd600LongImagesRemainOneFullResolutionRegion()throws Exception {
        assertEquals(1,plan(1080,1440,6).size());List<?> regions=plan(600,1800,1);assertEquals(1,regions.size());
        assertEquals(0,value(regions.get(0),"top"));assertEquals(1800,value(regions.get(0),"bottom"));
    }
    @Test public void tallImageKeepsAllRowsInTopToBottomOverlappingRegions()throws Exception {
        List<?> regions=plan(1080,7200,6);assertEquals(4,regions.size());int previousBottom=0;
        for(int i=0;i<regions.size();i++){int top=value(regions.get(i),"top"),bottom=value(regions.get(i),"bottom");
            assertTrue(bottom>top);assertTrue(bottom-top<=2048);assertEquals(i==0?0:previousBottom-64,top);previousBottom=bottom;}
        assertEquals(7200,previousBottom);
    }
    @Test public void remainingSlotsAreHardLimitAndNeverTruncateTail()throws Exception {
        assertEquals("long_image_limit",assertThrows(AiFailure.class,()->plan(1080,7200,3)).code);
        assertEquals("long_image_limit",assertThrows(AiFailure.class,()->plan(1080,7200,0)).code);
        assertEquals(6,plan(1080,11968,6).size());
        assertEquals("long_image_limit",assertThrows(AiFailure.class,()->plan(1080,11969,6)).code);
    }
    @Test public void widthAndOriginalPixelAndAspectBudgetsStayBounded()throws Exception {
        assertEquals("long_image_limit",assertThrows(AiFailure.class,()->plan(2049,3000,6)).code);
        assertEquals("image_too_large",assertThrows(AiFailure.class,()->plan(8001,4000,6)).code);
        assertEquals("image_invalid",assertThrows(AiFailure.class,()->plan(10,100,6)).code);
        assertEquals("image_invalid",assertThrows(AiFailure.class,()->plan(11,2201,6)).code);
    }
    private void budget(long pixels,long available)throws Exception {
        Method method;
        try{method=Class.forName("app.recipio.local.AiLongImagePlan").getDeclaredMethod("requireDecodeBudget",long.class,long.class);method.setAccessible(true);}
        catch(NoSuchMethodException missing){throw new AssertionError("Missing allocation admission guard",missing);}
        try{method.invoke(null,pixels,available);}catch(InvocationTargetException e){if(e.getCause() instanceof Exception)throw (Exception)e.getCause();throw e;}
    }
    @Test public void decodeHeapBudgetRejectsBeforeAllocation()throws Exception {
        long pixels=1080L*2048,required=pixels*8+8L*1024*1024;
        budget(pixels,required);
        assertEquals("long_image_limit",assertThrows(AiFailure.class,()->budget(pixels,required-1)).code);
        assertEquals("long_image_limit",assertThrows(AiFailure.class,()->budget(4194305,Long.MAX_VALUE)).code);
    }
}
