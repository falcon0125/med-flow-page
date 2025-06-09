// App.js
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three'; // 導入 three.js 函式庫

// 在 JSX/Vue 模板或 DOM 操作中使用

function App() {
  // 參考 Canvas 元素，用於 three.js 渲染
  
  // Gemini API 呼叫處理函式 (已移除)
  // const handleSummarize = async () => { ... };

  return (
    <div className="antialiased">
      {/* 自定義字體導入 - Google Fonts */}
      {/* Tailwind CSS 類別直接應用或透過全域 CSS 檔案應用 (使用 CDN 時不需要額外導入) */}
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body {
            font-family: 'Inter', sans-serif;
            background-color: #030712; /* bg-gray-950 */
            color: #f3f4f6; /* text-gray-100 */
        }
        /* 確保 Canvas 能夠覆蓋 Hero 區塊的背景 */
        .hero-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 0; /* 讓文字內容在上面 */
        }
        /* 確保 Hero 區塊的內容在 Canvas 之上 */
        .hero-content {
            position: relative;
            z-index: 1;
        }
        `}
      </style>

      {/* Header Section */}
      <header className="bg-gray-900 shadow-sm py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <a href="#" className="text-2xl font-bold text-blue-400 rounded-md p-2 hover:bg-gray-800 transition duration-300">
            醫流 <span className="text-base text-gray-400 font-medium">Med-Flow</span>
          </a>
          <nav>
            <ul className="flex space-x-6">
              <li><a href="#solutions" className="text-gray-300 hover:text-blue-400 font-medium transition duration-300">解決方案</a></li>
              <li><a href="#benefits" className="text-gray-300 hover:text-blue-400 font-medium transition duration-300">為什麼選擇醫流</a></li>
              {/* <li><a href="#ai-summarizer" className="text-gray-300 hover:text-blue-400 font-medium transition duration-300">AI 報告摘要</a></li> */} {/* 新增導航連結 */}
              <li><a href="#contact" className="text-gray-300 hover:text-blue-400 font-medium transition duration-300">聯絡我們</a></li>
            </ul>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-gray-950 via-blue-950 to-indigo-950 text-white py-20 px-4 shadow-lg overflow-hidden">
        {/* Three.js Canvas for animated background */}
        <canvas className="hero-canvas"></canvas>
        <div className="container mx-auto text-center hero-content">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 drop-shadow-lg"> {/* 添加陰影效果 */}
            醫流 Med-Flow <br/> 智慧醫療流程，釋放專業無限可能
          </h1>
          <p className="text-lg md:text-xl lg:text-2xl font-light mb-8 max-w-3xl mx-auto">
            告別繁瑣，迎接高效。醫流以領先 AI 科技，為醫師打造更快速、更便捷、更「懶人」的智慧工作新典範。
          </p>
          <a href="#solutions" className="inline-block bg-blue-400 text-gray-900 hover:bg-blue-300 font-bold py-3 px-8 rounded-full shadow-lg transition duration-300 transform hover:scale-105">
            探索我們的智慧解決方案
          </a>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="py-16 px-4 bg-gray-900">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-100 mb-12">我們的智慧解決方案</h2>

          {/* BoneAge Prediction Software */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-16">
            <div className="md:w-1/2 lg:w-2/5 order-2 md:order-1 text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-blue-400 mb-4">AI 骨齡預測軟體</h3>
              <p className="text-gray-300 text-lg mb-4">
                告別繁瑣的圖譜比對，AI 骨齡預測軟體將判讀時間縮短至<strong className="text-blue-300">秒級</strong>。透過深度學習模型，提供高度<strong className="text-blue-300">精準</strong>且<strong className="text-blue-300">一致</strong>的骨齡預測結果參考，輔助醫師快速評估兒童生長發育狀況，制定個性化治療方案。
              </p>
              <ul className="list-disc list-inside text-gray-400 space-y-2 mb-6">
                <li><strong className="text-gray-200">極速判讀：</strong> AI 秒預測，大幅提升效率。</li>
                <li><strong className="text-gray-200">高度精準：：</strong> 基於海量數據訓練，結果可靠。</li>
                <li><strong className="text-gray-200">輔助決策：：</strong> 助力醫師精準評估與規劃治療。</li>
                <li><strong className="text-gray-200">標準化報告：：</strong> 自動生成結構化報告，減少人為差異。</li>
              </ul>
              <a href="https://bone-age.med-flow.org" className="inline-block bg-blue-500 text-white hover:bg-blue-600 py-2 px-6 rounded-md shadow transition duration-300">
                了解更多 BoneAge
              </a>
            </div>
            <div className="md:w-1/2 lg:w-2/5 order-1 md:order-2">
              {/* Placeholder image for BoneAge software */}
              <img src="bone-age.png" alt="AI 骨齡預測軟體示意圖" className="w-full h-auto rounded-lg shadow-lg" />
            </div>
          </div>

          {/* RaDict Radiology Report Dictation Software */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-12">
            <div className="md:w-1/2 lg:w-2/5 text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-blue-400 mb-4">RaDict 放射科報告聽寫軟體</h3>
              <p className="text-gray-300 text-lg mb-4">
                解放雙手，聲控智寫。RaDict 專為放射科醫師打造，透過先進的 AI 語音辨識技術，讓您在<strong className="text-blue-300">判讀影像的同時，直接口述病灶 (lesion) 資訊</strong>。系統支援<strong className="text-blue-300">中英文混合語音輸入</strong>，並透過 AI <strong className="text-blue-300">自動校正轉錄錯誤並格式化報告</strong>。完成影像判讀後，<strong className="text-blue-300">結構化報告即刻生成</strong>，大幅提升報告撰寫效率與準確性。
              </p>
              <ul className="list-disc list-inside text-gray-400 space-y-2 mb-6">
                <li><strong className="text-gray-200">節省時間：</strong> 一面判讀影像，一面口述病灶資訊，及時生成報告</li>
                <li><strong className="text-gray-200">多語言支援：</strong> 口述中英文皆可，流暢無阻。</li>
                <li><strong className="text-gray-200">AI 智能校正：：</strong> 自動偵測修正轉錄錯誤，確保格式與內容正確。</li>
                <li><strong className="text-gray-200">高效便捷：：</strong> 大幅縮短報告撰寫時間。</li>
                <li><strong className="text-gray-200">輕鬆舒適：：</strong> 減少手部疲勞，提升工作體驗。</li>
              </ul>
              <a href="https://radict.med-flow.org" className="inline-block bg-blue-500 text-white hover:bg-blue-600 py-2 px-6 rounded-md shadow transition duration-300">
                了解更多 RaDict
              </a>
            </div>
            <div className="md:w-1/2 lg:w-2/5">
              {/* Placeholder image for RaDict software */}
              <img src="radict.gif" alt="RaDict 放射科報告聽寫軟體示意圖" className="w-full h-auto rounded-lg shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section id="contact" className="bg-gradient-to-br from-purple-900 to-blue-900 text-white py-16 px-4 -xl shadow-lg">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">準備好體驗更智慧的醫療流程了嗎？</h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            立即聯絡我們，了解醫流如何為您的診所或醫院帶來變革，讓您的專業時間更有價值。
          </p>
          <a href="mailto:contact@med-flow.org" className="inline-block bg-blue-400 text-gray-900 hover:bg-blue-300 font-bold py-3 px-8 shadow-lg transition duration-300 transform hover:scale-105">
            立即諮詢
          </a>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-gray-950 text-gray-400 py-8 px-4">
        <div className="container mx-auto text-center text-sm">
          <p>&copy; 2025 醫流 Med-Flow. All rights reserved.</p>
          <p className="mt-2">
            <a href="#" className="hover:text-white transition duration-300">隱私權政策</a> |
            <a href="#" className="hover:text-white transition duration-300">服務條款</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

// 引入 ReactDOM
import ReactDOM from 'react-dom/client';

// 將 App 組件渲染到 HTML 頁面中的 'root' 元素
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export default App;
