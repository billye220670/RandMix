// 音频播放器主要功能

document.addEventListener('DOMContentLoaded', function() {
    // 多语言支持
    let currentLanguage = localStorage.getItem('audioMixerLanguage') || 'zh'; // 默认中文
    const languageSelector = document.getElementById('language-select');

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

        // 更新文档标题
        if (translations[lang] && translations[lang]['app_title']) {
            document.title = translations[lang]['app_title'];
        }
    }

    function updateDisplays() {
        // 更新基本间隔时间显示
        const baseIntervalValue = (baseIntervalInput.value / 1000).toFixed(1);
        const secondsText = translations[currentLanguage]['seconds'] || '秒';
        baseIntervalDisplay.textContent = `${baseIntervalValue}${secondsText}`;
    }

    // 原有的代码保持不变
    const dropZone = document.getElementById('drop-zone');
    const playlist = document.getElementById('playlist');
    const audioPlayer = document.getElementById('audio-player'); // 主音频播放器（UI可见）
    const startButton = document.getElementById('start');
    const stopButton = document.getElementById('stop');
    const baseIntervalInput = document.getElementById('base-interval');
    const offsetInput = document.getElementById('offset');
    const baseIntervalDisplay = document.getElementById('base-interval-display');
    const offsetDisplay = document.getElementById('offset-display');
    const preventRepeatCheckbox = document.getElementById('prevent-repeat');
    const mixCountInput = document.getElementById('mix-count'); // 混音数量输入框
    const masterVolumeInput = document.getElementById('master-volume'); // 总音量控制
    const masterVolumeDisplay = document.getElementById('master-volume-display'); // 总音量显示
    const triggerModeSelect = document.getElementById('trigger-mode'); // 触发方式选择器

    let audioFiles = [];
    let randomPlayTimeout;
    let lastPlayedIndex = -1; // 记录上一次播放的索引
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
            triggerMode: triggerModeSelect.value
        };

        localStorage.setItem('audioMixerSettings', JSON.stringify(settings));
    }

    // 恢复以前保存的设置
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

                // 初始化播放器池
                updateAudioPlayerPool();

            } catch (error) {
                console.error('恢复设置出错:', error);
            }
        }
    }

    // 监听设置变化，保存设置
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
        });

        // 创建新的播放器池
        const mixCount = parseInt(mixCountInput.value) || 0;
        audioPlayers = [];

        // 如果混音数量为0，则不创建额外播放器
        if (mixCount === 0) {
            return;
        }

        // 创建指定数量的播放器
        for (let i = 0; i < mixCount; i++) {
            const audio = new Audio();
            audio.volume = 1;

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
                url: ''
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

    // 更新随机偏移百分比显示
    offsetInput.addEventListener('input', (event) => {
        offsetDisplay.textContent = `${event.target.value}%`;
    });

    // 更新总音量显示
    masterVolumeInput.addEventListener('input', (event) => {
        masterVolumeDisplay.textContent = `${event.target.value}%`;
        masterVolume = event.target.value / 100; // 更新总音量变量
        audioPlayer.volume = masterVolume; // 设置主音频播放器音量

        // 更新所有混音播放器的音量
        audioPlayers.forEach(player => {
            player.audio.volume = masterVolume;
        });
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

        // 获取所有拖放的项目
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
            // 如果是文件夹，读取其内容
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

    // 处理文件列表 (兼容性处理，用于不支持FileSystemEntry API的情况)
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

        // 创建权重输入框
        const weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.min = '0';
        weightInput.value = '1'; // 默认权重为1
        weightInput.style.width = '50px';
        weightInput.style.marginRight = '10px';
        weightInput.title = '播放权重（数值越大被播放概率越高）';
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
            // 阻止事件冒泡，防止触发li的点击事件
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

            // 如果是当前正在播放的音频，停止播放
            if (audioPlayer.src === url) {
                audioPlayer.pause();
                audioPlayer.src = '';
            }

            // 检查是否有混音播放器在播放这个URL
            audioPlayers.forEach(player => {
                if (player.url === url) {
                    player.audio.pause();
                    player.audio.src = '';
                    player.isPlaying = false;
                    player.url = '';
                }
            });
        }
    }

    // 单次播放音频（不进入随机播放循环）
    function playSingleAudio(url) {
        // 停止随机播放（如果存在）
        if (isRandomPlaying) {
            stopRandomPlay();
        }

        // 播放被点击的音频文件
        audioPlayer.src = url;
        audioPlayer.play();

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
                // 如果只有一个有效的音频文件且防止重复，��不播放
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

        // 高亮当前播放的项目
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
            // 混音��式：寻找空闲的播放器���或者使用第一个播放器
            let playerToUse = audioPlayers.find(player => !player.isPlaying);

            // 如果没有空闲播放器，则使用第一个
            if (!playerToUse && audioPlayers.length > 0) {
                playerToUse = audioPlayers[0];
                playerToUse.audio.pause(); // 停止当前播放
            }

            // 使用选定的播放器播放
            if (playerToUse) {
                playerToUse.url = selectedFile.url;
                playerToUse.isPlaying = true;
                playerToUse.audio.src = selectedFile.url;
                playerToUse.audio.volume = masterVolume;
                playerToUse.audio.play();

                // 音频结束后更新状态和处理播放完成触发模式
                playerToUse.audio.onended = function() {
                    playerToUse.isPlaying = false;
                    playerToUse.url = '';

                    // 如果是播放完成触发模式并且随机播放仍在激活状态，则播放下一首
                    if (triggerMode === 'ended' && isRandomPlaying) {
                        playNextAudio();
                    }
                };
            }
        } else {
            // 非混音模式：停止所有播放，只用主播放器
            audioPlayer.src = selectedFile.url;
            audioPlayer.volume = masterVolume;
            audioPlayer.play();

            // 在音频播放结束时处理
            if (triggerMode === 'ended') {
                audioPlayer.onended = function() {
                    // 如果随机播放仍在激活状态，则播放下一首
                    if (isRandomPlaying) {
                        playNextAudio();
                    }
                };
            } else {
                // 定时器模式下，清除onended事件处理器
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
        audioPlayer.pause(); // 暂停当前正在���放的音频
        audioPlayer.currentTime = 0; // 将播放进度重置到开始
        audioPlayer.onended = null; // 移除播放结束事件监听器
        stopButton.classList.add('hidden');
        startButton.classList.remove('hidden');
        isRandomPlaying = false;

        // 移除所有高亮
        audioFiles.forEach(file => {
            if (file.element) file.element.classList.remove('playing');
        });

        // 停止所有播放器
        audioPlayers.forEach(player => {
            player.audio.pause();
            player.audio.src = '';
            player.isPlaying = false;
            player.url = '';
        });
    }

    // 阻止默认行为
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
});
