// 多语言翻译配置
const translations = {
    // 中文翻译
    'zh': {
        // 标题和描述
        'app_title': 'MockerMix',
        'app_description': '拖放音频文件并创建混音效果',

        // 左侧面板
        'drop_zone': '拖拽音频或目录到这里',
        'playlist_title': '播放列表',
        'empty_list': '暂无音频文件',

        // 右侧面板 - 控制面板
        'control_panel': '控制面板',
        'start_random': '开始随机播放',
        'stop_play': '停止播放',
        'mix_count': '混音数量',
        'mix_count_desc': '(0=不混音，最大6个)',
        'mix_count_tooltip': '设置同时混音的音频数量，0表示不混音',
        'master_volume': '总音量',

        // 右侧面板 - 播放设置
        'play_settings': '播放设置',
        'base_interval': '基本间隔时间',
        'seconds': '秒',
        'offset_percentage': '随机偏移百分比',
        'prevent_repeat': '防止重复',
        'trigger_mode': '触发方式',
        'trigger_mode_timer': '当计时器触发时',
        'trigger_mode_ended': '当音频播放完成时',
        'trigger_mode_timer_tooltip': '按照时间间隔定期触发新的音频播放',
        'trigger_mode_ended_tooltip': '当前音频播放结束时触发新的音频播放',

        // 权重提示
        'weight_tooltip': '播放权重（数值越大被播放概率越高）',

        // 语言
        'language': '语言',
        'lang_zh': '中文',
        'lang_en': '英文',
        'lang_ja': '日文',

        // 效果器面板
        'effects_panel': '效果器',
        'reverb_level': '混响强度',
        'reverb_room_size': '房间大小',
        'reverb_decay': '衰减时间',
        'echo_delay': '回声延迟',
        'echo_feedback': '回声反馈',
        'lowpass_filter': '低通滤波器',
        'enable_effects': '启用效果器'
    },

    // 英文翻译
    'en': {
        // 标题和描述
        'app_title': 'MockerMix',
        'app_description': 'Drop audio files or folder to create mixing effects',

        // 左侧面板
        'drop_zone': 'Drag audio files/folder here',
        'playlist_title': 'Playlist',
        'empty_list': 'No audio files',

        // 右侧面板 - 控制面板
        'control_panel': 'Control Panel',
        'start_random': 'Start Random Play',
        'stop_play': 'Stop Playing',
        'mix_count': 'Mix Count',
        'mix_count_desc': '(0=No mixing, max 6)',
        'mix_count_tooltip': 'Set the number of audio files to mix simultaneously, 0 means no mixing',
        'master_volume': 'Master Volume',

        // 右侧面板 - 播放设置
        'play_settings': 'Play Settings',
        'base_interval': 'Base Interval',
        'seconds': 'sec',
        'offset_percentage': 'Random Offset Percentage',
        'prevent_repeat': 'Prevent playing the same audio repeatedly',
        'trigger_mode': 'Trigger Mode',
        'trigger_mode_timer': 'When timer triggers',
        'trigger_mode_ended': 'When audio playback ends',
        'trigger_mode_timer_tooltip': 'Trigger new audio playback at regular time intervals',
        'trigger_mode_ended_tooltip': 'Trigger new audio playback when current audio finishes playing',

        // 权重提示
        'weight_tooltip': 'Play weight (higher value increases play probability)',

        // 语言
        'language': 'Language',
        'lang_zh': 'Chinese',
        'lang_en': 'English',
        'lang_ja': 'Japanese',

        // 效果器面板
        'effects_panel': 'Effects Processor',
        'reverb_level': 'Reverb Level',
        'reverb_room_size': 'Room Size',
        'reverb_decay': 'Decay Time',
        'echo_delay': 'Echo Delay',
        'echo_feedback': 'Echo Feedback',
        'lowpass_filter': 'Lowpass Filter',
        'enable_effects': 'Enable Effects'
    },

    // 日文翻译
    'ja': {
        // 标题和描述
        'app_title': 'MockerMix',
        'app_description': 'オーディオファイルをドラッグ＆ドロップしてミックスエフェクトを作成する',

        // 左侧面板
        'drop_zone': 'オーディオファイルをここにドラッグ',
        'playlist_title': 'プレイリスト',
        'empty_list': 'オーディオファイルなし',

        // 右侧面板 - 控制面板
        'control_panel': 'コントロールパネル',
        'start_random': 'ランダム再生開始',
        'stop_play': '再生停止',
        'mix_count': 'ミキシング数',
        'mix_count_desc': '(0=ミキシングなし、最大6)',
        'mix_count_tooltip': '同時にミキシングするオーディオの数を設定、0はミキシングなし',
        'master_volume': 'マスターボリューム',

        // 右侧面板 - 播放设置
        'play_settings': '再生設定',
        'base_interval': '基本間隔時間',
        'seconds': '秒',
        'offset_percentage': 'ランダムオフセット割合',
        'prevent_repeat': '同じオーディオの連続再生を防止',
        'trigger_mode': 'トリガーモード',
        'trigger_mode_timer': 'タイマーがトリガーされたとき',
        'trigger_mode_ended': 'オーディオ再生終了時',
        'trigger_mode_timer_tooltip': '一定の時間間隔で新しいオーディオの再生をトリガー',
        'trigger_mode_ended_tooltip': '現在のオーディオの再生が終了したとき新しいオーディオの再生をトリガー',

        // 权重提示
        'weight_tooltip': '再生の重み（値が大きいほど再生確率が高くなります）',

        // 语言
        'language': '言語',
        'lang_zh': '中国語',
        'lang_en': '英語',
        'lang_ja': '日本語',

        // 效果器面板
        'effects_panel': 'エフェクター',
        'reverb_level': 'リバーブ強度',
        'reverb_room_size': 'ルームサイズ',
        'reverb_decay': '減衰時間',
        'echo_delay': 'エコーディレイ',
        'echo_feedback': 'エコーフィードバック',
        'lowpass_filter': 'ローパスフィルター',
        'enable_effects': 'エフェクト有効化'
    }
};
