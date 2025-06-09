// App.js
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three'; // 導入 three.js 函式庫

// 在 JSX/Vue 模板或 DOM 操作中使用

function App() {
  // 參考 Canvas 元素，用於 three.js 渲染
  const canvasRef = useRef(null);

  // Gemini API 整合的狀態管理 (已移除)
  // const [reportInput, setReportInput] = useState(``);
  // const [summaryOutput, setSummaryOutput] = useState('');
  // const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState(null);

  useEffect(() => {
    // 檢查瀏覽器環境並確保 canvas 參考已連接
    if (typeof window === 'undefined' || !canvasRef.current) {
      console.error("Window or Canvas reference not available.");
      return;
    }

    // --- 場景、攝影機、渲染器設置 ---
    const scene = new THREE.Scene();
    // 使用透視攝影機，適合背景效果
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true }); // alpha: true 讓背景透明，以便看到 Hero 區塊的漸層背景
    renderer.setSize(window.innerWidth, window.innerHeight); // 確保 Canvas 高寬比與視窗一致
    renderer.setPixelRatio(window.devicePixelRatio); // 提升渲染品質

    // --- 粒子設定 (模擬神經元或資料點) ---
    const particleCount = 100; // 粒子數量，可調整
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3); // 用於儲存每個粒子的顏色
    const particleSizes = new Float32Array(particleCount); // 新增：用於儲存每個粒子的尺寸
    interface ParticleData {
      id: number;
      position: THREE.Vector3;
      velocity: THREE.Vector3;
      isFiring: boolean;
      fireStartTime: number;
      fadeDuration: number;
      currentSize: number;
      connections: { targetNodeId: number; lineBufferStartIndex: number; lineStateIndex: number }[];
    }
    const particleData: ParticleData[] = []; // 儲存每個粒子的自定義數據 (位置、速度、連接等)

    const baseParticleColor = new THREE.Color(0x2671ab); // 基礎粒子顏色 (淡藍色)
    const firingParticleColor = new THREE.Color(0xF6DC43); // 點火時的顏色 (白黃色)
    const baseLineColor = new THREE.Color(0x4488ff); // 基礎線條顏色 (中藍色)
    const firingLineColor = new THREE.Color(0xFFFFAA); // 點火時的線條顏色 (白黃色)

    const baseParticleSize = 1.2; // 粒子基礎尺寸
    const firingParticleSize = 3.0; // 粒子點火時的尺寸 (可調整，使其變大)

    // --- 神經元分佈設定：均勻分佈在一個較大的空間內 ---
    const spawnVolumeSize = 250; // 粒子分佈的虛擬立方體大小

    // 初始化粒子位置、速度和數據
    for (let i = 0; i < particleCount; i++) {
      // 隨機分佈在一個虛擬立方體內，均勻散佈
      const x = (Math.random() - 0.5) * spawnVolumeSize;
      const y = (Math.random() - 0.5) * spawnVolumeSize;
      const z = (Math.random() - 0.5) * spawnVolumeSize;

      particlePositions[i * 3] = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;

      baseParticleColor.toArray(particleColors, i * 3); // 設定初始顏色
      particleSizes[i] = baseParticleSize; // 設定初始尺寸

      particleData.push({
        id: i,
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3( // 隨機速度，用於粒子緩慢移動
          (Math.random() - 0.5) * 0.05, // 粒子飄移速度降低
          (Math.random() - 0.5) * 0.05, // 粒子飄移速度降低
          (Math.random() - 0.5) * 0.05  // 粒子飄移速度降低
        ),
        isFiring: false, // 標記粒子是否正在點火
        fireStartTime: 0, // 點火開始時間戳
        fadeDuration: 200, // 粒子淡出所需時間 (毫秒)，速度加快
        currentSize: baseParticleSize, // 追蹤粒子當前的渲染尺寸
        connections: [], // 儲存與其連接的粒子 ID 和線段起始索引
      });
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    particlesGeometry.setAttribute('aSize', new THREE.BufferAttribute(particleSizes, 1)); // 將尺寸作為屬性傳遞給著色器

    const particleMaterial = new THREE.PointsMaterial({
      // size: 1.2, // 此處不再需要 size 屬性，因為尺寸由 aSize 屬性控制
      vertexColors: true, // 啟用每個頂點的顏色 (允許粒子個別變色)
      blending: THREE.AdditiveBlending, // 疊加混合，產生光暈效果
      transparent: true,
      opacity: 1.0, // 粒子初始透明度，將被 shader 修改
      sizeAttenuation: true, // 粒子大小隨距離衰減
    });

    // 注入自定義 shader 程式碼以實現深度透明度漸變及動態尺寸
    particleMaterial.onBeforeCompile = (shader) => {
        // 將攝影機的近/遠裁剪面作為 uniform 傳遞給 shader
        shader.uniforms.uNear = { value: camera.near };
        shader.uniforms.uFar = { value: camera.far };

        // 在頂點著色器中加入 aSize 屬性 和 vDepth varying 變數
        shader.vertexShader = `
            attribute float aSize; // 接收每個粒子的尺寸
            varying float vDepth;
            ${shader.vertexShader}
        `;
        // 在頂點位置計算後，計算視空間深度並將 aSize 應用到 gl_PointSize
        shader.vertexShader = shader.vertexShader.replace(
            '#include <project_vertex>', // Three.js 預設 shader 的一個常見插入點
            `
            #include <project_vertex>
            gl_PointSize = aSize; // 使用從屬性傳入的尺寸
            // 計算視空間深度 (transformedPosition.z 在視空間中是負值，取負數使其為正)
            vDepth = -mvPosition.z;
            `
        );

        // 在最終 gl_FragColor 賦值之前，根據深度調整透明度
        shader.fragmentShader = `
            uniform float uNear;
            uniform float uFar;
            varying float vDepth;
            ${shader.fragmentShader}
        `;
        shader.fragmentShader = shader.fragmentShader.replace(
            'gl_FragColor = vec4( diffuse, opacity );', // PointsMaterial 的最終顏色賦值行
            `
            // 將深度正規化到 0-1 範圍 (0 為近，1 為遠)
            float depthNormalized = (vDepth - uNear) / (uFar - uNear);
            // 使用 smoothstep 函數創建平滑的透明度漸變 (遠處越透明)
            // 1.0 - smoothstep(0.0, 1.0, depthNormalized) 意味著近處為 1 (完全不透明)，遠處為 0 (完全透明)
            float opacityFactor = 1.0 - smoothstep(0.0, 1.0, depthNormalized);

            // 將原有的透明度 (opacity) 與深度透明度因子相乘
            gl_FragColor = vec4( diffuse, opacity * opacityFactor );
            `
        );
    };

    const particleMesh = new THREE.Points(particlesGeometry, particleMaterial);
    scene.add(particleMesh);

    // --- 線條設定 (模擬神經元連接或資料流動的路徑) ---
    const maxLineSegments = particleCount * 5; // 預留足夠的線段空間
    const linePositions = new Float32Array(maxLineSegments * 2 * 3); // 每個線段有兩個點，每個點有3個坐標
    const lineColors = new Float32Array(maxLineSegments * 2 * 3); // 每個線段的顏色

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true, // 啟用每個頂點的顏色 (允許線條個別變色)
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.25, // 線條初始透明度
      // linewidth: 1, // LineBasicMaterial 的 linewidth 屬性在大多數瀏覽器上不穩定，通常只渲染為 1px
    });

    // 注入自定義 shader 程式碼以實現深度透明度漸變
    lineMaterial.onBeforeCompile = (shader) => {
        // 將攝影機的近/遠裁剪面作為 uniform 傳遞給 shader
        shader.uniforms.uNear = { value: camera.near };
        shader.uniforms.uFar = { value: camera.far };

        // 在頂點著色器中加入 vDepth varying 變數
        shader.vertexShader = `
            varying float vDepth;
            ${shader.vertexShader}
        `;
        // 在頂點位置計算後，計算視空間深度並傳遞給片段著色器
        shader.vertexShader = shader.vertexShader.replace(
            '#include <project_vertex>', // Three.js 預設 shader 的一個常見插入點
            `
            #include <project_vertex>
            // 計算視空間深度
            vDepth = -mvPosition.z;
            `
        );

        // 在最終 gl_FragColor 賦值之前，根據深度調整透明度
        shader.fragmentShader = `
            uniform float uNear;
            uniform float uFar;
            varying float vDepth;
            ${shader.fragmentShader}
        `;
        shader.fragmentShader = shader.fragmentShader.replace(
            'gl_FragColor = vec4( diffuse, opacity );', // LineBasicMaterial 的最終顏色賦值行
            `
            // 將深度正規化到 0-1 範圍
            float depthNormalized = (vDepth - uNear) / (uFar - uNear);
            // 使用 smoothstep 函數創建平滑的透明度漸變
            float opacityFactor = 1.0 - smoothstep(0.0, 1.0, depthNormalized);

            // 將原有的透明度 (opacity) 與深度透明度因子相乘
            gl_FragColor = vec4( diffuse, opacity * opacityFactor );
            `
        );
    };

    const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineMesh);

    // --- 建立連接 (鄰接表) ---
    const connectionDistance = 40; // 粒子之間建立連接的最大距離增大，產生更多邊緣
    let currentLineSegmentIndex = 0; // 當前線段在緩衝區中的索引
    interface LineState {
      lineBufferStartIndex: number;
      isFiring: boolean;
      fireStartTime: number;
      fadeDuration: number;
    }
    const lineStates: LineState[] = []; // 儲存線條狀態，用於淡出

    for (let i = 0; i < particleCount; i++) {
      for (let j = i + 1; j < particleCount; j++) {
        const p1 = particleData[i].position;
        const p2 = particleData[j].position;
        const distance = p1.distanceTo(p2);

        if (distance < connectionDistance) {
          // 在粒子數據中儲存連接關係，並包含線段在緩衝區的起始索引
          particleData[i].connections.push({ targetNodeId: j, lineBufferStartIndex: currentLineSegmentIndex * 6, lineStateIndex: lineStates.length });
          particleData[j].connections.push({ targetNodeId: i, lineBufferStartIndex: currentLineSegmentIndex * 6, lineStateIndex: lineStates.length });

          // 將線段的坐標和顏色寫入緩衝區
          p1.toArray(linePositions, currentLineSegmentIndex * 6);
          p2.toArray(linePositions, currentLineSegmentIndex * 6 + 3);
          
          baseLineColor.toArray(lineColors, currentLineSegmentIndex * 6);
          baseLineColor.toArray(lineColors, currentLineSegmentIndex * 6 + 3);

          lineStates.push({
            lineBufferStartIndex: currentLineSegmentIndex * 6,
            isFiring: false, // 標記線條是否正在點火
            fireStartTime: 0, // 點火開始時間戳
            fadeDuration: 100 // 線條淡出所需時間 (毫秒)，速度加快
          });

          currentLineSegmentIndex++;
          if (currentLineSegmentIndex * 6 >= maxLineSegments * 2 * 3) break; // 防止緩衝區溢出
        }
      }
    }
    lineGeometry.setDrawRange(0, currentLineSegmentIndex * 2); // 設定實際繪製的線段數量

    const initialCameraZ = 100; // 攝影機初始位置
    // 縮放限制：攝影機 Z 軸固定，不進行主動縮放
    camera.position.z = initialCameraZ; // 設置初始 Z 軸位置
    camera.near = 50; // 攝影機近裁剪面，影響深度漸變的起始
    camera.far = 250; // 攝影機遠裁剪面，影響深度漸變的結束
    camera.updateProjectionMatrix(); // 更新投影矩陣以應用新的 near/far 值

    // --- 點火與傳播邏輯 ---
    const propagationTimeoutIds: Set<number> = new Set(); // 用於追蹤和清除傳播 setTimeout

    // 點火粒子函式
    const fireNode = (nodeId) => {
      const node = particleData[nodeId];
      // 如果粒子已在點火或淡出狀態，重新啟動點火
      node.isFiring = true;
      node.fireStartTime = performance.now(); // 記錄點火開始時間
      
      firingParticleColor.toArray(particleColors, nodeId * 3); // 立即變亮
      node.currentSize = firingParticleSize; // 立即變大
      particlesGeometry.attributes.color.needsUpdate = true; // 通知 Three.js 顏色已更新
      particlesGeometry.attributes.aSize.array[nodeId] = node.currentSize; // 更新尺寸緩衝區
      particlesGeometry.attributes.aSize.needsUpdate = true; // 通知 Three.js 尺寸已更新


      // 傳播到相鄰的線條
      node.connections.forEach(connection => {
        // 從 connection 物件中獲取線段的緩衝區起始索引和目標粒子 ID
        propagateLine(connection.lineStateIndex, connection.targetNodeId);
      });
    };

    // 傳播線條函式
    const propagateLine = (lineStateIndex, toNodeId) => {
      const lineState = lineStates[lineStateIndex];
      // 如果線條已在點火或淡出狀態，重新啟動點火
      lineState.isFiring = true;
      lineState.fireStartTime = performance.now(); // 記錄點火開始時間

      const lineStartBufferIndex = lineState.lineBufferStartIndex;
      firingLineColor.toArray(lineColors, lineStartBufferIndex); // 立即變亮
      firingLineColor.toArray(lineColors, lineStartBufferIndex + 3); // 立即變亮
      lineGeometry.attributes.color.needsUpdate = true;

      // 立即觸發下一個粒子點火，增加微小延遲以模擬傳播感
      const timeoutId = setTimeout(() => {
        fireNode(toNodeId);
        propagationTimeoutIds.delete(timeoutId); // 清除此 timeout 的 ID
      }, 300); // 線條亮起 0.05 秒後觸發下一個粒子
      propagationTimeoutIds.add(timeoutId); // 儲存此 timeout 的 ID
    };

    // --- 初始點火爆發：啟動兩個神經元群 ---
    const numInitialClusters = 2; // 要啟動的神經叢數量
    const activationClusterRadius = 20; // 每個神經叢的激活半徑

    // 隨機選擇兩個初始種子神經元
    const seedNodeIds: number[] = [];
    while (seedNodeIds.length < numInitialClusters) {
        const randomNodeId = Math.floor(Math.random() * particleCount);
        if (!seedNodeIds.includes(randomNodeId)) { // 確保不重複
            seedNodeIds.push(randomNodeId);
        }
    }

    // 啟動兩個群體的神經元
    seedNodeIds.forEach(seedId => {
        const seedPosition = particleData[seedId].position;
        particleData.forEach((node, nodeId) => {
            if (node.position.distanceTo(seedPosition) < activationClusterRadius) {
                fireNode(nodeId);
            }
        });
    });

    // 每隔一段時間隨機觸發一個粒子點火 (營造持續點火效果)
    const randomFireInterval = setInterval(() => {
      const randomNodeId = Math.floor(Math.random() * particleCount);
      fireNode(randomNodeId);
    }, 500); // 每 0.2 秒隨機觸發一個粒子，頻率加快

    // --- 滑鼠互動控制 (用於攝影機環繞，增加互動感) ---
    let mouseX = 0, mouseY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    const onDocumentMouseMove = (event) => {
      mouseX = (event.clientX - windowHalfX) * 0.5; // 保持原始滑鼠位置計算
      mouseY = (event.clientY - windowHalfY) * 0.5;
    };

    const onDocumentTouchMove = (event) => {
        if (event.touches.length === 1) {
            event.preventDefault(); // 防止滾動
            mouseX = (event.touches[0].pageX - windowHalfX) * 0.5;
            mouseY = (event.touches[0].pageY - windowHalfY) * 0.5;
        }
    };

    document.addEventListener('mousemove', onDocumentMouseMove);
    document.addEventListener('touchmove', onDocumentTouchMove, { passive: false });

    // --- 動畫循環 ---
    const animate = () => {
      requestAnimationFrame(animate);

      const now = performance.now(); // 獲取當前時間戳

      // 更新粒子位置 (保持緩慢移動)
      const particlePositionsArray = particlesGeometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        particlePositionsArray[i * 3] += particleData[i].velocity.x;
        particlePositionsArray[i * 3 + 1] += particleData[i].velocity.y;
        particlePositionsArray[i * 3 + 2] += particleData[i].velocity.z;

        // 邊界反彈 (使粒子保持在視圖範圍內) - 使用 spawnVolumeSize / 2 作為邊界
        if (Math.abs(particlePositionsArray[i * 3]) > spawnVolumeSize / 2) particleData[i].velocity.x *= -1;
        if (Math.abs(particlePositionsArray[i * 3 + 1]) > spawnVolumeSize / 2) particleData[i].velocity.y *= -1;
        if (Math.abs(particlePositionsArray[i * 3 + 2]) > spawnVolumeSize / 2) particleData[i].velocity.z *= -1;

        // --- 粒子淡出邏輯 (包含尺寸淡出) ---
        const node = particleData[i];
        if (node.isFiring) {
          const elapsed = now - node.fireStartTime;
          if (elapsed < node.fadeDuration) {
            // 計算插值因子 (0 到 1)
            const t = elapsed / node.fadeDuration;
            const interpolatedColor = new THREE.Color();
            // 從點火顏色插值到基礎顏色
            interpolatedColor.lerpColors(firingParticleColor, baseParticleColor, t);
            interpolatedColor.toArray(particleColors, i * 3);

            // 尺寸插值
            node.currentSize = THREE.MathUtils.lerp(firingParticleSize, baseParticleSize, t);
            particlesGeometry.attributes.aSize.array[i] = node.currentSize; // 更新尺寸緩衝區
          } else {
            // 淡出完成，重置為基礎顏色和狀態
            node.isFiring = false;
            baseParticleColor.toArray(particleColors, i * 3);
            node.currentSize = baseParticleSize; // 重置為基礎尺寸
            particlesGeometry.attributes.aSize.array[i] = node.currentSize; // 更新尺寸緩衝區
          }
        }
      }
      particlesGeometry.attributes.position.needsUpdate = true; // 通知 Three.js 位置數據已更新
      particlesGeometry.attributes.color.needsUpdate = true; // 通知 Three.js 粒子顏色已更新
      particlesGeometry.attributes.aSize.needsUpdate = true; // 通知 Three.js 粒子尺寸已更新

      // --- 線條淡出邏輯 ---
      lineStates.forEach(lineState => {
        if (lineState.isFiring) {
          const elapsed = now - lineState.fireStartTime;
          if (elapsed < lineState.fadeDuration) {
            // 計算插值因子 (0 到 1)
            const t = elapsed / lineState.fadeDuration;
            const interpolatedColor = new THREE.Color();
            // 從點火顏色插值到基礎顏色
            interpolatedColor.lerpColors(firingLineColor, baseLineColor, t);
            interpolatedColor.toArray(lineColors, lineState.lineBufferStartIndex);
            interpolatedColor.toArray(lineColors, lineState.lineBufferStartIndex + 3);
          } else {
            // 淡出完成，重置為基礎顏色和狀態
            lineState.isFiring = false;
            baseLineColor.toArray(lineColors, lineState.lineBufferStartIndex);
            baseLineColor.toArray(lineColors, lineState.lineBufferStartIndex + 3);
          }
        }
      });
      lineGeometry.attributes.color.needsUpdate = true; // 通知 Three.js 線條顏色已更新

      // 攝影機隨滑鼠移動 (更平滑的影響，減少縮放感)
      // 目標位置計算，並限制其範圍以控制視角「角度」
      const targetCameraX = Math.max(-20, Math.min(20, mouseX * 0.05)); // 限制 X 軸移動範圍
      const targetCameraY = Math.max(-20, Math.min(20, -mouseY * 0.05)); // 限制 Y 軸移動範圍

      camera.position.x += (targetCameraX - camera.position.x) * 0.005; // 降低敏感度
      camera.position.y += (targetCameraY - camera.position.y) * 0.005; // 降低敏感度

      // 確保攝影機 Z 軸位置在允許的縮放範圍內 (此處 Z 軸固定，不影響)
      camera.lookAt(scene.position); // 始終看向場景中心

      renderer.render(scene, camera);
    };

    // --- 處理視窗大小改變 ---
    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onWindowResize);

    // 啟動動畫
    animate();

    // --- 清理函數：元件卸載時移除事件監聽器和 Three.js 資源，避免記憶體洩漏 ---
    return () => {
      clearInterval(randomFireInterval); // 清除隨機點火計時器
      // 清除所有未完成的傳播 setTimeout
      propagationTimeoutIds.forEach(id => clearTimeout(id)); 

      document.removeEventListener('mousemove', onDocumentMouseMove);
      document.removeEventListener('touchmove', onDocumentTouchMove);
      window.removeEventListener('resize', onWindowResize);
      renderer.dispose();
      particleMaterial.dispose();
      lineMaterial.dispose();
      particlesGeometry.dispose();
      lineGeometry.dispose();
    };
  }, []); // 空依賴陣列表示只在元件掛載時執行一次

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
            醫流 <span className="text-base text-gray-400 font-medium">MedFlow</span>
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
        <canvas ref={canvasRef} className="hero-canvas"></canvas>
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
