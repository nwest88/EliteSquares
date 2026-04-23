/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Trophy, 
  Users, 
  Settings, 
  Grid3X3, 
  Eye, 
  Plus, 
  TrendingUp, 
  Clock, 
  ChevronRight,
  Info,
  Dice5,
  ShieldCheck,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Final';
type League = 'NFL' | 'MLB' | 'NBA' | 'NHL';

interface GameInfo {
  id: string;
  away: string;
  home: string;
  status: string;
}

interface Player {
  id: string;
  name: string;
  initials: string;
  notes: string;
  squares: number;
}

interface Square {
  id: number; // 0-99
  ownerId: string | null;
}

interface QuarterAxes {
  top: number[];
  left: number[];
}

interface GameSettings {
  name: string;
  price: number;
  payouts: Record<Quarter, number>;
}

// --- Mock Data ---

const LEAGUES: Record<League, { name: string; term: string; games: GameInfo[] }> = {
  NFL: {
    name: 'NFL Football',
    term: 'Quarter',
    games: [
      { id: 'nfl-1', away: 'KC', home: 'SF', status: 'Live' },
      { id: 'nfl-2', away: 'PHI', home: 'BAL', status: 'Live' },
    ]
  },
  MLB: {
    name: 'MLB Baseball',
    term: 'Inning',
    games: [
      { id: 'mlb-1', away: 'LAD', home: 'NYY', status: 'Live' },
      { id: 'mlb-2', away: 'CHC', home: 'STL', status: 'Live' },
    ]
  },
  NBA: {
    name: 'NBA Basketball',
    term: 'Quarter',
    games: [
      { id: 'nba-1', away: 'LAL', home: 'BOS', status: 'Live' },
      { id: 'nba-2', away: 'GSW', home: 'DAL', status: 'Live' },
    ]
  },
  NHL: {
    name: 'NHL Hockey',
    term: 'Period',
    games: [
      { id: 'nhl-1', away: 'EDM', home: 'FLA', status: 'Live' },
      { id: 'nhl-2', away: 'VGK', home: 'COL', status: 'Live' },
    ]
  }
};

const generateRandomAxes = (): QuarterAxes => {
  const shuffle = () => [...Array(10).keys()].sort(() => Math.random() - 0.5);
  return { top: shuffle(), left: shuffle() };
};

const INITIAL_AXES: Record<Quarter, QuarterAxes> = {
  Q1: generateRandomAxes(),
  Q2: generateRandomAxes(),
  Q3: generateRandomAxes(),
  Final: generateRandomAxes(),
};

