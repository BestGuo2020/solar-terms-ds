<script setup lang="ts">
import { computed } from 'vue'
import { METHOD_NOTES, SOURCES } from '../data/sources'
import type { SourceRef } from '../data/types'

const groupOrder: SourceRef['group'][] = ['历法与天文', '历史与非遗', '技术与图像']
const groupedSources = computed(() =>
  groupOrder.map((group) => ({
    group,
    items: SOURCES.filter((source) => source.group === group),
  })),
)
</script>

<template>
  <section id="sources" class="sources-section" aria-labelledby="sources-title">
    <div class="sources-inner">
      <header class="section-heading section-heading--on-dark section-heading--split">
        <div>
          <p class="section-kicker"><span>卷六</span> 方法与来源</p>
          <h2 id="sources-title">我们所知道的，<br />来自哪里</h2>
        </div>
        <div class="section-heading__aside">
          <p>
            天文时刻由可复算的视黄经算法实时求出，文化内容采用公开文献与官方非遗资料。
            页面不把传说混作史实，也不把区域物候写成全国定律。
          </p>
        </div>
      </header>

      <div class="method-grid">
        <article class="method-card">
          <span class="method-card__index">01</span>
          <h3>计算方式</h3>
          <p>{{ METHOD_NOTES.algorithm }}</p>
        </article>
        <article class="method-card">
          <span class="method-card__index">02</span>
          <h3>时间与范围</h3>
          <p>
            可选年份为 {{ METHOD_NOTES.supportedYears }}。时间一律以 {{ METHOD_NOTES.timezone }}
            显示；中国天文年历的节气时刻使用 UTC+8 标准时，不叠加历史夏令时。
          </p>
        </article>
        <article class="method-card">
          <span class="method-card__index">03</span>
          <h3>精度与校验</h3>
          <p>{{ METHOD_NOTES.precision }}</p>
        </article>
        <article class="method-card">
          <span class="method-card__index">04</span>
          <h3>场景约定</h3>
          <p>{{ METHOD_NOTES.scene }}</p>
        </article>
      </div>

      <div class="source-columns">
        <div v-for="group in groupedSources" :key="group.group" class="source-group">
          <h3>{{ group.group }}</h3>
          <ol class="source-list">
            <li v-for="source in group.items" :key="source.id">
              <p class="source-title">
                <a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.title }}</a>
                <span v-else>{{ source.title }}</span>
              </p>
              <p v-if="source.publisher" class="source-publisher">{{ source.publisher }}</p>
              <p v-if="source.note" class="source-note">{{ source.note }}</p>
            </li>
          </ol>
        </div>
      </div>

      <div class="data-caveats">
        <h3>阅读这些内容时，请留意</h3>
        <ul>
          <li>节气时刻是太阳视黄经的精确节点；“某个节气快到了”与“已经进入某个节气区间”是两个不同的时间概念。</li>
          <li>二十四节气的名称与早期物候记录形成于黄河流域，气候与农事描述主要参照中国东部季风区，各地不能机械照搬。</li>
          <li>古代文献的成书年代、诗句异文与作者归属存在学术讨论；页面采用通行说法，并在具体条目中保留必要限定。</li>
          <li>未来年份的 ΔT 是外推值，交节时刻越往将来，误差可能越大；本站不将其包装为绝对精确的历书数据。</li>
          <li>3D 场景中的太阳、地球尺寸和轨道距离经过艺术化缩放，仅用于说明结构与方向关系。</li>
        </ul>
      </div>

      <div id="texture-credits" class="texture-credits">
        <h3>图像与纹理署名</h3>
        <p>
          地球昼面、夜面、云层、太阳表面与银河背景：
          <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer">Solar System Scope</a>，
          以 <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a> 授权，
          按许可保留署名。地球法线与海陆高光贴图来自
          <a href="https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets" target="_blank" rel="noopener noreferrer">three.js examples</a>
          （MIT；底图源自 NASA 公开影像）。纹理缺失时，页面会自动改用程序化生成的替代材质。
        </p>
        <p class="texture-credits__local">静态资源署名文件：<a href="/textures/CREDITS.md" target="_blank" rel="noopener">public/textures/CREDITS.md</a></p>
      </div>

      <p class="sources-signoff">
        这套时间知识不专属于任何一种历法。它属于每一个抬头看见太阳的人。
      </p>
    </div>
  </section>
</template>
