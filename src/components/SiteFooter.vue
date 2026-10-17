<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="site-footer__inner">
      <div class="footer-brand">
        <p class="footer-seal" aria-hidden="true">观象</p>
        <div>
          <h2>观象 · 二十四节气</h2>
          <p>仰观太阳，俯察四时。用一座可以拖动的天空，重读一套仍在使用的中国时间知识。</p>
        </div>
      </div>

      <div class="footer-columns">
        <div>
          <h3>阅读</h3>
          <a href="#observatory">观测台</a>
          <a href="#history">源流</a>
          <a href="#song">节气歌</a>
          <a href="#sources">来源与精度</a>
        </div>
        <div>
          <h3>资料</h3>
          <a href="https://ich.unesco.org/en/RL/the-twenty-four-solar-terms-knowledge-in-china-of-time-and-practices-developed-through-the-observation-of-the-sun-s-annual-motion-00647" target="_blank" rel="noopener noreferrer">UNESCO 非遗条目</a>
          <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener noreferrer">Astronomy Engine</a>
          <a href="https://threejs.org/docs/" target="_blank" rel="noopener noreferrer">Three.js 文档</a>
        </div>
      </div>
    </div>

    <div class="site-footer__bottom">
      <p>本站是天文与节气科普作品，不作为专业历书或天气预报使用。</p>
      <p>地球与太阳纹理：Solar System Scope，CC BY 4.0；法线／高光：three.js / NASA。详见 <a href="#texture-credits">纹理署名</a>。</p>
      <p>© {{ year }} 观象 · 以太阳的尺度，丈量一年。</p>
    </div>
  </footer>
</template>