// --- Components ---

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'grid' | 'players' | 'admin'>('grid');
  
  // Game State
  const [league, setLeague] = useState<League>('NFL');
  const [selectedGameId, setSelectedGameId] = useState<string>('nfl-1');
  const [score, setScore] = useState({ away: 0, home: 0 });
  const [gameTime, setGameTime] = useState({ period: 1, clock: '15:00' });
  
  // Pool State
  const [squares, setSquares] = useState<Square[]>(Array.from({ length: 100 }, (_, i) => ({ id: i, ownerId: null })));
  const [players, setPlayers] = useState<Player[]>([]);
  const [axes, setAxes] = useState<Record<Quarter, QuarterAxes>>(INITIAL_AXES);
  const [viewingQuarter, setViewingQuarter] = useState<Quarter>('Q1');
  const [highlightedPlayerId, setHighlightedPlayerId] = useState<string | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    name: 'Super Squares 2026',
    price: 20,
    payouts: { Q1: 250, Q2: 250, Q3: 250, Final: 500 }
  });
  
  // Admin State
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [modalData, setModalData] = useState<{ squareId: number } | null>(null);

  const selectedGame = LEAGUES[league].games.find(g => g.id === selectedGameId) || LEAGUES[league].games[0];
  const leagueInfo = LEAGUES[league];

  // Live Score Feed Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setScore(prev => {
        const team = Math.random() > 0.5 ? 'away' : 'home';
        let increment = 0;
        
        switch (league) {
          case 'NFL': 
            const nflScores = [3, 6, 7];
            increment = nflScores[Math.floor(Math.random() * nflScores.length)];
            break;
          case 'MLB':
            increment = 1;
            break;
          case 'NBA':
            increment = Math.floor(Math.random() * 3) + 1;
            break;
          case 'NHL':
            increment = 1;
            break;
        }
        
        return { ...prev, [team]: prev[team] + (Math.random() > 0.7 ? increment : 0) };
      });

      setGameTime(prev => {
        let nextPeriod = prev.period;
        if (Math.random() > 0.95) nextPeriod = Math.min(prev.period + 1, 4);
        return { ...prev, period: nextPeriod };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [league]);

  // Derived Values
  const currentWinner = useMemo(() => {
    const awayDigit = score.away % 10;
    const homeDigit = score.home % 10;
    
    // Find the current quarter's axes to identify the cell
    const currentQuarterObj = axes[viewingQuarter];
    const colIndex = currentQuarterObj.top.indexOf(awayDigit);
    const rowIndex = currentQuarterObj.left.indexOf(homeDigit);
    
    if (colIndex === -1 || rowIndex === -1) return null;
    
    const squareId = rowIndex * 10 + colIndex;
    const ownerId = squares[squareId]?.ownerId;
    const player = players.find(p => p.id === ownerId);
    
    return { squareId, player, awayDigit, homeDigit };
  }, [score, axes, viewingQuarter, squares, players]);

  const squaresTaken = squares.filter(s => s.ownerId !== null).length;

  // Actions
  const handleAssignSquares = (name: string, count: number) => {
    const available = squares.filter(s => s.ownerId === null).map(s => s.id);
    if (available.length < count) return alert('Not enough squares available!');

    const shuffled = available.sort(() => Math.random() - 0.5);
    const assignedIds = shuffled.slice(0, count);
    
    const playerId = name.toLowerCase().replace(/\s/g, '-');
    const existingPlayer = players.find(p => p.id === playerId);

    if (existingPlayer) {
      setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, squares: p.squares + count } : p));
    } else {
      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      setPlayers(prev => [...prev, { id: playerId, name, initials, notes: '', squares: count }]);
    }

    setSquares(prev => prev.map(s => assignedIds.includes(s.id) ? { ...s, ownerId: playerId } : s));
  };

  const handleRandomize = () => {
    setAxes({
      Q1: generateRandomAxes(),
      Q2: generateRandomAxes(),
      Q3: generateRandomAxes(),
      Final: generateRandomAxes(),
    });
  };

  const getWinningSquareForQuarter = (q: Quarter) => {
    // Simplified: just for logic demonstration
    const awayLast = score.away % 10;
    const homeLast = score.home % 10;
    const col = axes[q].top.indexOf(awayLast);
    const row = axes[q].left.indexOf(homeLast);
    return row * 10 + col;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] font-sans">
      {/* Header / Scoreboard */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#D4AF37]/20 pb-4 pt-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
                <Trophy className="w-6 h-6 text-[#0A0A0A]" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-[#D4AF37] leading-none uppercase">{gameSettings.name}</h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium mt-1">{leagueInfo.name}</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 bg-[#1A1A1A] px-3 py-1 rounded-full border border-gray-800">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-tight text-gray-400">Live</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 items-center bg-[#111111] rounded-2xl p-4 border border-[#D4AF37]/10 relative overflow-hidden">
             {/* Score Visuals */}
            <div className="text-center">
              <span className="text-[10px] text-gray-500 uppercase block mb-1">Away</span>
              <p className="text-xl font-black text-white">{selectedGame.away}</p>
              <p className="text-4xl font-black text-[#D4AF37] mt-1">{score.away}</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="text-xs font-mono text-gray-400 mb-2">
                {gameTime.period === 4 ? 'FINAL' : `${leagueInfo.term} ${gameTime.period}`}
              </div>
              <div className="h-0.5 w-12 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent mb-2" />
              <div className="flex gap-1 text-[10px] font-bold text-gray-500">
                <span className={gameTime.period === 1 ? 'text-[#D4AF37]' : ''}>Q1</span>
                <span>•</span>
                <span className={gameTime.period === 2 ? 'text-[#D4AF37]' : ''}>Q2</span>
                <span>•</span>
                <span className={gameTime.period === 3 ? 'text-[#D4AF37]' : ''}>Q3</span>
                <span>•</span>
                <span className={gameTime.period === 4 ? 'text-[#D4AF37]' : ''}>F</span>
              </div>
            </div>

            <div className="text-center">
              <span className="text-[10px] text-gray-500 uppercase block mb-1">Home</span>
              <p className="text-xl font-black text-white">{selectedGame.home}</p>
              <p className="text-4xl font-black text-[#D4AF37] mt-1">{score.home}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'grid' && (
            <motion.div 
              key="grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Quarter Selection */}
              <div className="flex justify-center p-1 bg-[#1A1A1A] rounded-xl border border-gray-800">
                {(['Q1', 'Q2', 'Q3', 'Final'] as Quarter[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => setViewingQuarter(q)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      viewingQuarter === q 
                        ? 'bg-[#D4AF37] text-[#0A0A0A] shadow-lg' 
                        : 'text-gray-500 hover:text-white'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* The Grid */}
              <div className="relative group">
                <div className="flex">
                  {/* Left Axis */}
                  <div className="w-8 flex flex-col pt-8">
                    {axes[viewingQuarter].left.map((num, i) => (
                      <div key={i} className="h-8 sm:h-10 flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold text-[#D4AF37]/60 border-r border-[#D4AF37]/10">
                        {num}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex-1">
                    {/* Top Axis */}
                    <div className="flex">
                      {axes[viewingQuarter].top.map((num, i) => (
                        <div key={i} className="flex-1 h-8 flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold text-[#D4AF37]/60 border-b border-[#D4AF37]/10">
                          {num}
                        </div>
                      ))}
                    </div>

                    {/* Grid Cells */}
                    <div className="grid grid-cols-10 border-r border-b border-gray-800">
                      {squares.map((square) => {
                        const player = players.find(p => p.id === square.ownerId);
                        const isCurrentWinner = currentWinner?.squareId === square.id;
                        const isHighlighted = highlightedPlayerId && square.ownerId === highlightedPlayerId;

                        return (
                          <button
                            key={square.id}
                            onClick={() => setModalData({ squareId: square.id })}
                            className={`aspect-square h-8 sm:h-10 flex items-center justify-center border-l border-t border-gray-800 text-[10px] transition-all relative
                              ${square.ownerId ? 'bg-[#151515]' : 'bg-transparent'}
                              ${isCurrentWinner ? 'ring-2 ring-inset ring-[#D4AF37] z-10 bg-[#D4AF37]/20' : ''}
                              ${isHighlighted ? 'bg-[#D4AF37] text-[#0A0A0A] font-bold z-20' : ''}
                              hover:bg-[#252525]
                            `}
                          >
                            {player?.initials || ''}
                            {isCurrentWinner && (
                              <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#D4AF37] rounded-full animate-ping" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Grid Labels */}
                <div className="absolute -left-12 top-1/2 -rotate-90 text-[10px] font-bold text-gray-500 uppercase tracking-widest pointer-events-none">
                  Home Team
                </div>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-500 uppercase tracking-widest pointer-events-none">
                  Away Team
                </div>
              </div>

              {/* Legend & Current Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-gray-800 space-y-2">
                  <div className="flex items-center gap-2 text-gray-400">
                    <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Active Winner</span>
                  </div>
                  {currentWinner?.player ? (
                    <div>
                      <p className="text-lg font-bold text-[#D4AF37]">{currentWinner.player.name}</p>
                      <p className="text-[10px] text-gray-500 uppercase">Square #{currentWinner.squareId}</p>
                    </div>
                  ) : (
                    <p className="text-sm italic text-gray-600">Unassigned Square</p>
                  )}
                </div>
                <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-gray-800 space-y-2">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-[10px] font-bold uppercase tracking-tight">Pot Info</span>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#D4AF37]">${gameSettings.payouts[viewingQuarter]}</p>
                    <p className="text-[10px] text-gray-500 uppercase">{viewingQuarter} Payout</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'players' && (
            <motion.div 
              key="players"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              <div className="bg-gradient-to-br from-[#1A1A1A] to-[#111111] p-6 rounded-2xl border border-[#D4AF37]/10 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-white">{squaresTaken}/100</h3>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Total Squares Sold</p>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-gray-800 border-l-[#D4AF37] relative flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#D4AF37]">{squaresTaken}%</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] px-1">Participant Roster</h4>
                {players.length === 0 ? (
                  <div className="p-8 text-center bg-[#1A1A1A] rounded-2xl border border-dashed border-gray-800 text-gray-600 italic">
                    No players found. Add them in the Admin tab.
                  </div>
                ) : (
                  players.sort((a,b) => b.squares - a.squares).map((player) => (
                    <div key={player.id} className="group bg-[#151515] p-4 rounded-xl border border-gray-800 flex items-center justify-between hover:border-[#D4AF37]/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] font-bold border border-[#D4AF37]/20">
                          {player.initials}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-[#D4AF37] transition-colors">{player.name}</p>
                          <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{player.squares} Squares • Total Value: ${player.squares * gameSettings.price}</p>
                        </div>
                      </div>
                      <button 
                        onMouseEnter={() => setHighlightedPlayerId(player.id)}
                        onMouseLeave={() => setHighlightedPlayerId(null)}
                        onClick={() => {
                          setHighlightedPlayerId(highlightedPlayerId === player.id ? null : player.id);
                          setActiveTab('grid');
                        }}
                        className={`p-2 rounded-lg transition-all ${highlightedPlayerId === player.id ? 'bg-[#D4AF37] text-[#0A0A0A]' : 'bg-[#1A1A1A] text-gray-500 hover:text-[#D4AF37]'}`}
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-8"
            >
              {/* Admin View Toggle */}
              <div className="flex items-center justify-between bg-[#111111] p-4 rounded-2xl border border-gray-800">
                <div className="flex items-center gap-2">
                  {isAdminMode ? <ShieldCheck className="w-5 h-5 text-green-500" /> : <ShieldAlert className="w-5 h-5 text-yellow-500" />}
                  <span className="text-sm font-bold">{isAdminMode ? 'Administrator Mode' : 'Guest Mode (View Only)'}</span>
                </div>
                <button 
                  onClick={() => setIsAdminMode(!isAdminMode)}
                  className={`w-12 h-6 rounded-full relative transition-colors ${isAdminMode ? 'bg-[#D4AF37]' : 'bg-gray-800'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isAdminMode ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {!isAdminMode ? (
                <div className="text-center py-12 px-6 bg-[#1A1A1A] rounded-2xl border border-dashed border-gray-800">
                  <Settings className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">Toggle 'Administrator Mode' above to access game controls, score simulation, and square assignments.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Game Configuration */}
                  <div className="bg-[#151515] p-6 rounded-2xl border border-gray-800 space-y-4">
                    <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Global Settings</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Game Display Name</label>
                        <input 
                          type="text" 
                          value={gameSettings.name}
                          onChange={(e) => setGameSettings({...gameSettings, name: e.target.value})}
                          className="w-full bg-[#0A0A0A] border border-gray-800 rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div>
                          <label className="text-xs text-gray-400 block mb-1">League</label>
                          <select 
                            value={league}
                            onChange={(e) => {
                              const newLeague = e.target.value as League;
                              setLeague(newLeague);
                              setSelectedGameId(LEAGUES[newLeague].games[0].id);
                              setScore({ away: 0, home: 0 });
                              setGameTime({ period: 1, clock: '15:00' });
                            }}
                            className="w-full bg-[#0A0A0A] border border-gray-800 rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
                          >
                            {Object.entries(LEAGUES).map(([key, val]) => (
                              <option key={key} value={key}>{val.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 block mb-1">Live Game Selection</label>
                          <select 
                             value={selectedGameId}
                             onChange={(e) => {
                               setSelectedGameId(e.target.value);
                               setScore({ away: 0, home: 0 });
                               setGameTime({ period: 1, clock: '15:00' });
                             }}
                             className="w-full bg-[#0A0A0A] border border-gray-800 rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none text-[#D4AF37] font-bold"
                          >
                            {LEAGUES[league].games.map(g => (
                              <option key={g.id} value={g.id}>{g.away} @ {g.home}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payouts */}
                  <div className="bg-[#151515] p-6 rounded-2xl border border-gray-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Payout Structure</h4>
                      <button onClick={handleRandomize} className="flex items-center gap-1 text-[10px] font-bold text-[#D4AF37] hover:underline">
                        <Dice5 className="w-3 h-3" /> Randomize Board Numbers
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(['Q1', 'Q2', 'Q3', 'Final'] as Quarter[]).map(q => (
                        <div key={q}>
                          <label className="text-[10px] text-gray-500 block mb-1 uppercase font-bold">{q}</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">$</span>
                            <input 
                              type="number" 
                              value={gameSettings.payouts[q]}
                              onChange={(e) => setGameSettings({
                                ...gameSettings, 
                                payouts: { ...gameSettings.payouts, [q]: parseInt(e.target.value) || 0 }
                              })}
                              className="w-full bg-[#0A0A0A] border border-gray-800 rounded-lg pl-6 pr-3 py-2 text-sm focus:border-[#D4AF37] outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Assignment Form */}
                  <SquareAssignmentForm onAssign={handleAssignSquares} />
                  
                  <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                    <Info className="w-5 h-5 text-yellow-500 shrink-0" />
                    <p className="text-[11px] text-yellow-200/70">Warning: Changes made in Administrator mode will immediately affect the public grid view for all participants.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistent Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-lg border-t border-gray-800 pb-safe">
        <div className="max-w-md mx-auto flex justify-around p-3">
          <NavButton 
            active={activeTab === 'grid'} 
            onClick={() => setActiveTab('grid')} 
            icon={<Grid3X3 className="w-5 h-5" />} 
            label="Grid" 
          />
          <NavButton 
            active={activeTab === 'players'} 
            onClick={() => setActiveTab('players')} 
            icon={<Users className="w-5 h-5" />} 
            label="Players" 
          />
          <NavButton 
            active={activeTab === 'admin'} 
            onClick={() => setActiveTab('admin')} 
            icon={<Settings className="w-5 h-5" />} 
            label="Admin" 
          />
        </div>
      </nav>

      {/* Modal / Overlay */}
      <AnimatePresence>
        {modalData && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalData(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#151515] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-white">Square Details</h3>
                  <div className="px-3 py-1 bg-[#D4AF37]/10 rounded-full text-[#D4AF37] text-[10px] font-bold uppercase">
                    ID #{modalData.squareId}
                  </div>
                </div>

                <div className="space-y-4">
                  {squares[modalData.squareId].ownerId ? (
                    (() => {
                      const player = players.find(p => p.id === squares[modalData.squareId].ownerId);
                      return (
                        <div className="space-y-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-[#D4AF37] flex items-center justify-center text-3xl font-black text-[#0A0A0A]">
                              {player?.initials}
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-white">{player?.name}</p>
                              <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">{player?.squares} Total Squares</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#0A0A0A] p-3 rounded-xl border border-gray-800">
                              <span className="text-[10px] text-gray-500 uppercase block mb-1">Purchased For</span>
                              <p className="font-bold text-[#D4AF37]">${gameSettings.price}</p>
                            </div>
                            <div className="bg-[#0A0A0A] p-3 rounded-xl border border-gray-800">
                              <span className="text-[10px] text-gray-500 uppercase block mb-1">Status</span>
                              <p className="font-bold text-green-500 uppercase text-[10px]">Active</p>
                            </div>
                          </div>

                          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl">
                            <p className="text-[11px] text-blue-200/80 leading-relaxed italic">
                                "This square represents the last digit of the {selectedGame.away} and {selectedGame.home} scores."
                            </p>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-700">
                        <Plus className="w-8 h-8 text-gray-600" />
                      </div>
                      <p className="text-gray-400 font-bold">Unclaimed Square</p>
                      <p className="text-xs text-gray-600 mt-1 uppercase tracking-widest">Available for ${gameSettings.price}</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setModalData(null)}
                  className="w-full py-4 bg-[#1A1A1A] hover:bg-[#252525] border border-gray-800 rounded-2xl text-sm font-bold transition-all"
                >
                  Close View
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Helper Components ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${active ? 'text-[#D4AF37]' : 'text-gray-500 hover:text-gray-300'}`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'scale-100'}`}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      {active && (
        <motion.div 
          layoutId="nav-pill"
          className="w-1 h-1 rounded-full bg-[#D4AF37] absolute -bottom-1"
        />
      )}
    </button>
  );
}

function SquareAssignmentForm({ onAssign }: { onAssign: (name: string, count: number) => void }) {
  const [name, setName] = useState('');
  const [count, setCount] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || count <= 0) return;
    onAssign(name, count);
    setName('');
    setCount(1);
  };

  return (
    <div className="bg-[#151515] p-6 rounded-2xl border border-gray-800 space-y-4">
      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Assign Squares</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Player Full Name</label>
          <input 
            type="text" 
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-gray-800 rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-xs text-gray-400 block mb-1">Squares for Purchase</label>
            <input 
              type="number" 
              min="1" 
              max="100"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 0)}
              className="w-full bg-[#0A0A0A] border border-gray-800 rounded-lg p-3 text-sm focus:border-[#D4AF37] outline-none"
            />
          </div>
          <div className="flex items-end">
            <button 
              type="submit"
              className="bg-[#D4AF37] text-[#0A0A0A] font-bold py-3 px-6 rounded-lg text-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              Confirm <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
