import { ArrowUpRight } from "lucide-react";
import { V2Button } from "../components";
import { demoRecipes } from "./demo-data";

/** Real local photos scroll behind the control; this is not a generated UI screenshot. */
export function MaterialSample({ onOpen }: { onOpen: () => void }) {
  return <section className="v2-gallery-section" aria-labelledby="v2-material-title">
    <div className="v2-gallery-section-heading"><div><h2 id="v2-material-title">玻璃，在内容之上</h2><p>滚动照片观察透色；在样板设置中切换实体回退作对照。</p></div></div>
    <div className="v2-material-stage">
      <div className="v2-material-scroll" tabIndex={0} role="region" aria-label="材质测试照片">
        {demoRecipes.slice(0, 3).map((item) => <img key={item.details.id} src={item.image ?? undefined} alt={`${item.details.title}材质测试图片`} width="1000" height="750" />)}
      </div>
      <div className="v2-material-control v2-glass"><span>本地菜谱 · 材质样例</span><V2Button variant="icon" aria-label="打开材质样例浮层" onClick={onOpen}><ArrowUpRight aria-hidden="true" /></V2Button></div>
    </div>
  </section>;
}
