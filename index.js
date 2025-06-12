// 音频播放器主要功能

document.addEventListener('DOMContentLoaded', function() {
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

    let audioFiles = [];
    let randomPlayTimeout;
    let lastPlayedIndex = -1; // 记录上一次播放的索引
    let audioPlayers = []; // 固定数量的音频播放器池
    let isRandomPlaying = false; // 标记随机播放状态

    // 监听混音数量变化，更新播放器池
    mixCountInput.addEventListener('change', updateAudioPlayerPool);

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

    // 阻止默认行为
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // 高亮拖拽区域
    dropZone.addEventListener('dragover', () => {
        dropZone.style.backgroundColor = '#e0f7e9';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.backgroundColor = '#ffffff';
    });

    // 处理文件拖拽
    dropZone.addEventListener('drop', (event) => {
        dropZone.style.backgroundColor = '#ffffff';
        const files = event.dataTransfer.files;
        handleFiles(files);
    });

    // 处理音频文件
    function handleFiles(files) {
        for (let file of files) {
            if (file.type.startsWith('audio/')) {
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

                const deleteButton = document.createElement('button');
                deleteButton.textContent = '删除';
                deleteButton.classList.add('px-2', 'bg-red-500', 'text-white', 'rounded');

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
        }
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

        // 选择要播放的音频
        const selectedFile = weightedRandom();
        if (!selectedFile) return; // 如果没有有效文件（所有权重都为0）

        // 检查是否启用防止重复播放功能
        if (preventRepeatCheckbox.checked && lastPlayedIndex !== -1) {
            // 如果选中的文件是上次播放的文件，则重新选择
            if (audioFiles[lastPlayedIndex] && audioFiles[lastPlayedIndex].url === selectedFile.url) {
                // 如果只有一个有效的音频文件且防止重复，就不播放
                if (audioFiles.filter(file => file.weight > 0).length <= 1) {
                    randomPlayTimeout = setTimeout(playNextAudio, baseInterval);
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
            // 混音模式：寻找空闲的播放器，或者使用第一个播放器
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
                playerToUse.audio.play();

                // 音频结束后更新状态
                playerToUse.audio.onended = function() {
                    playerToUse.isPlaying = false;
                    playerToUse.url = '';
                };
            }
        } else {
            // 非混音模式：停止所有播放，只用主播放器
            audioPlayer.src = selectedFile.url;
            audioPlayer.play();
        }

        // 更新上一次播放的索引
        lastPlayedIndex = audioFiles.findIndex(file => file.url === selectedFile.url);

        // 设置定时器用于播放下一首
        randomPlayTimeout = setTimeout(playNextAudio, finalInterval);
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
