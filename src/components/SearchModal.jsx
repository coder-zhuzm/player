import React, { useState, useEffect } from 'react';
import { Search, Key, X, Music, Disc, User, Loader2, Check, FileText, Play } from 'lucide-react';
import { getApiKey, setApiKey, searchSongs, getSongDetail } from '../lib/yaohuApi';

export default function SearchModal({ isOpen, onClose, onSelectSong, onImportLyricsOnly, currentSong }) {
  const [apiKey, setKeyInput] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState('wy');
  const [loading, setLoading] = useState(false);
  const [loadingSongIndex, setLoadingSongIndex] = useState(null);

  const [songs, setSongs] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setKeyInput(getApiKey());
  }, [isOpen]);

  const handleSaveKey = () => {
    setApiKey(apiKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!keyword.trim()) return;

    setErrorMsg('');
    setLoading(true);
    setSongs([]);

    const res = await searchSongs(keyword.trim(), source, 20);
    setLoading(false);

    if (!res.ok) {
      setErrorMsg(res.error || '搜索失败，请检查 API Key 或网络');
    } else {
      setSongs(res.songs || []);
    }
  };

  // 播放整曲 (音频 + 歌词)
  const handleSelect = async (song, index) => {
    setLoadingSongIndex(index);
    const detailRes = await getSongDetail(song, source);
    setLoadingSongIndex(null);

    if (!detailRes.ok) {
      alert(`无法播放单曲: ${detailRes.error}`);
      return;
    }

    onSelectSong(detailRes.song);
    onClose();
  };

  // 仅载入歌词 (保留本地音频，只匹配歌词)
  const handleLyricsOnly = async (song, index) => {
    setLoadingSongIndex(index);
    const detailRes = await getSongDetail(song, source);
    setLoadingSongIndex(null);

    if (!detailRes.ok) {
      alert(`无法获取歌词: ${detailRes.error}`);
      return;
    }

    onImportLyricsOnly(detailRes.song.lyrics);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center space-x-2 text-dream-purple">
            <Music className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white tracking-wide">妖狐 API 在线音乐与歌词搜索</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          
          {/* Currently loaded audio indicator */}
          {currentSong && (
            <div className="flex items-center justify-between bg-dream-purple/10 border border-dream-purple/30 rounded-xl px-4 py-2.5 text-xs text-dream-purple">
              <span className="truncate">
                当前播放音频: <strong className="text-white">{currentSong.name}</strong>
              </span>
              <span className="text-[11px] opacity-70">支持搜索 API 自动匹配歌词同步</span>
            </div>
          )}

          {/* API Key Setting Section */}
          <div className="bg-zinc-800/60 border border-white/5 rounded-xl p-3.5 space-y-2">
            <label className="flex items-center space-x-2 text-xs font-semibold text-white/70">
              <Key className="w-3.5 h-3.5 text-dream-cyan" />
              <span>妖狐 API Key 配置 (用于匹配全网在线歌词)</span>
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                placeholder="请输入您的 妖狐 API Key..."
                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-dream-cyan transition"
              />
              <button
                onClick={handleSaveKey}
                className="px-4 py-1.5 bg-dream-purple/20 hover:bg-dream-purple/30 border border-dream-purple/50 text-dream-purple rounded-lg text-xs font-medium transition flex items-center space-x-1"
              >
                {keySaved ? <Check className="w-3.5 h-3.5 text-green-400" /> : null}
                <span>{keySaved ? '已保存' : '保存 Key'}</span>
              </button>
            </div>
          </div>

          {/* Search Form & Source Tabs */}
          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="输入歌名搜索匹配歌词..."
                  className="w-full bg-black/60 border border-white/15 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-dream-purple transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-gradient-to-r from-dream-purple to-dream-pink text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>搜索</span>}
              </button>
            </div>

            {/* Source Switch Tabs */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-white/40">歌词来源:</span>
              {[
                { id: 'wy', name: '网易云音乐' },
                { id: 'qq', name: 'QQ音乐' },
                { id: 'kuwo', name: '酷我音乐' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSource(tab.id)}
                  className={`px-3 py-1 rounded-lg transition border ${
                    source === tab.id
                      ? 'bg-dream-purple/20 border-dream-purple text-dream-purple font-semibold'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </form>

          {/* Error notice */}
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Search Results List */}
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
            {songs.map((song, idx) => (
              <div
                key={`${song.rid}-${idx}`}
                className="group flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition"
              >
                <div className="flex items-center space-x-3 overflow-hidden flex-1 mr-3">
                  <div className="w-8 h-8 rounded-lg bg-dream-purple/10 flex items-center justify-center text-dream-purple flex-shrink-0">
                    {loadingSongIndex === idx ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Music className="w-4 h-4" />
                    )}
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-white truncate group-hover:text-dream-purple transition">
                      {song.name}
                    </p>
                    <p className="text-xs text-white/50 flex items-center space-x-2 truncate">
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{song.singer}</span>
                      </span>
                      {song.album && (
                        <span className="flex items-center space-x-1">
                          <Disc className="w-3 h-3" />
                          <span className="truncate">{song.album}</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {/* 仅匹配歌词 */}
                  <button
                    onClick={() => handleLyricsOnly(song, idx)}
                    className="text-xs px-2.5 py-1.5 bg-dream-purple/20 border border-dream-purple/40 text-dream-purple hover:bg-dream-purple hover:text-black rounded-lg transition font-medium flex items-center space-x-1"
                    title="保留当前播放的本地音频，仅匹配并同步此歌词"
                  >
                    <FileText className="w-3 h-3" />
                    <span>仅匹配歌词</span>
                  </button>

                  {/* 在线播放整曲 */}
                  <button
                    onClick={() => handleSelect(song, idx)}
                    className="text-xs px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-medium flex items-center space-x-1"
                    title="载入在线音频与歌词"
                  >
                    <Play className="w-3 h-3" />
                    <span>在线播放</span>
                  </button>
                </div>
              </div>
            ))}

            {!loading && songs.length === 0 && !errorMsg && (
              <div className="text-center py-10 text-white/30 text-xs">
                输入歌名搜索，可选择【仅匹配歌词】应用到本地播放的音频上
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
