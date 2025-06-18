// 音频播放器主要功能

document.addEventListener('DOMContentLoaded', function() {
    // 多语言支持
    let currentLanguage = localStorage.getItem('audioMixerLanguage') || 'zh'; // 默认中文
    const languageSelector = document.getElementById('language-select');

    // 主题切换支持
    const themeToggleBtn = document.getElementById('theme-toggle');
    const lightIcon = document.getElementById('light-icon');
    const darkIcon = document.getElementById('dark-icon');
    let currentTheme = localStorage.getItem('audioMixerTheme') || 'dark'; // 默认黑暗主题

    // 初始应用主题
    applyTheme(currentTheme);

    // 监听主题切换按钮点击事件
    themeToggleBtn.addEventListener('click', function() {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(currentTheme);
        localStorage.setItem('audioMixerTheme', currentTheme);
    });

    // 应用主题
    function applyTheme(theme) {
        // 移除所有过渡效果，实现立即切换
        document.documentElement.style.setProperty('transition', 'none');
        document.body.style.setProperty('transition', 'none');

        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
            el.style.transition = 'none';
        });

        // 在一次重绘后再应用主题，确保过渡效果已被禁用
        requestAnimationFrame(() => {
            if (theme === 'light') {
                document.body.classList.add('light-theme');
                lightIcon.classList.remove('hidden');
                darkIcon.classList.add('hidden');
            } else {
                document.body.classList.remove('light-theme');
                darkIcon.classList.remove('hidden');
                lightIcon.classList.add('hidden');
            }

            // 在主题切换后的下一帧重新启用过渡效果（针对其他交互）
            requestAnimationFrame(() => {
                document.documentElement.style.removeProperty('transition');
                document.body.style.removeProperty('transition');

                elements.forEach(el => {
                    el.style.transition = '';
                });
            });
        });
    }

    // Web Audio API 变量
    let audioContext;
    let masterGain;
    let reverbNode;
    let reverbGain;
    let dryGain;
    let convolver;  // 卷积器（产生混响效  ）
    let reverbAmount = 0; // 混响强度
    let mediaElementSource; // 跟踪媒体源节点，避免重复创建
    let audioSourceConnected = false; // 标记音频源是否已连接

    // 初始化Web Audio API
    function initAudioContext() {
        // 延迟初始化（直到用户交互），以避免Chrome自动播放策略问题
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // 创建主音量控制
        masterGain = audioContext.createGain();
        masterGain.gain.value = masterVolume;
        masterGain.connect(audioContext.destination);

        // 创建混响链路节点
        convolver = audioContext.createConvolver();
        reverbGain = audioContext.createGain();
        dryGain = audioContext.createGain();

        // 设置初始混响链路
        reverbGain.gain.value = 0; // 初始无混响
        dryGain.gain.value = 1;    // 初始干信号100%

        // 连接混响链路
        dryGain.connect(masterGain);
        reverbGain.connect(masterGain);
        convolver.connect(reverbGain);

        // 生成混响冲激响应
        generateReverb();
    }

    // 生成混响冲激响应
    function generateReverb() {
        // 创建冲激响应（reverb impulse response）
        const sampleRate = audioContext.sampleRate;
        const length = 2 * sampleRate; // 2秒混响
        const impulseResponse = audioContext.createBuffer(2, length, sampleRate);
        const leftChannel = impulseResponse.getChannelData(0);
        const rightChannel = impulseResponse.getChannelData(1);

        // 生成混响冲激响应
        for (let i = 0; i < length; i++) {
            // 指数衰减的随机噪声 (简单的混响模型)
            const decay = Math.exp(-i / (sampleRate * 0.5)); // 0.5秒的衰减
            const random = Math.random() * 2 - 1;

            leftChannel[i] = random * decay;
            rightChannel[i] = random * decay;
        }

        // 设置卷积器的冲激响应
        convolver.buffer = impulseResponse;
    }

    // 将音频源连接到混响效果链
    function connectToReverbChain(audioSource) {
        if (!audioContext) {
            initAudioContext();
        }

        // 断开现有连接（如果有）
        audioSource.disconnect && audioSource.disconnect();

        // 建立新连接
        audioSource.connect(dryGain);     // 干信号路径
        audioSource.connect(convolver);   // 混响信号路径

        // 应用当前的混响设置
        updateReverbSettings();
    }

    // 更新混响设置
    function updateReverbSettings() {
        if (!audioContext) return;

        // 设置混响湿/干比例
        reverbGain.gain.value = reverbAmount;
        dryGain.gain.value = 1;
    }

    // 初始化语言选择器的值
    languageSelector.value = currentLanguage;

    // 应用当前语言
    applyLanguage(currentLanguage);

    // 监听语言切换事件
    languageSelector.addEventListener('change', function() {
        currentLanguage = this.value;
        localStorage.setItem('audioMixerLanguage', currentLanguage);
        applyLanguage(currentLanguage);
        updateDisplays(); // 更新显示内容（如基本间隔时间显示等）
    });

    // 应用语言
    function applyLanguage(lang) {
        // 设置 HTML 的 lang 属性
        document.documentElement.lang = lang;

        // 更新所有带有 data-i18n 属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[lang] && translations[lang][key]) {
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translations[lang][key];
                } else {
                    element.textContent = translations[lang][key];
                }
            }
        });

        // 更新所有带有 data-i18n-title 属性的元素的 title 提示
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            if (translations[lang] && translations[lang][key]) {
                element.title = translations[lang][key];
            }
        });

        // 更新文档标题
        if (translations[lang] && translations[lang]['app_title']) {
            document.title = translations[lang]['app_title'];
        }

        // 更新所有权重输入框的提示信息
        const weightInputs = document.querySelectorAll('.weight-input');
        weightInputs.forEach(input => {
            input.title = translations[lang]['weight_tooltip'] || '播放权重（数值越大被播放概率越高）';
        });
    }

    function updateDisplays() {
        // 更新基本间隔时间显示
        const baseIntervalValue = (baseIntervalInput.value / 1000).toFixed(1);
        const secondsText = translations[currentLanguage]['seconds'] || '秒';
        baseIntervalDisplay.textContent = `${baseIntervalValue}${secondsText}`;

        // 更新混响强度百分比显示（仅显示百分比数值，不需要翻译）
        reverbAmountDisplay.textContent = `${reverbAmountInput.value}%`;
    }

    // 原有的代码保持不变
    const dropZone = document.getElementById('drop-zone');
    const playlist = document.getElementById('playlist');
    let audioPlayer = document.getElementById('audio-player'); // 主音   播放器（UI可见）
    const startButton = document.getElementById('start');
    const stopButton = document.getElementById('stop');
    const baseIntervalInput = document.getElementById('base-interval');
    const offsetInput = document.getElementById('offset');
    const baseIntervalDisplay = document.getElementById('base-interval-display');
    const offsetDisplay = document.getElementById('offset-display');
    const preventRepeatCheckbox = document.getElementById('prevent-repeat');
    const mixCountInput = document.getElementById('mix-count'); // 混音数量输入框
    const masterVolumeInput = document.getElementById('master-volume'); // 总音量控制
    const masterVolumeDisplay = document.getElementById('master-volume-display'); // 总音量             示
    const triggerModeSelect = document.getElementById('trigger-mode'); // 触发方式选择器
    const reverbAmountInput = document.getElementById('reverb-amount'); // 混响强度控制
    const reverbAmountDisplay = document.getElementById('reverb-amount-display'); // 混响强度显   

    let audioFiles = [];
    let randomPlayTimeout;
    let lastPlayedIndex = -1; // 记录上一次播  的索引
    let audioPlayers = []; // 固定数量的音频播放器池
    let isRandomPlaying = false; // 标记随机播放状态
    let masterVolume = 1.0; // 初始化总音量为100%

    // 在页面加载时恢复之前的设置
    restoreSettings();

    // 监听混音数量变化，更新播放器池并保存设置
    mixCountInput.addEventListener('change', () => {
        updateAudioPlayerPool();
        saveSettings();
    });

    // 保存除主音量外的所有设置
    function saveSettings() {
        const settings = {
            baseInterval: baseIntervalInput.value,
            offset: offsetInput.value,
            preventRepeat: preventRepeatCheckbox.checked,
            mixCount: mixCountInput.value,
            triggerMode: triggerModeSelect.value,
            reverbAmount: reverbAmountInput.value // 保存混响强度设置
        };

        localStorage.setItem('audioMixerSettings', JSON.stringify(settings));
    }

    // 恢复以前   存的设置
    function restoreSettings() {
        const savedSettingsJson = localStorage.getItem('audioMixerSettings');
        if (savedSettingsJson) {
            try {
                const savedSettings = JSON.parse(savedSettingsJson);

                // 恢复各项设置值
                if (savedSettings.baseInterval !== undefined) {
                    baseIntervalInput.value = savedSettings.baseInterval;
                    const valueInSeconds = (savedSettings.baseInterval / 1000).toFixed(1);
                    baseIntervalDisplay.textContent = `${valueInSeconds}秒`;
                }

                if (savedSettings.offset !== undefined) {
                    offsetInput.value = savedSettings.offset;
                    offsetDisplay.textContent = `${savedSettings.offset}%`;
                }

                if (savedSettings.preventRepeat !== undefined) {
                    preventRepeatCheckbox.checked = savedSettings.preventRepeat;
                }

                if (savedSettings.mixCount !== undefined) {
                    mixCountInput.value = savedSettings.mixCount;
                }

                if (savedSettings.triggerMode !== undefined) {
                    triggerModeSelect.value = savedSettings.triggerMode;
                }

                // 恢复混响强度设置
                if (savedSettings.reverbAmount !== undefined) {
                    reverbAmountInput.value = savedSettings.reverbAmount;
                    reverbAmountDisplay.textContent = `${savedSettings.reverbAmount}%`;
                    reverbAmount = parseFloat(savedSettings.reverbAmount) / 100; // 转换为0-1的比例
                }

                // 初始化播放器池
                updateAudioPlayerPool();

            } catch (error) {
                console.error('恢复设置出错:', error);
            }
        }
    }

    // 监听设置变化  保存设置
    baseIntervalInput.addEventListener('change', saveSettings);
    offsetInput.addEventListener('change', saveSettings);
    preventRepeatCheckbox.addEventListener('change', saveSettings);
    triggerModeSelect.addEventListener('change', saveSettings);

    // 在页面关闭或刷新时保存设置
    window.addEventListener('beforeunload', saveSettings);

    // 初始化音频播放器池
    updateAudioPlayerPool();

    // 更新音频播放器池
    function updateAudioPlayerPool() {
        // 停止随机播放
        if (isRandomPlaying) {
            stopRandomPlay();
        }

        // 停止并清理所有现有的播放器
        audioPlayers.forEach(player => {
            player.audio.pause();
            player.audio.src = '';
            // 不在这里重置sourceConnected，因为我们需要完全创建新的Audio元素
        });

        // 创建新的播放器池
        const mixCount = parseInt(mixCountInput.value) || 0;
        audioPlayers = [];

        // 如果混音数量为0，则不  建额外播放器
        if (mixCount === 0) {
            return;
        }

        // 创建指定数量的播放器
        for (let i = 0; i < mixCount; i++) {
            const audio = new Audio(); // 创建全新的Audio元素
            audio.volume = masterVolume;

            // 当音频结束时，标记为未播放状态
            audio.onended = function() {
                const playerIndex = audioPlayers.findIndex(p => p.audio === audio);
                if (playerIndex !== -1) {
                    audioPlayers[playerIndex].isPlaying = false;
                }
            };

            audioPlayers.push({
                audio: audio,
                isPlaying: false,
                url: '',
                sourceConnected: false, // 新创建的音频元素肯定没有连接过
                mediaSource: null // 添加字段跟踪媒体源节点
            });
        }
    }

    // 基本间隔时间和偏移值的计算
    const getRandomOffset = (base, percentage) => {
        return Math.floor(base * ((Math.random() * 2 - 1) * (percentage / 100)));
    }; // 计算正负随机偏移

    // 更新基本间隔时间显示
    baseIntervalInput.addEventListener('input', (event) => {
        const valueInSeconds = (event.target.value / 1000).toFixed(1);
        baseIntervalDisplay.textContent = `${valueInSeconds}秒`;
    });

    // 更新  机偏移百分比显示
    offsetInput.addEventListener('input', (event) => {
        offsetDisplay.textContent = `${event.target.value}%`;
    });

    // 更新总音量显示
    masterVolumeInput.addEventListener('input', (event) => {
        masterVolumeDisplay.textContent = `${event.target.value}%`;
        masterVolume = event.target.value / 100; // 更新总音量变量
        audioPlayer.volume = masterVolume; // 设  主音频播放器音量

        // 更新所有混音播放器的音量
        audioPlayers.forEach(player => {
            player.audio.volume = masterVolume;
        });
    });

    // 更新混响强度显示
    reverbAmountInput.addEventListener('input', (event) => {
        reverbAmountDisplay.textContent = `${event.target.value}%`;
        reverbAmount = parseFloat(event.target.value) / 100; // 更新混响强度变量(转换为0-1之间的值)

        // 应用混响设置
        updateReverbSettings();

        // 保存设置
        saveSettings();
    });

    // 阻止默认行为
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // 高亮拖拽区域
    dropZone.addEventListener('dragover', () => {
        dropZone.style.backgroundColor = 'rgba(94, 92, 230, 0.2)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.backgroundColor = 'rgba(94, 92, 230, 0.1)';
    });

    // 处理拖放完成事件，确保背景色恢复
    dropZone.addEventListener('drop', (event) => {
        dropZone.style.backgroundColor = 'rgba(94, 92, 230, 0.1)';

        // 获取所有拖  的项目
        const items = event.dataTransfer.items;
        if (!items) {
            handleFiles(event.dataTransfer.files);
            return;
        }

        // 使用一个队列来跟踪所有需要处理的条目
        const queue = [];
        for (let i = 0; i < items.length; i++) {
            queue.push(items[i].webkitGetAsEntry());
        }

        // 递归处理所有文件和文件夹
        processEntries(queue);
    });

    // 处理文件和文件夹条目
    function processEntries(entries) {
        if (!entries.length) return;

        const entry = entries.shift();

        if (entry.isFile) {
            // 如果是文件，直接处理
            entry.file(file => {
                if (file.type.startsWith('audio/')) {
                    addAudioFile(file);
                }
                // 继续处理队列中的其他条目
                processEntries(entries);
            });
        } else if (entry.isDirectory) {
            // 如果是文件夹，读取其内  
            const directoryReader = entry.createReader();
            directoryReader.readEntries(subEntries => {
                // 将文件夹内容添加到队列
                for (let i = 0; i < subEntries.length; i++) {
                    entries.push(subEntries[i]);
                }
                // 继续处理队列
                processEntries(entries);
            });
        } else {
            // 不是文件也不是文件夹，继续处理队列
            processEntries(entries);
        }
    }

    //   理文件列表 (兼容性处理，用于不支持FileSystemEntry API的情况)
    function handleFiles(files) {
        for (let file of files) {
            if (file.type.startsWith('audio/')) {
                addAudioFile(file);
            }
        }
    }

    // 添加音频文件到播放列表
    function addAudioFile(file) {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.justifyContent = 'space-between';

        // 创建音频名称元素
        const nameSpan = document.createElement('span');
        nameSpan.textContent = file.name;
        nameSpan.style.flexGrow = '1';
        nameSpan.style.marginRight = '10px';
        nameSpan.style.cursor = 'pointer';
        // 添加省略号样式类和title属性，实现鼠标悬停显示全名
        nameSpan.className = 'playlist-item-name';
        nameSpan.title = file.name; // 设置鼠标悬停时的完整提示

        // 创建权重输入框
        const weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.min = '0';
        weightInput.value = '1'; // 默认权重为1
        weightInput.style.width = '50px';
        weightInput.style.marginRight = '10px';
        // 使用多语言支持设置权重输入框提示
        weightInput.title = translations[currentLanguage]['weight_tooltip'] || '播放权重（数值越大被播放概率越高）';
        weightInput.classList.add('weight-input');

        // 创建淡紫色叉子图标的删除按钮
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-btn');
        deleteButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;

        // 创建一个对象URL以便存储和删除
        const objectUrl = URL.createObjectURL(file);

        deleteButton.onclick = (event) => {
            // 阻止事件冒泡，防止触发li   点击事件
            event.stopPropagation();
            removeAudio(objectUrl, li);
        };

        // 只有名称区域可点击播放
        nameSpan.addEventListener('click', () => {
            playSingleAudio(objectUrl);
        });

        li.appendChild(nameSpan);
        li.appendChild(weightInput);
        li.appendChild(deleteButton);

        playlist.appendChild(li);
        audioFiles.push({
            url: objectUrl,
            weight: 1, // 默认权重
            element: li,
            weightInput: weightInput
        });

        // 监听权重改变
        weightInput.addEventListener('change', (event) => {
            const index = audioFiles.findIndex(item => item.url === objectUrl);
            if (index > -1) {
                const newWeight = parseInt(event.target.value) || 0;
                audioFiles[index].weight = newWeight;
            }
        });
    }

    // 删除音频文件
    function removeAudio(url, li) {
        const index = audioFiles.findIndex(item => item.url === url);
        if (index > -1) {
            URL.revokeObjectURL(audioFiles[index].url); // 释放URL对象
            audioFiles.splice(index, 1); // 从数组中移除
            playlist.removeChild(li); // 从DOM中移除

            // 如果是当前正在播放的音频，停止播放并重置混响连接状态
            if (audioPlayer.src === url) {
                audioPlayer.pause();
                audioPlayer.src = '';
                // 重置主播放器的连接状态
                audioSourceConnected = false;
            }

            // 检查是否有混音播放器在播放这个URL
            audioPlayers.forEach(player => {
                if (player.url === url) {
                    player.audio.pause();
                    player.audio.src = '';
                    player.isPlaying = false;
                    player.url = '';
                    player.sourceConnected = false; // 重置连接状态标志
                }
            });
        }
    }

    // 单次播放音频（不进入随机播放循环）
    function playSingleAudio(url) {
        // 停止随机播放（如果存  ）
        if (isRandomPlaying) {
            stopRandomPlay();
        }

        // 如果需要使用Web Audio API处理混响
        if (reverbAmount > 0 && typeof window.AudioContext !== 'undefined') {
            // 确保音频上下文已初始化
            if (!audioContext) {
                initAudioContext();
            }

            // 处理媒体元素源节点
            if (audioSourceConnected) {
                // 重置音  元素，让它不再连接到Web Audio API
                audioPlayer.pause();
                audioPlayer = new Audio(); // 创建新的音频元素
                audioPlayer.volume = masterVolume;
                audioSourceConnected = false;
            }

            // 播放被点击的音频文件
            audioPlayer.src = url;
            audioPlayer.oncanplaythrough = function() {
                // 在可以顺畅播放时执行
                if (!audioSourceConnected) {
                    // 创建媒体元素源
                    mediaElementSource = audioContext.createMediaElementSource(audioPlayer);
                    // 连接到混响链
                    connectToReverbChain(mediaElementSource);
                    audioSourceConnected = true;
                }

                audioPlayer.play();
                // 移除事件监听器       避免多次触发
                audioPlayer.oncanplaythrough = null;
            };
        } else {
            // 直接播放，不使用Web Audio API
            audioPlayer.src = url;
            audioPlayer.volume = masterVolume;
            audioPlayer.play();
        }

        // 不设置onended事件，这样播放完毕后不会继续播放
        audioPlayer.onended = null;
    }

    // 播放下一首音频
    function playNextAudio() {
        if (audioFiles.length === 0) return; // 如果没有音频文件，停止播放

        const baseInterval = parseInt(baseIntervalInput.value);
        const offsetPercentage = parseInt(offsetInput.value);
        const mixCount = parseInt(mixCountInput.value) || 0;
        const triggerMode = triggerModeSelect.value; // 获取触发方式

        // 选择要播放的音频
        const selectedFile = weightedRandom();
        if (!selectedFile) return; // 如果没有有效文件（所有权重都为0）

        // 检查是否启用防止重复播放功能
        if (preventRepeatCheckbox.checked && lastPlayedIndex !== -1) {
            // 如果选中的文件是上次播放的文件，则重新选择
            if (audioFiles[lastPlayedIndex] && audioFiles[lastPlayedIndex].url === selectedFile.url) {
                // 如果只有一个有效的音频文件且防止重复，则不播放
                if (audioFiles.filter(file => file.weight > 0).length <= 1) {
                    if (triggerMode === 'timer') {
                        // 定时器模式下继续尝试
                        randomPlayTimeout = setTimeout(playNextAudio, baseInterval);
                    }
                    return;
                }
                return playNextAudio(); // 递归调用以重新选择
            }
        }

        // 计算下一次播放的时间间隔
        const offset = getRandomOffset(baseInterval, offsetPercentage);
        const finalInterval = baseInterval + offset;

        // 高亮  前播放的项目
        audioFiles.forEach(file => {
            if (file.element && file.url !== selectedFile.url) {
                file.element.classList.remove('playing');
            }
        });
        if (selectedFile.element) {
            selectedFile.element.classList.add('playing');
        }

        // 根据混音设置决定播放方式
        if (mixCount > 0) {
            // 混音模式：寻找空闲的播放器，或者使用第一个播放器
            let playerToUse = audioPlayers.find(player => !player.isPlaying);

            // 如果没有空闲播放器，则使用第一个
            if (!playerToUse && audioPlayers.length > 0) {
                playerToUse = audioPlayers[0];
                playerToUse.audio.pause(); // 停止当  播放
            }

            // 使用选定的播放器播放
            if (playerToUse) {
                playerToUse.url = selectedFile.url;
                playerToUse.isPlaying = true;
                playerToUse.audio.src = selectedFile.url;
                playerToUse.audio.volume = masterVolume;

                // 检查是否需要应用混响效果
                if (reverbAmount > 0 && typeof window.AudioContext !== 'undefined') {
                    // 确保音频上下文已初始化
                    if (!audioContext) {
                        initAudioContext();
                    }

                    // 无论之前是否连接过，都创建一个全新的Audio元素
                    // 保存原来的音量和URL
                    const volume = masterVolume;
                    const url = selectedFile.url;

                    // 创建全新的音频元素替换旧的
                    playerToUse.audio.pause();
                    playerToUse.audio = new Audio();
                    playerToUse.audio.volume = volume;
                    playerToUse.audio.src = url;
                    playerToUse.sourceConnected = false;

                    // 设置oncanplaythrough以连接到Web Audio API
                    playerToUse.audio.oncanplaythrough = function() {
                        try {
                            // 创建媒体元素源并连   到混响链
                            const source = audioContext.createMediaElementSource(playerToUse.audio);
                            playerToUse.mediaSource = source; // 保存媒体源的引用
                            connectToReverbChain(source);
                            playerToUse.sourceConnected = true;

                            playerToUse.audio.play().catch(e => {
                                console.error("播放音频失败:", e);
                            });
                        } catch (e) {
                            console.error("处理音频播放过程中出错:", e);

                            // 错误恢复: 尝试直接播放不带混响效果
                            try {
                                playerToUse.audio.play();
                            } catch (e2) {
                                console.error("恢复播放也失败:", e2);
                            }
                        }

                        // 移除事件监听器，避免多次触发
                        playerToUse.audio.oncanplaythrough = null;
                    };
                } else {
                    // 直接播放，不使   混响
                    // 创建新的音频元素，解决停止后重新播放的问题
                    playerToUse.audio.pause();
                    playerToUse.audio = new Audio();
                    playerToUse.audio.volume = masterVolume;
                    playerToUse.audio.src = selectedFile.url;
                    playerToUse.audio.play().catch(e => {
                        console.error("播放音频失败:", e);
                    });
                }

                // 音频结束后更新状态和处   播放完成触发模式
                playerToUse.audio.onended = function() {
                    playerToUse.isPlaying = false;
                    playerToUse.url = '';

                    // 如果是   放完成触发模式并且随机播放仍在激活状态，则播   下一首
                    if (triggerMode === 'ended' && isRandomPlaying) {
                        playNextAudio();
                    }
                };
            }
        } else {
            // 非混音模式：停止所有播放，只用主播放器
            if (reverbAmount > 0 && typeof window.AudioContext !== 'undefined') {
                // 确保音频上下文已初  化
                if (!audioContext) {
                    initAudioContext();
                }

                // 处理媒体元素源节点
                if (audioSourceConnected) {
                    // 重置音频元素，让它不再连接到Web Audio API
                    audioPlayer.pause();
                    audioPlayer = new Audio(); // 创建新的音频元素
                    audioPlayer.volume = masterVolume;
                    audioSourceConnected = false;
                }

                // 设置播放源
                audioPlayer.src = selectedFile.url;

                // 在可以播放时连接到混响效  链
                audioPlayer.oncanplaythrough = function() {
                    if (!audioSourceConnected) {
                        // 创建媒体元素源
                        mediaElementSource = audioContext.createMediaElementSource(audioPlayer);
                        // 连接到混响链
                        connectToReverbChain(mediaElementSource);
                        audioSourceConnected = true;
                    }
                    audioPlayer.play();
                    // 移除事件监听器，避免多次触发
                    audioPlayer.oncanplaythrough = null;
                };
            } else {
                // 直接播放，不使用混响
                audioPlayer.src = selectedFile.url;
                audioPlayer.volume = masterVolume;
                audioPlayer.play();
            }

            // 在音频播放结束时处理
            if (triggerMode === 'ended') {
                audioPlayer.onended = function() {
                    // 如果随机播放仍在激活状态，则播放下一首
                    if (isRandomPlaying) {
                        playNextAudio();
                    }
                };
            } else {
                // 定时器模式下，移除onended事件处理器
                audioPlayer.onended = null;
            }
        }

        // 更新上一次播放的索引
        lastPlayedIndex = audioFiles.findIndex(file => file.url === selectedFile.url);

        // 仅在定时器触发模式下设置下一次播放的定时器
        if (triggerMode === 'timer') {
            randomPlayTimeout = setTimeout(playNextAudio, finalInterval);
        }
    }

    // 根据权重进行随机选择
    function weightedRandom() {
        // 过滤掉权重为0的项
        const validFiles = audioFiles.filter(file => file.weight > 0);
        if (validFiles.length === 0) return null;

        // 计算所有权重总和
        const totalWeight = validFiles.reduce((sum, file) => sum + file.weight, 0);

        // 生成一个0到总权重之间的随机数
        const randomValue = Math.random() * totalWeight;

        // 查找随机数落在哪个权重区间内
        let weightSum = 0;
        for (const file of validFiles) {
            weightSum += file.weight;
            if (randomValue <= weightSum) {
                return file;
            }
        }

        // 保底返回最后一个（理论上不应该到这里）
        return validFiles[validFiles.length - 1];
    }

    // 随机播放
    startButton.addEventListener('click', () => {
        startButton.classList.add('hidden');
        stopButton.classList.remove('hidden');
        isRandomPlaying = true;
        playNextAudio(); // 开始播放第一首
    });

    stopButton.addEventListener('click', () => {
        stopRandomPlay();
    });

    // 停止随机播放
    function stopRandomPlay() {
        clearTimeout(randomPlayTimeout); // 清除定时器
        audioPlayer.pause(); // 暂停当前正在播放的音频
        audioPlayer.currentTime = 0; // 将播放进度重置到开始
        audioPlayer.onended = null; // 移除播放结束事件监听器
        stopButton.classList.add('hidden');
        startButton.classList.remove('hidden');
        isRandomPlaying = false;

        // 移除所有高亮
        audioFiles.forEach(file => {
            if (file.element) file.element.classList.remove('playing');
        });

        // 停止所有播放器并重置连接状态
        audioPlayers.forEach(player => {
            player.audio.pause();
            player.audio.src = '';
            player.isPlaying = false;
            player.url = '';
            player.sourceConnected = false; //    置连接状态标志
        });

        // 重置主播放器的连接状态
        audioSourceConnected = false;

        // 完全重置主播放器对象，避免旧连接残留问题
        audioPlayer = new Audio();
        audioPlayer.id = 'audio-player';
        audioPlayer.volume = masterVolume;

        // 完全清除Web Audio API相关资源，强制下次从头创建
        if (audioContext) {
            try {
                // 断开所有现有连接
                if (mediaElementSource) {
                    mediaElementSource.disconnect();
                }
                if (reverbGain) {
                    reverbGain.disconnect();
                }
                if (dryGain) {
                    dryGain.disconnect();
                }
                if (convolver) {
                    convolver.disconnect();
                }
                if (masterGain) {
                    masterGain.disconnect();
                }
            } catch(e) {
                console.log("断开连接时出错:", e);
            }

            // 设置所有音频处理节点为null，强制垃圾回收
            mediaElementSource = null;
            reverbNode = null;
            reverbGain = null;
            dryGain = null;
            convolver = null;
            masterGain = null;

            // 关闭并清除AudioContext对象，以便下次重新创建
            try {
                audioContext.close().then(() => {
                    console.log('AudioContext已关闭');
                }).catch(e => {
                    console.log('关闭AudioContext出错:', e);
                });
            } catch(e) {
                console.log('尝试关闭AudioContext出错:', e);
            }

            // 无论如何都将audioContext置为null，强制下次重新创建
            audioContext = null;
        }
    }

    // 阻止默认行为
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
});
