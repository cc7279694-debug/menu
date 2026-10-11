package app.recipio.captureprobesource;
/** Self-generated scene labels, not a copied recipe/video. */
public final class RecipeScenes {
    private RecipeScenes(){}
    private static final String[][] SCENES={
        {"1 / 6 食材","鸡肉200克、西兰花100克","油10克，盐适量"},
        {"2 / 6 预处理","鸡肉切片，西兰花洗净","提前准备：鸡肉腌10分钟"},
        {"3 / 6 下锅","中火热锅，加入油10克","下鸡肉翻炒至变色"},
        {"4 / 6 调味","加入西兰花、盐适量","加入清水50毫升"},
        {"5 / 6 焖煮","转小火，加盖焖煮","时间5分钟；注意别烧干"},
        {"6 / 6 出锅","揭盖，翻匀后盛盘","测试提示：只作采集对照"}
    };
    public static int index(long elapsed){return (int)(Math.max(0,elapsed)%120000/20000);}
    public static String[] lines(int scene){if(scene<0||scene>=6)throw new IllegalArgumentException("scene");return SCENES[scene].clone();}
}
