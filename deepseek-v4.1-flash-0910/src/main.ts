import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { initLocale } from './i18n'

// 先把语言标记同步到 <html lang>、标题与描述，再挂载应用，
// 避免首帧出现「页面是中文、lang 却是 en」这类不一致。
initLocale()

createApp(App).mount('#app')
