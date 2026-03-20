/**
 * i18n.js — 轻量级国际化工具
 * 支持中文 (zh) / English (en)
 * 用法：const { t, locale, setLocale } = useI18n()
 */
import { reactive, computed } from 'vue'

const state = reactive({
  locale: localStorage.getItem('sm-locale') || 'zh'
})

const messages = {
  zh: {
    // ── App / Common ──────────────────────────────
    app_name: 'STARMUSIC',
    unknown_song: '未知歌曲',
    unknown_artist: '未知艺术家',
    loading: '加载中...',
    ok: '我知道了',
    cancel: '取消',
    confirm: '确定',
    back: '返回',

    // ── FileBrowser ───────────────────────────────
    theme: '主题',
    settings: '设置',
    welcome_title: '开始你的音乐之旅',
    welcome_sub: '选择本地文件，或聆听线上音乐',
    local_files: '本地文件',
    listen_music: '聆听音乐',
    change_folder: '更换文件夹',
    refresh: '刷新',
    my_favorites: '我的收藏',
    items: '{n} 个项目',
    search_placeholder: '搜索歌曲，按 Enter',
    select_theme: '选择主题',
    root_dir: '根目录',
    search_results: '搜索结果（{n} 首）',
    exit_search: '退出搜索',
    no_audio_files: '此目录没有音频文件',
    no_search_results: '没有找到匹配的歌曲',
    favorite: '收藏',
    add_next: '下一首播放',

    // ── PlayerView ────────────────────────────────
    play_order: '顺序播放',
    play_shuffle: '随机播放',
    play_repeat: '单曲循环',
    no_lyrics: '暂无歌词',
    lyrics_hint: '将同名 .lrc 文件放在歌曲同目录下',
    lyrics_label: 'LYRICS',
    close_lyrics: '关闭歌词',
    info_btn: '信息',
    lyrics_btn: '歌词',
    seek_back: '后退3秒',
    seek_fwd: '快进3秒',

    // ── MusicPlayer ───────────────────────────────
    connect_failed_prefix: '连接失败：',
    cache_cleared: '清理成功',
    cache_cleared_n: '清理成功（{n} 项）',
    cache_clear_title: '清理缓存',
    cache_clear_failed: '清理缓存失败',
    songs_count: '{n} 首',
    no_favorites: '暂无收藏',
    favorites_hint: '在播放页面点击心形图标收藏歌曲',
    server_required_fav: '请先连接服务器',
    get_favorites_failed: '获取收藏失败',
    request_failed_prefix: '请求失败: ',

    // ── MetadataPanel ─────────────────────────────
    tag_info: 'TAG INFO',
    basic_info: '基本信息',
    track_info: '曲目信息',
    technical: '技术参数',
    custom_fields: '自定义字段',
    no_cover: '无封面',
    no_tag_info: '暂无标签信息',
    play_to_load: '播放音频后自动读取',
    mono: '单声道',
    stereo: '立体声',
    // Field labels
    field_title: 'Title（标题）',
    field_artist: 'Artist（艺术家）',
    field_album_artist: 'Album Artist（专辑艺术家）',
    field_album: 'Album（专辑）',
    field_year: 'Year（年份）',
    field_genre: 'Genre（流派）',
    field_composer: 'Composer（作曲）',
    field_comment: 'Comment（备注）',
    field_track: 'Track（曲目）',
    field_disc: 'Disc（碟号）',
    field_bpm: 'BPM（节拍）',
    field_isrc: 'ISRC',
    field_copyright: 'Copyright（版权）',
    field_url: 'URL（链接）',
    field_format: 'Format（格式）',
    field_duration: 'Duration（时长）',
    field_bitrate: 'Bitrate（码率）',
    field_sample: 'Sample Rate（采样率）',
    field_channels: 'Channels（声道）',
    field_filesize: 'File Size（文件大小）',
    field_filename: 'File Name（文件名）',
    field_encoder: 'Encoder（编码器）',

    // ── PlaylistPanel ─────────────────────────────
    playlist: '播放列表',
    playlist_empty: '播放列表为空',

    // ── SleepTimer ────────────────────────────────
    sleep_timer: '定时停止',
    sleep_timer_panel: '定时停止播放',
    end_of_song: '本曲结束',
    stop_after: '将在此时间后停止播放',
    minutes_unit: '分钟',
    after_current_song: '本曲结束后',
    custom_minutes: '自定义分钟',
    cancel_timer: '取消定时',
    custom_minutes_hint: '自定义分钟数 (1-999)',
    sleep_active_prefix: '定时停止：',
    sleep_active_end: '定时停止：本曲结束后',

    // ── SettingsPanel ─────────────────────────────
    settings_title: '设置',
    clear_cache: '清理缓存',
    server_required: '需连接服务器后可用',
    version_label: '软件版本 {v}',
    language_label: '语言',
    lang_zh: '中文',
    lang_en: 'English',
  },

  en: {
    // ── App / Common ──────────────────────────────
    app_name: 'STARMUSIC',
    unknown_song: 'Unknown Song',
    unknown_artist: 'Unknown Artist',
    loading: 'Loading...',
    ok: 'OK',
    cancel: 'Cancel',
    confirm: 'Set',
    back: 'Back',

    // ── FileBrowser ───────────────────────────────
    theme: 'Theme',
    settings: 'Settings',
    welcome_title: 'Start Your Music Journey',
    welcome_sub: 'Choose local files or listen online',
    local_files: 'Local Files',
    listen_music: 'Listen',
    change_folder: 'Change Folder',
    refresh: 'Refresh',
    my_favorites: 'My Favorites',
    items: '{n} items',
    search_placeholder: 'Search songs, press Enter',
    select_theme: 'Select Theme',
    root_dir: 'Root',
    search_results: 'Results ({n})',
    exit_search: 'Exit Search',
    no_audio_files: 'No audio files in this directory',
    no_search_results: 'No matching songs found',
    favorite: 'Favorite',
    add_next: 'Play Next',

    // ── PlayerView ────────────────────────────────
    play_order: 'Sequential',
    play_shuffle: 'Shuffle',
    play_repeat: 'Repeat One',
    no_lyrics: 'No Lyrics',
    lyrics_hint: 'Place a .lrc file with the same name in the song directory',
    lyrics_label: 'LYRICS',
    close_lyrics: 'Close',
    info_btn: 'Info',
    lyrics_btn: 'Lyrics',
    seek_back: 'Back 3s',
    seek_fwd: 'Fwd 3s',

    // ── MusicPlayer ───────────────────────────────
    connect_failed_prefix: 'Connection failed: ',
    cache_cleared: 'Cache cleared',
    cache_cleared_n: 'Cleared ({n} items)',
    cache_clear_title: 'Clear Cache',
    cache_clear_failed: 'Failed to clear cache',
    songs_count: '{n} songs',
    no_favorites: 'No Favorites',
    favorites_hint: 'Click the heart icon on the player to favorite songs',
    server_required_fav: 'Please connect to a server first',
    get_favorites_failed: 'Failed to get favorites',
    request_failed_prefix: 'Request failed: ',

    // ── MetadataPanel ─────────────────────────────
    tag_info: 'TAG INFO',
    basic_info: 'Basic Info',
    track_info: 'Track Info',
    technical: 'Technical',
    custom_fields: 'Custom Fields',
    no_cover: 'No Cover',
    no_tag_info: 'No tag info',
    play_to_load: 'Play audio to load tags',
    mono: 'Mono',
    stereo: 'Stereo',
    // Field labels
    field_title: 'Title',
    field_artist: 'Artist',
    field_album_artist: 'Album Artist',
    field_album: 'Album',
    field_year: 'Year',
    field_genre: 'Genre',
    field_composer: 'Composer',
    field_comment: 'Comment',
    field_track: 'Track',
    field_disc: 'Disc',
    field_bpm: 'BPM',
    field_isrc: 'ISRC',
    field_copyright: 'Copyright',
    field_url: 'URL',
    field_format: 'Format',
    field_duration: 'Duration',
    field_bitrate: 'Bitrate',
    field_sample: 'Sample Rate',
    field_channels: 'Channels',
    field_filesize: 'File Size',
    field_filename: 'File Name',
    field_encoder: 'Encoder',

    // ── PlaylistPanel ─────────────────────────────
    playlist: 'Playlist',
    playlist_empty: 'Playlist is empty',

    // ── SleepTimer ────────────────────────────────
    sleep_timer: 'Sleep',
    sleep_timer_panel: 'Stop Playing After',
    end_of_song: 'End of song',
    stop_after: 'Will stop after this time',
    minutes_unit: 'min',
    after_current_song: 'After current song',
    custom_minutes: 'Custom min',
    cancel_timer: 'Cancel Timer',
    custom_minutes_hint: 'Custom minutes (1-999)',
    sleep_active_prefix: 'Sleep: ',
    sleep_active_end: 'Sleep: after this song',

    // ── SettingsPanel ─────────────────────────────
    settings_title: 'Settings',
    clear_cache: 'Clear Cache',
    server_required: 'Connect to server first',
    version_label: 'Version {v}',
    language_label: 'Language',
    lang_zh: '中文',
    lang_en: 'English',
  }
}

/**
 * 翻译函数
 * @param {string} key
 * @param {Record<string,string|number>} [params] — 插值参数，如 { n: 5 }
 * @returns {string}
 */
export function useI18n() {
  const t = (key, params = {}) => {
    let msg = messages[state.locale]?.[key] ?? messages.zh?.[key] ?? key
    return Object.keys(params).length
      ? msg.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`))
      : msg
  }

  const setLocale = (locale) => {
    if (locale in messages) {
      state.locale = locale
      localStorage.setItem('sm-locale', locale)
    }
  }

  return {
    t,
    locale: computed(() => state.locale),
    setLocale,
  }
}