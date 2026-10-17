<script setup lang="ts">
import { computed } from 'vue'
import { useObservatory } from '../stores/observatory'
import SceneView from './SceneView.vue'
import TermDetail from './TermDetail.vue'
import TimeConsole from './TimeConsole.vue'

const emit = defineEmits<{ (event: 'select-term', termIndex: number): void }>()
const store = useObservatory()
const { activeTerm, seasonMeta, solarLongitude, remainingText, isSimulated } = store

const termDescriptor = computed(() => `${activeTerm.value.name} · ${seasonMeta.value.label}`)

function onSceneTermSelected(termIndex: number): void {
  emit('select-term', termIndex)
}
</script>

<template>
  <section id="observatory" class="observatory-section" aria-labelledby="hero-title">
    <div class="hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">
          <span class="eyebrow__line" aria-hidden="true"></span>
          天文 · 历法 · 风物
        </p>
        <h1 id="hero-title">
          太阳每走 15°，<br />
          <em>人间换一个节气。</em>
        </h1>
        <p class="hero-lede">
          这不是一张平均切分的日历。地球沿黄道绕太阳公转，太阳的视黄经每前进
          15°，就到达一个新的节气。拖动地球、拨动时间，看看今天的人类处在哪一段日光里。
        </p>
        <div class="hero-live">
          <span class="hero-live__tag">{{ isSimulated ? '模拟观测' : '此刻正发生' }}</span>
          <strong>{{ termDescriptor }}</strong>
          <span class="hero-live__sep"></span>
          <span>太阳黄经 {{ solarLongitude.toFixed(2) }}°</span>
          <span class="hero-live__sep"></span>
          <span>距下一交节约 {{ remainingText }}</span>
        </div>
        <div class="hero-links">
          <a class="text-link" href="#terms">展开岁时谱 <span aria-hidden="true">↓</span></a>
          <a class="text-link text-link--muted" href="#history">从一根表杆读起 <span aria-hidden="true">↘</span></a>
        </div>
      </div>

      <div class="hero-aside" aria-hidden="true">
        <div class="hero-aside__ring">
          <span class="hero-aside__sun"></span>
          <span class="hero-aside__orbit hero-aside__orbit--one"></span>
          <span class="hero-aside__orbit hero-aside__orbit--two"></span>
          <span class="hero-aside__earth"></span>
          <span class="hero-aside__label hero-aside__label--one">黄道</span>
          <span class="hero-aside__label hero-aside__label--two">观象</span>
        </div>
        <p class="hero-aside__quote">“日月之行，若出其中。”</p>
        <p class="hero-aside__source">曹操《观沧海》</p>
      </div>
    </div>

    <div class="observatory-grid">
      <SceneView @select-term="onSceneTermSelected" />
      <TermDetail />
    </div>

    <TimeConsole />
  </section>
</template>
