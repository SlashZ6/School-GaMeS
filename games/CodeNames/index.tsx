
import React, { useEffect, useState, useRef } from 'react';
import { usePeer } from '../../hooks/usePeer';
import { useLanguage } from '../../contexts/LanguageContext';
import { useUser } from '../../contexts/UserContext';
import { Button, Card, Input, Badge } from '../../components/ui/GenericUI';
import { CodeNamesGameState, Player, CodeNamesCard, Team, CardType, Language } from '../../types';
import { CODENAMES_WORDS, CODENAMES_WORDS_AR } from '../../constants';
import { Copy, Users, Play, Loader2, Home, VenetianMask, UserPlus, Shuffle, Skull, ArrowRight, Eye, ShieldAlert, RotateCcw, Send, History, Infinity as InfinityIcon, Clock, Fingerprint, Settings } from 'lucide-react';
import { FriendSystemModal } from '../../components/ui/FriendSystem';
import confetti from 'canvas-confetti';

const CodeNamesGame = ({ onExit, autoJoinCode }: { onExit: () => void, autoJoinCode?: string }) => {
  const { t, lang } = useLanguage();
  const { user } = useUser();
  const [playerName, setPlayerName] = useState(user?.name || '');
  const [hasJoined, setHasJoined] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinGameCode, setJoinGameCode] = useState(autoJoinCode || '');
  const [showInviteModal, setShowInviteModal] = useState(false);
  
  // Gameplay Input State
  const [clueWord, setClueWord] = useState('');
  const [clueNum, setClueNum] = useState<string>('1');
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef<any>(null);

  const { 
    displayCode,
    peerId, 
    isHost, 
    createGame,
    joinGame,
    broadcast, 
    sendToHost,
    setMessageHandler, 
    connectionStatus,
    errorMsg
  } = usePeer();

  // State
  const [gameState, setGameState] = useState<CodeNamesGameState>({
    status: 'LOBBY',
    players: [],
    teams: { RED: [], BLUE: [] },
    spymasters: { RED: null, BLUE: null },
    cards: [],
    suggestedCards: {},
    currentTurn: 'RED',
    turnPhase: 'CLUE',
    currentClue: null,
    guessesLeft: 0,
    score: { RED: 9, BLUE: 8 },
    winner: null,
    gameLog: [],
    config: { turnDuration: 0 },
    lastInteraction: 0
  });

  // Auto-Join
  useEffect(() => {
    if (autoJoinCode && !hasJoined && connectionStatus === 'IDLE' && playerName) {
        joinGame(playerName, autoJoinCode);
    }
  }, [autoJoinCode, hasJoined, connectionStatus, playerName]);

  // Network Handlers
  useEffect(() => {
      setMessageHandler((data, conn) => {
          if (isHost) {
              if (data.type === 'JOIN') {
                  const newPlayer: Player = { id: data.payload.id, name: data.payload.name, isHost: false, score: 0 };
                  setGameState(prev => {
                      if (prev.players.find(p => p.id === newPlayer.id)) {
                          if(conn) conn.send({ type: 'UPDATE_STATE', payload: prev });
                          return prev;
                      }
                      const newState = { ...prev, players: [...prev.players, newPlayer] };
                      broadcast({ type: 'UPDATE_STATE', payload: newState });
                      return newState;
                  });
              }
              else if (data.type === 'ACTION') {
                  handlePlayerAction(data.payload);
              }
          } else {
              if (data.type === 'UPDATE_STATE') {
                  setGameState(data.payload);
              }
          }
      });
  }, [isHost, broadcast, gameState]);

  // Handle Host Setup
  useEffect(() => {
    if (connectionStatus === 'CONNECTED' && !hasJoined) {
      setHasJoined(true);
      if (isHost) {
         setGameState(prev => ({
             ...prev,
             players: [...prev.players, { id: peerId, name: playerName, isHost: true, score: 0 }]
         }));
      }
    }
  }, [connectionStatus, hasJoined, isHost, peerId, playerName]);

  // Timer Logic
  useEffect(() => {
    if (gameState.status === 'PLAYING' && gameState.config.turnDuration > 0) {
        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - gameState.lastInteraction) / 1000;
            const remaining = Math.max(0, gameState.config.turnDuration - elapsed);
            setTimeLeft(remaining);

            if (remaining <= 0 && isHost) {
                // Time up! End turn.
                handlePlayerAction({ type: 'END_TURN', playerId: 'TIMER' });
            }
        }, 250);
        timerRef.current = interval;
        return () => clearInterval(interval);
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [gameState.status, gameState.lastInteraction, gameState.config.turnDuration, isHost]);


  // --- GAME LOGIC (HOST) ---

  const generateBoard = (selectedLang: Language) => {
      // Choose words based on Host's current language
      const sourceWords = selectedLang === Language.AR ? CODENAMES_WORDS_AR : CODENAMES_WORDS;
      
      const shuffledWords = [...sourceWords].sort(() => Math.random() - 0.5).slice(0, 25);
      
      const types: CardType[] = [
          ...Array(9).fill('RED'),
          ...Array(8).fill('BLUE'),
          ...Array(7).fill('NEUTRAL'),
          'ASSASSIN'
      ];
      
      const shuffledTypes = types.sort(() => Math.random() - 0.5);

      const cards: CodeNamesCard[] = shuffledWords.map((word, idx) => ({
          id: `card-${idx}`,
          word,
          type: shuffledTypes[idx] as CardType,
          isRevealed: false
      }));

      return cards;
  };

  const startGame = () => {
      if(!isHost) return;
      if (!gameState.spymasters.RED || !gameState.spymasters.BLUE) return;

      const cards = generateBoard(lang); // Use Host's language
      
      const newState: CodeNamesGameState = {
          ...gameState,
          status: 'PLAYING',
          cards,
          suggestedCards: {},
          currentTurn: 'RED',
          turnPhase: 'CLUE',
          currentClue: null,
          guessesLeft: 0,
          score: { RED: 9, BLUE: 8 },
          winner: null,
          gameLog: ['Game Started! Red Team goes first.'],
          lastInteraction: Date.now()
      };
      setGameState(newState);
      broadcast({ type: 'UPDATE_STATE', payload: newState });
  };

  const handlePlayerAction = (action: any) => {
      if(!isHost) {
          sendToHost({ type: 'ACTION', payload: action });
          return;
      }

      setGameState(prev => {
          let next = { ...prev };
          
          if (action.type === 'UPDATE_CONFIG') {
              next.config = action.config;
          }

          if (action.type === 'JOIN_TEAM') {
              const { playerId, team } = action;
              next.teams.RED = next.teams.RED.filter(id => id !== playerId);
              next.teams.BLUE = next.teams.BLUE.filter(id => id !== playerId);
              
              if (team === 'RED') next.teams.RED.push(playerId);
              if (team === 'BLUE') next.teams.BLUE.push(playerId);
              
              if (next.spymasters.RED === playerId) next.spymasters.RED = null;
              if (next.spymasters.BLUE === playerId) next.spymasters.BLUE = null;
          }

          if (action.type === 'BECOME_SPY') {
              const { playerId, team } = action;
              if (team === 'RED') next.spymasters.RED = playerId;
              if (team === 'BLUE') next.spymasters.BLUE = playerId;
          }

          if (action.type === 'RANDOMIZE_TEAMS') {
              const allIds = next.players.map(p => p.id);
              const shuffled = allIds.sort(() => Math.random() - 0.5);
              const mid = Math.ceil(shuffled.length / 2);
              next.teams.RED = shuffled.slice(0, mid);
              next.teams.BLUE = shuffled.slice(mid);
              next.spymasters = { RED: null, BLUE: null };
          }

          if (action.type === 'GIVE_CLUE') {
              const { word, number, team } = action;
              if (prev.currentTurn !== team || prev.turnPhase !== 'CLUE') return prev;
              
              next.currentClue = { word, number };
              next.turnPhase = 'GUESS';
              // Logic for guess count:
              // 0 = Infinite, ∞ = Infinite
              // N = N + 1
              if (number === 0 || number === '∞') {
                   next.guessesLeft = '∞';
              } else {
                   next.guessesLeft = (number as number) + 1;
              }
              
              next.gameLog = [`${team} Spy: "${word}" (${number})`, ...prev.gameLog];
              next.lastInteraction = Date.now(); // Reset timer
          }

          if (action.type === 'TOGGLE_SUGGEST') {
              const { cardId, playerId } = action;
              const currentList = prev.suggestedCards[cardId] || [];
              let newList;
              if (currentList.includes(playerId)) {
                  newList = currentList.filter(id => id !== playerId);
              } else {
                  newList = [...currentList, playerId];
              }
              next.suggestedCards = { ...prev.suggestedCards, [cardId]: newList };
          }

          if (action.type === 'CLICK_CARD') { // THIS IS THE DOUBLE-CLICK / CONFIRM
              const { cardId, playerId } = action;
              const cardIdx = next.cards.findIndex(c => c.id === cardId);
              const card = next.cards[cardIdx];
              
              if (prev.turnPhase !== 'GUESS' || card.isRevealed) return prev;

              // Reveal
              card.isRevealed = true;
              // Clear suggestions for this card
              delete next.suggestedCards[cardId];
              
              if (next.guessesLeft !== '∞') {
                 next.guessesLeft = (next.guessesLeft as number) - 1;
              }

              const playerName = prev.players.find(p=>p.id===playerId)?.name || 'Someone';

              // Logic
              if (card.type === 'ASSASSIN') {
                  next.winner = prev.currentTurn === 'RED' ? 'BLUE' : 'RED';
                  next.status = 'GAME_OVER';
                  next.gameLog = [`${playerName} hit the ASSASSIN! Game Over.`, ...next.gameLog];
              } else if (card.type === 'NEUTRAL') {
                  next.currentTurn = prev.currentTurn === 'RED' ? 'BLUE' : 'RED';
                  next.turnPhase = 'CLUE';
                  next.currentClue = null;
                  next.gameLog = [`${playerName} picked a Neutral card. Turn Ends.`, ...next.gameLog];
                  next.suggestedCards = {}; // Clear suggestions on turn change
                  next.lastInteraction = Date.now();
              } else if (card.type !== prev.currentTurn) {
                  // Opponent Card
                  next.score[card.type]--; 
                  next.gameLog = [`${playerName} picked the ENEMY! Turn Ends.`, ...next.gameLog];
                  
                  if (next.score[card.type] === 0) {
                      next.winner = card.type as Team; 
                      next.status = 'GAME_OVER';
                  } else {
                      next.currentTurn = prev.currentTurn === 'RED' ? 'BLUE' : 'RED';
                      next.turnPhase = 'CLUE';
                      next.currentClue = null;
                      next.suggestedCards = {}; // Clear suggestions on turn change
                      next.lastInteraction = Date.now();
                  }
              } else {
                  // Correct Card
                  next.score[prev.currentTurn]--;
                  next.gameLog = [`${playerName} found an agent!`, ...next.gameLog];
                  next.lastInteraction = Date.now(); // Reset timer on successful guess
                  
                  if (next.score[prev.currentTurn] === 0) {
                      next.winner = prev.currentTurn;
                      next.status = 'GAME_OVER';
                      confetti();
                  } else if (next.guessesLeft === 0) {
                      next.currentTurn = prev.currentTurn === 'RED' ? 'BLUE' : 'RED';
                      next.turnPhase = 'CLUE';
                      next.currentClue = null;
                      next.suggestedCards = {};
                      next.lastInteraction = Date.now();
                  }
              }
          }

          if (action.type === 'END_TURN') {
              const playerName = prev.players.find(p=>p.id===action.playerId)?.name || 'Time';
              next.currentTurn = prev.currentTurn === 'RED' ? 'BLUE' : 'RED';
              next.turnPhase = 'CLUE';
              next.currentClue = null;
              next.suggestedCards = {};
              next.gameLog = [`${playerName} ended the turn.`, ...next.gameLog];
              next.lastInteraction = Date.now();
          }

          broadcast({ type: 'UPDATE_STATE', payload: next });
          return next;
      });
  };

  // --- ACTIONS ---

  const joinTeam = (team: 'RED' | 'BLUE') => handlePlayerAction({ type: 'JOIN_TEAM', playerId: peerId, team });
  const becomeSpy = (team: 'RED' | 'BLUE') => handlePlayerAction({ type: 'BECOME_SPY', playerId: peerId, team });
  const randomizeTeams = () => handlePlayerAction({ type: 'RANDOMIZE_TEAMS' });
  
  const submitClue = () => {
      if(!clueWord.trim()) return;
      let num: number | string = clueNum;
      if (num === '∞') num = '∞';
      else num = parseInt(num as string);

      handlePlayerAction({ type: 'GIVE_CLUE', word: clueWord.toUpperCase(), number: num, team: gameState.currentTurn });
      setClueWord('');
      setClueNum('1');
  };

  const toggleSuggest = (cardId: string) => handlePlayerAction({ type: 'TOGGLE_SUGGEST', cardId, playerId: peerId });
  const revealCard = (cardId: string) => handlePlayerAction({ type: 'CLICK_CARD', cardId, playerId: peerId });
  
  const endTurn = () => handlePlayerAction({ type: 'END_TURN', playerId: peerId });


  // --- RENDERING ---

  if (!hasJoined) {
     return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 w-full max-w-xl mx-auto">
             <div className="absolute top-6 left-6">
                <Button variant="glass" size="sm" onClick={onExit}>
                    <Home className="mr-2" size={18}/> Exit
                </Button>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-slate-200 to-slate-500 mb-8 drop-shadow-2xl text-center flex flex-col items-center gap-4">
                <VenetianMask size={80} className="text-white drop-shadow-lg"/>
                {t('game.codenames')}
            </h1>
            <Card className="w-full flex flex-col gap-6 bg-black/40 border-slate-700/50 backdrop-blur-xl">
                <Input placeholder={t('enterName')} value={playerName} onChange={e => setPlayerName(e.target.value)} maxLength={15} className="bg-slate-900/50 border-slate-700"/>
                {!showJoinInput && !autoJoinCode ? (
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="primary" onClick={() => createGame(playerName)} className="bg-slate-700 border-slate-900 hover:bg-slate-600 shadow-xl">{t('create')}</Button>
                        <Button variant="glass" onClick={() => setShowJoinInput(true)} className="hover:bg-white/10">{t('join')}</Button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <Input placeholder="CODE" value={joinGameCode} onChange={e => setJoinGameCode(e.target.value.toUpperCase())} maxLength={4} className="tracking-[0.5em] text-3xl font-mono uppercase bg-slate-900/50 border-slate-700"/>
                        <div className="flex gap-2">
                             <Button className="flex-1 bg-slate-700 border-slate-900" onClick={() => joinGame(playerName, joinGameCode)}>{connectionStatus === 'CONNECTING' ? <Loader2 className="animate-spin"/> : t('connect')}</Button>
                             <Button variant="glass" onClick={onExit}><ArrowRight className="rotate-180"/></Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
     );
  }

  // 2. LOBBY
  if (gameState.status === 'LOBBY') {
      return (
          <div className="min-h-screen p-4 md:p-8 flex flex-col items-center max-w-7xl mx-auto w-full">
              <div className="w-full flex justify-between mb-8">
                  <Button variant="glass" size="sm" onClick={onExit}>
                      <ArrowRight className="rotate-180 mr-2" size={18}/> Exit
                  </Button>
                  <div className="bg-black/40 px-6 py-2 rounded-full font-mono font-bold text-xl border border-white/10 flex items-center gap-3 backdrop-blur-md">
                      CODE: <span className="text-yellow-400 select-all cursor-pointer" onClick={()=>{navigator.clipboard.writeText(displayCode||joinGameCode)}}>{displayCode || joinGameCode}</span> <Copy size={16}/>
                  </div>
                  {isHost && (
                      <Button variant="secondary" size="sm" onClick={() => setShowInviteModal(true)}>
                         <UserPlus size={18}/>
                      </Button>
                  )}
              </div>

              {isHost && (
                  <Card className="w-full mb-8 bg-white/5 border-white/10">
                      <div className="flex items-center gap-3 mb-4 pb-2 border-b border-white/10">
                           <Settings size={20}/> <span className="font-bold">Settings</span>
                      </div>
                      <div className="flex flex-col md:flex-row gap-6">
                          <div className="flex items-center gap-4 flex-1">
                              <label className="text-sm font-bold text-white/60 whitespace-nowrap">Turn Timer</label>
                              <div className="flex gap-2 flex-1 items-center">
                                  <input 
                                      type="range" min="0" max="300" step="30" 
                                      value={gameState.config.turnDuration}
                                      onChange={(e) => handlePlayerAction({ type: 'UPDATE_CONFIG', config: { ...gameState.config, turnDuration: parseInt(e.target.value) } })}
                                      className="w-full h-3 bg-white/10 rounded-lg appearance-none cursor-pointer accent-slate-400"
                                  />
                                  <span className="font-mono font-bold w-16 text-right">
                                      {gameState.config.turnDuration === 0 ? 'Off' : `${gameState.config.turnDuration}s`}
                                  </span>
                              </div>
                          </div>
                      </div>
                      <div className="mt-4 text-xs text-white/40 italic">
                          * Board language will match your current language setting ({lang.toUpperCase()}).
                      </div>
                  </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mb-8">
                  {/* RED TEAM */}
                  <Card className="bg-red-950/40 border-red-500/30 flex flex-col gap-4 min-h-[400px] shadow-[0_0_50px_rgba(153,27,27,0.2)]">
                      <h2 className="text-4xl font-black text-red-500 text-center uppercase tracking-widest border-b border-red-500/30 pb-4 drop-shadow-lg">Red Team</h2>
                      
                      <div className="bg-black/40 p-6 rounded-2xl border border-red-500/20 text-center shadow-inner">
                          <div className="text-xs uppercase font-bold text-red-400 mb-2 tracking-widest">{t('codenames.spymaster')}</div>
                          {gameState.spymasters.RED ? (
                              <div className="flex items-center justify-center gap-3 animate-pop-in">
                                  <VenetianMask size={32} className="text-red-500"/>
                                  <span className="text-2xl font-black text-white">{gameState.players.find(p=>p.id===gameState.spymasters.RED)?.name}</span>
                                  {gameState.spymasters.RED === peerId && <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded ml-2">YOU</span>}
                              </div>
                          ) : (
                              <Button variant="glass" size="sm" onClick={() => becomeSpy('RED')} disabled={!gameState.teams.RED.includes(peerId)} className="border-red-500/30 hover:bg-red-500/20 text-red-200">
                                  Claim Role
                              </Button>
                          )}
                      </div>

                      <div className="flex-1">
                           <div className="text-xs uppercase font-bold text-red-400 mb-4 text-center tracking-widest">{t('codenames.operative')}s</div>
                           <div className="space-y-2">
                               {gameState.teams.RED.filter(id => id !== gameState.spymasters.RED).map(id => (
                                   <div key={id} className="bg-red-500/10 p-3 rounded-xl flex items-center gap-3 border border-red-500/10">
                                       <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold shadow-lg">
                                           {gameState.players.find(p=>p.id===id)?.name.charAt(0)}
                                       </div>
                                       <span className="font-bold text-lg">{gameState.players.find(p=>p.id===id)?.name}</span>
                                       {id === peerId && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded ml-auto">YOU</span>}
                                   </div>
                               ))}
                           </div>
                           {!gameState.teams.RED.includes(peerId) && (
                               <Button className="w-full mt-6 bg-red-800 hover:bg-red-700 border-red-950 shadow-xl" onClick={() => joinTeam('RED')}>Join Red</Button>
                           )}
                      </div>
                  </Card>

                  {/* BLUE TEAM */}
                  <Card className="bg-blue-950/40 border-blue-500/30 flex flex-col gap-4 min-h-[400px] shadow-[0_0_50px_rgba(30,58,138,0.2)]">
                      <h2 className="text-4xl font-black text-blue-500 text-center uppercase tracking-widest border-b border-blue-500/30 pb-4 drop-shadow-lg">Blue Team</h2>
                      
                      <div className="bg-black/40 p-6 rounded-2xl border border-blue-500/20 text-center shadow-inner">
                          <div className="text-xs uppercase font-bold text-blue-400 mb-2 tracking-widest">{t('codenames.spymaster')}</div>
                          {gameState.spymasters.BLUE ? (
                              <div className="flex items-center justify-center gap-3 animate-pop-in">
                                  <VenetianMask size={32} className="text-blue-500"/>
                                  <span className="text-2xl font-black text-white">{gameState.players.find(p=>p.id===gameState.spymasters.BLUE)?.name}</span>
                                  {gameState.spymasters.BLUE === peerId && <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded ml-2">YOU</span>}
                              </div>
                          ) : (
                              <Button variant="glass" size="sm" onClick={() => becomeSpy('BLUE')} disabled={!gameState.teams.BLUE.includes(peerId)} className="border-blue-500/30 hover:bg-blue-500/20 text-blue-200">
                                  Claim Role
                              </Button>
                          )}
                      </div>

                      <div className="flex-1">
                           <div className="text-xs uppercase font-bold text-blue-400 mb-4 text-center tracking-widest">{t('codenames.operative')}s</div>
                           <div className="space-y-2">
                               {gameState.teams.BLUE.filter(id => id !== gameState.spymasters.BLUE).map(id => (
                                   <div key={id} className="bg-blue-500/10 p-3 rounded-xl flex items-center gap-3 border border-blue-500/10">
                                       <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold shadow-lg">
                                           {gameState.players.find(p=>p.id===id)?.name.charAt(0)}
                                       </div>
                                       <span className="font-bold text-lg">{gameState.players.find(p=>p.id===id)?.name}</span>
                                       {id === peerId && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded ml-auto">YOU</span>}
                                   </div>
                               ))}
                           </div>
                           {!gameState.teams.BLUE.includes(peerId) && (
                               <Button className="w-full mt-6 bg-blue-800 hover:bg-blue-700 border-blue-950 shadow-xl" onClick={() => joinTeam('BLUE')}>Join Blue</Button>
                           )}
                      </div>
                  </Card>
              </div>

              {isHost && (
                  <div className="flex gap-4 mb-8">
                      <Button variant="secondary" onClick={randomizeTeams}><Shuffle className="mr-2"/> Randomize</Button>
                      <Button variant="success" size="lg" onClick={startGame} disabled={!gameState.spymasters.RED || !gameState.spymasters.BLUE} className="bg-emerald-600 border-emerald-800"><Play className="mr-2"/> Start Game</Button>
                  </div>
              )}
              
              <div className="w-full max-w-2xl bg-white/5 p-4 rounded-xl flex items-center gap-4">
                  <div className="text-xs font-bold opacity-50 uppercase shrink-0">Spectators</div>
                  <div className="flex gap-2 flex-wrap">
                      {gameState.players.filter(p => !gameState.teams.RED.includes(p.id) && !gameState.teams.BLUE.includes(p.id)).map(p => (
                          <Badge key={p.id} color="bg-white/10 text-white">{p.name}</Badge>
                      ))}
                      {gameState.players.filter(p => !gameState.teams.RED.includes(p.id) && !gameState.teams.BLUE.includes(p.id)).length === 0 && <span className="text-white/20 text-xs italic">None</span>}
                  </div>
              </div>

              <FriendSystemModal 
                  isOpen={showInviteModal} 
                  onClose={() => setShowInviteModal(false)} 
                  inviteMode={true} 
                  currentGameInfo={{ type: 'codenames', code: displayCode || joinGameCode }}
              />
          </div>
      );
  }

  // 3. PLAYING
  if (gameState.status === 'PLAYING' || gameState.status === 'GAME_OVER') {
      const myTeam = gameState.teams.RED.includes(peerId) ? 'RED' : gameState.teams.BLUE.includes(peerId) ? 'BLUE' : null;
      const isSpy = gameState.spymasters.RED === peerId || gameState.spymasters.BLUE === peerId;
      const isMyTurn = gameState.currentTurn === myTeam;
      const isCluePhase = gameState.turnPhase === 'CLUE';
      const timerPercent = gameState.config.turnDuration > 0 ? (timeLeft / gameState.config.turnDuration) * 100 : 100;
      
      return (
          <div className={`min-h-screen flex flex-col items-center p-2 md:p-6 w-full transition-colors duration-1000 ${gameState.currentTurn === 'RED' ? 'bg-[#250a0a]' : 'bg-[#0a1025]'}`}>
              
              {/* HEADER */}
              <div className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-black/40 p-4 rounded-3xl backdrop-blur-xl border border-white/5 shadow-2xl relative z-20">
                  <div className="flex items-center gap-8 w-full md:w-auto justify-center md:justify-start">
                      <div className={`flex flex-col items-center transition-all ${gameState.currentTurn === 'RED' ? 'scale-110' : 'opacity-60'}`}>
                          <div className="text-5xl font-black text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">{gameState.score.RED}</div>
                          <div className="text-[10px] font-bold text-red-300 tracking-widest uppercase">Red Agents</div>
                      </div>
                      
                      <div className="h-12 w-[1px] bg-white/10"></div>
                      
                      <div className={`flex flex-col items-center transition-all ${gameState.currentTurn === 'BLUE' ? 'scale-110' : 'opacity-60'}`}>
                          <div className="text-5xl font-black text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">{gameState.score.BLUE}</div>
                          <div className="text-[10px] font-bold text-blue-300 tracking-widest uppercase">Blue Agents</div>
                      </div>
                  </div>

                  <div className="flex-1 text-center px-4">
                      {gameState.status === 'GAME_OVER' ? (
                           <div className="animate-bounce font-black text-3xl md:text-5xl text-yellow-400 drop-shadow-lg uppercase">
                               {gameState.winner} WINS!
                           </div>
                      ) : (
                          <>
                             <div className={`inline-block px-6 py-2 rounded-xl font-black uppercase tracking-widest text-sm mb-2 shadow-lg ${gameState.currentTurn === 'RED' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                {gameState.currentTurn}'s Turn
                             </div>
                             {gameState.currentClue ? (
                                <div className="flex items-center justify-center gap-3 animate-slide-up">
                                    <span className="text-white/60 text-sm font-bold uppercase mr-2">Clue:</span>
                                    <span className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">"{gameState.currentClue.word}"</span>
                                    <span className="text-3xl md:text-4xl font-black text-yellow-400 bg-white/10 px-3 rounded-lg">{gameState.currentClue.number}</span>
                                </div>
                             ) : (
                                <div className="text-white/30 italic font-bold animate-pulse text-sm">Spymaster is thinking...</div>
                             )}
                          </>
                      )}
                  </div>

                  {gameState.config.turnDuration > 0 && gameState.status === 'PLAYING' && (
                      <div className="flex flex-col items-center w-24">
                          <div className="flex items-center gap-2 mb-1">
                              <Clock size={16} className={timeLeft < 10 ? 'text-red-500' : 'text-white'}/>
                              <span className={`font-mono font-bold ${timeLeft < 10 ? 'text-red-500' : 'text-white'}`}>{Math.ceil(timeLeft)}s</span>
                          </div>
                          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-300 ${timeLeft < 10 ? 'bg-red-500' : 'bg-green-500'}`} style={{width: `${timerPercent}%`}}/>
                          </div>
                      </div>
                  )}

                  <div className="hidden md:flex gap-2">
                     <Button variant="glass" size="sm" onClick={() => { if(confirm("Leave game?")) onExit(); }}>
                         <Home size={16}/>
                     </Button>
                  </div>
              </div>

              <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6 flex-1 h-full min-h-0">
                  
                  {/* GRID */}
                  <div className="flex-1 grid grid-cols-5 gap-2 md:gap-3 content-start pb-32 lg:pb-0">
                      {gameState.cards.map(card => {
                          const isRevealed = card.isRevealed;
                          const suggestions = gameState.suggestedCards[card.id] || [];
                          
                          // Spymaster "Underlay" Style
                          let spyBorder = "border-transparent";
                          if (isSpy && !isRevealed) {
                             if (card.type === 'RED') spyBorder = "border-red-500/50 bg-red-900/20";
                             else if (card.type === 'BLUE') spyBorder = "border-blue-500/50 bg-blue-900/20";
                             else if (card.type === 'ASSASSIN') spyBorder = "border-slate-500/50 bg-black/40";
                          }

                          // Revealed Card Style
                          let revealedBg = "";
                          let revealedIcon = null;
                          if (card.type === 'RED') {
                              revealedBg = "bg-gradient-to-br from-red-600 to-red-800";
                              revealedIcon = <VenetianMask className="text-red-950 opacity-50 w-full h-full p-2"/>;
                          } else if (card.type === 'BLUE') {
                              revealedBg = "bg-gradient-to-br from-blue-600 to-blue-800";
                              revealedIcon = <VenetianMask className="text-blue-950 opacity-50 w-full h-full p-2"/>;
                          } else if (card.type === 'ASSASSIN') {
                              revealedBg = "bg-gradient-to-br from-slate-800 to-black";
                              revealedIcon = <Skull className="text-gray-600 opacity-50 w-full h-full p-2"/>;
                          } else {
                              revealedBg = "bg-[#c2b59b]"; // Neutral
                          }

                          const canInteract = !isSpy && !isRevealed && isMyTurn && !isCluePhase && gameState.status === 'PLAYING';

                          return (
                              <div 
                                 key={card.id}
                                 className="relative aspect-[4/3] perspective-1000 group select-none"
                                 onClick={() => canInteract && toggleSuggest(card.id)}
                                 onDoubleClick={() => canInteract && revealCard(card.id)}
                              >
                                  <div className={`
                                      w-full h-full relative transform-style-3d transition-all duration-700
                                      ${isRevealed ? 'rotate-y-180' : ''}
                                      ${canInteract ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-default'}
                                  `}>
                                      {/* FRONT (WORD) */}
                                      <div className={`
                                          absolute inset-0 backface-hidden rounded-lg md:rounded-xl shadow-lg flex flex-col items-center justify-center p-1 md:p-2 bg-[#e8e1d5] border-b-4 border-[#c2b59b]
                                          ${spyBorder}
                                          ${isSpy && !isRevealed ? 'border-4' : ''}
                                          ${suggestions.length > 0 ? 'ring-4 ring-yellow-400 z-10' : ''}
                                      `}>
                                          <div className="w-full h-full border border-[#d1c7b1] rounded-md flex items-center justify-center relative">
                                              <span className={`font-black text-[10px] md:text-sm lg:text-lg uppercase text-slate-700 leading-tight text-center break-words px-1`}>
                                                  {card.word}
                                              </span>
                                              
                                              {/* Suggestions Overlay */}
                                              {suggestions.length > 0 && !isRevealed && (
                                                  <div className="absolute -top-3 -right-3 flex -space-x-2">
                                                      {suggestions.map(pid => (
                                                          <div key={pid} className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white flex items-center justify-center text-[8px] text-white font-bold" title={gameState.players.find(p=>p.id===pid)?.name}>
                                                              {gameState.players.find(p=>p.id===pid)?.name.charAt(0)}
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}
                                              
                                              {canInteract && suggestions.includes(peerId) && (
                                                  <div className="absolute bottom-1 text-[8px] text-slate-400 font-bold uppercase">Double Click to Reveal</div>
                                              )}
                                          </div>
                                          {isSpy && card.type === 'ASSASSIN' && !isRevealed && <Skull className="absolute top-1 right-1 text-black opacity-30" size={12}/>}
                                      </div>

                                      {/* BACK (REVEALED AGENT) */}
                                      <div className={`
                                          absolute inset-0 backface-hidden rotate-y-180 rounded-lg md:rounded-xl shadow-inner flex items-center justify-center border-4 border-black/20
                                          ${revealedBg}
                                      `}>
                                          {revealedIcon}
                                          {card.type === 'NEUTRAL' && <div className="text-[#a3967d] font-bold text-xs uppercase tracking-widest">Neutral</div>}
                                      </div>
                                  </div>
                              </div>
                          )
                      })}
                  </div>

                  {/* SIDEBAR (LOGS + CONTROLS) */}
                  <div className="w-full lg:w-80 flex flex-col gap-4 pb-20 lg:pb-0 h-[300px] lg:h-auto">
                      {/* LOG */}
                      <Card className="flex-1 bg-black/40 border-white/5 p-4 flex flex-col overflow-hidden min-h-[200px]">
                          <div className="flex items-center gap-2 text-white/40 uppercase text-xs font-bold mb-2 pb-2 border-b border-white/10">
                              <History size={14}/> Mission Log
                          </div>
                          <div className="flex-1 overflow-y-auto bubble-scrollbar space-y-2 pr-2 flex flex-col-reverse">
                              {gameState.gameLog.map((log, idx) => (
                                  <div key={idx} className="text-xs md:text-sm text-white/80 border-l-2 border-white/10 pl-2 py-1">
                                      {log}
                                  </div>
                              ))}
                          </div>
                      </Card>

                      {/* GAME OVER CONTROLS */}
                      {gameState.status === 'GAME_OVER' && isHost && (
                          <Button variant="primary" onClick={startGame} className="w-full">
                              <RotateCcw className="mr-2"/> New Game
                          </Button>
                      )}
                  </div>
              </div>

              {/* ACTION BAR (Fixed Bottom) */}
              <div className="fixed bottom-0 left-0 w-full p-4 md:p-6 pointer-events-none z-50">
                  <div className="max-w-2xl mx-auto pointer-events-auto">
                      {isSpy && isMyTurn && isCluePhase && (
                          <div className="flex gap-2 items-center p-3 animate-slide-up bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
                              <Input 
                                 placeholder="Type a Clue..." 
                                 value={clueWord} 
                                 onChange={e => setClueWord(e.target.value.trim())} 
                                 className="flex-1 text-lg py-3 bg-slate-800 border-slate-700"
                                 autoFocus
                              />
                              <select 
                                 className="bg-slate-800 text-white font-bold rounded-xl px-4 py-4 border-4 border-slate-700 focus:outline-none appearance-none text-center min-w-[60px]"
                                 value={clueNum}
                                 onChange={e => setClueNum(e.target.value)}
                              >
                                  <option value="0">0</option>
                                  {[1,2,3,4,5,6,7,8,9].map(n => <option key={n} value={n}>{n}</option>)}
                                  <option value="∞">∞</option>
                              </select>
                              <Button variant="success" onClick={submitClue} disabled={!clueWord} className="h-full py-4"><Send size={20}/></Button>
                          </div>
                      )}

                      {!isSpy && isMyTurn && !isCluePhase && (
                          <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-white/10 animate-slide-up shadow-2xl">
                               <div className="flex items-center gap-4">
                                   <div className="text-white/70 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                       <Fingerprint size={16}/> Tap to Suggest, Double Tap to Reveal
                                   </div>
                               </div>
                               <Button variant="danger" onClick={endTurn} size="sm">End Turn</Button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  }
  
  return null;
};

export default CodeNamesGame;
