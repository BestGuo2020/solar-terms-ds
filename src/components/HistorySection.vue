<script setup lang="ts">
import { HISTORY_INTRO, HISTORY_TIMELINE } from '../data/history'
</script>

<template>
  <section id="history" class="reading-section history-section" aria-labelledby="history-title">
    <header class="section-heading section-heading--split">
      <div>
        <p class="section-kicker"><span>卷二</span> 源流</p>
        <h2 id="history-title">二十四节气，<br />是怎样长成的？</h2>
      </div>
      <div class="section-heading__aside">
        <p>{{ HISTORY_INTRO }}</p>
      </div>
    </header>

    <div class="history-figures">
      <div class="history-figure">
        <strong>立表测影</strong>
        <span>《周礼》等礼制文献记载</span>
      </div>
      <div class="history-figure">
        <strong>八个节令</strong>
        <span>春秋时已有分、至、启、闭</span>
      </div>
      <div class="history-figure">
        <strong>二十四名</strong>
        <span>《淮南子·天文训》完整记载</span>
      </div>
      <div class="history-figure">
        <strong>2016</strong>
        <span>列入人类非遗代表作名录</span>
      </div>
    </div>

    <ol class="history-timeline" aria-label="二十四节气历史时间线">
      <li
        v-for="(event, index) in HISTORY_TIMELINE"
        :key="event.id"
        class="history-item"
        :class="index % 2 === 0 ? 'history-item--left' : 'history-item--right'"
      >
        <div class="history-marker" aria-hidden="true"><span></span></div>
        <article class="history-card">
          <header class="history-card__head">
            <div>
              <p class="history-card__era">{{ event.era }}</p>
              <h3>{{ event.title }}</h3>
            </div>
            <p class="history-card__year">{{ event.year }}</p>
          </header>
          <p class="history-card__detail">{{ event.detail }}</p>
          <p class="history-card__source"><span>据</span>{{ event.source }}</p>
        </article>
      </li>
    </ol>

    <p class="history-caveat">
      说明：上古文献的成书年代、部分诗句的作者归属，学界仍有讨论。本页采用较为通行的说法；
      “惊蛰”在西汉前期文献中多作“启蛰”，后世为避汉景帝刘启名讳而改。
    </p>
  </section>
</template>
